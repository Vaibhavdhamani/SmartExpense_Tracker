import { useState, useEffect, useRef } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { useExpenses }   from '../../hooks/useExpenses';
import { parseBillText } from '../../services/billParser';
import api from '../../services/api';

const OCR_KEY = process.env.REACT_APP_OCR_SPACE_KEY || 'helloworld';

// ── OCR.space API ────────────────────────────────────────────────────────────
async function scanWithOCRSpace(file) {
  const formData = new FormData();
  formData.append('file', file, file.name || 'bill.jpg');
  formData.append('apikey',           OCR_KEY);
  formData.append('language',         'eng');
  formData.append('isOverlayRequired','false');
  formData.append('OCREngine',        '2');
  formData.append('scale',            'true');   // improves accuracy on photos
  formData.append('isTable',          'true');   // better for receipt table layout

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body:   formData,
  });

  if (!response.ok) throw new Error('OCR service error. Please try again.');

  const data = await response.json();

  if (data.IsErroredOnProcessing) {
    const msg = data.ErrorMessage?.[0] || 'OCR processing failed.';
    // File too large is the most common error
    if (msg.toLowerCase().includes('file size') || msg.toLowerCase().includes('too large')) {
      throw new Error('Image too large. Please use a smaller/compressed photo.');
    }
    throw new Error(msg);
  }

  return data.ParsedResults?.map(r => r.ParsedText).join('\n') || '';
}

// ── Compress image before sending (reduces file size for OCR) ───────────────
function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    const img    = new Image();
    const url    = URL.createObjectURL(file);

    img.onload = () => {
      // Scale down if wider than maxWidth
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width  = maxWidth;
      }
      canvas.width  = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) { resolve(file); return; }
          // Wrap blob in File so OCR.space gets a proper filename + type
          const compressedFile = new File([blob], 'bill.jpg', { type: 'image/jpeg' });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function QuickAddFAB() {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [mode,        setMode]        = useState(null);      // null | 'quick' | 'scan'
  const [showScanOpts,setShowScanOpts]= useState(false);     // camera vs gallery choice

  // Quick Add
  const [step,    setStep]    = useState(1);
  const [amount,  setAmount]  = useState('');
  const [catId,   setCatId]   = useState('');
  const [desc,    setDesc]    = useState('');
  const [descs,   setDescs]   = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);

  // Scan Bill
  const [scanState,   setScanState]   = useState('idle');
  const [scanError,   setScanError]   = useState('');
  const [previewUrl,  setPreviewUrl]  = useState(null);
  const [scannedData, setScannedData] = useState({
    amount: '', description: '', date: '', categoryId: ''
  });

  const { categories } = useCategories();
  const { addExpense }  = useExpenses(30);
  const amountRef     = useRef(null);
  const cameraRef     = useRef(null);   // capture="environment" — opens camera
  const galleryRef    = useRef(null);   // no capture — opens gallery/files

  useEffect(() => {
    if (mode === 'quick' && step === 1)
      setTimeout(() => amountRef.current?.focus(), 80);
  }, [mode, step]);

  useEffect(() => {
    if (!catId) return;
    api.get(`/categories/${catId}/descriptions`)
      .then(r => setDescs(r.data.data || []))
      .catch(() => setDescs([]));
  }, [catId]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const handleClose = () => {
    setMenuOpen(false); setMode(null); setShowScanOpts(false);
    setTimeout(() => {
      setStep(1); setAmount(''); setCatId(''); setDesc('');
      setDescs([]); setSaving(false); setSuccess(false);
      setScanState('idle'); setScanError(''); setPreviewUrl(null);
      setScannedData({ amount:'', description:'', date:'', categoryId:'' });
    }, 250);
  };

  const handleFabClick = () => {
    if (mode || menuOpen) { handleClose(); return; }
    setMenuOpen(true);
  };

  // ── Open scan with camera or gallery choice ──────────────────────────────
  const openScan = () => {
    setMenuOpen(false);
    setMode('scan');
    setShowScanOpts(true);   // show Camera / Gallery buttons inside panel
  };

  // ── Process the selected/captured image ─────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowScanOpts(false);
    setPreviewUrl(URL.createObjectURL(file));
    setScanState('scanning');
    setScanError('');

    try {
      // Compress before sending — camera photos can be 5-10MB
      const compressed = await compressImage(file);

      const rawText = await scanWithOCRSpace(compressed);

      if (!rawText.trim()) {
        setScanState('error');
        setScanError('No text detected. Try a clearer, well-lit photo with the bill flat.');
        return;
      }

      const parsed = parseBillText(rawText);

      if (!parsed.success) {
        setScanState('error');
        setScanError(parsed.error);
        return;
      }

      const matchedCat =
        categories.find(c => c.name.toLowerCase() === parsed.category.toLowerCase())
        || categories.find(c => c.name === 'Others');

      setScannedData({
        amount:      parsed.amount?.toString() || '',
        description: parsed.description || '',
        date:        parsed.date || new Date().toISOString().split('T')[0],
        categoryId:  matchedCat?._id || '',
      });

      setScanState('review');

    } catch (err) {
      setScanState('error');
      setScanError(err.message || 'Scan failed. Please try again.');
    }

    e.target.value = '';
  };

  const handleScanSave = async () => {
    const { amount, description, categoryId, date } = scannedData;
    if (!amount || !categoryId) return;
    setScanState('saving');
    try {
      await addExpense({
        category:    categoryId,
        amount:      parseFloat(amount),
        description: description || 'Bill expense',
        date:        new Date(date).toISOString(),
        notes:       'Added via bill scan'
      });
      setScanState('success');
      setTimeout(() => handleClose(), 1400);
    } catch {
      setScanState('error');
      setScanError('Failed to save. Please try again.');
    }
  };

  // Quick Add handlers
  const handleAmountNext = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setStep(2);
  };
  const handleCatSelect = (id) => { setCatId(id); setDesc(''); setStep(3); };
  const handleQuickSave = async () => {
    if (!catId || !desc || !amount) return;
    setSaving(true);
    try {
      await addExpense({
        category: catId, amount: parseFloat(amount),
        description: desc, date: new Date().toISOString(), notes: ''
      });
      setSuccess(true);
      setTimeout(() => handleClose(), 1400);
    } catch { setSaving(false); }
  };

  const selectedCat = categories.find(c => c._id === catId);
  const isOpen      = menuOpen || mode !== null;

  return (
    <>
      {/* Two hidden inputs — one for camera, one for gallery */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment"
        style={{ display:'none' }} onChange={handleFileChange} />
      <input ref={galleryRef} type="file" accept="image/*"
        style={{ display:'none' }} onChange={handleFileChange} />

      {isOpen && <div className="ef-fab-backdrop" onClick={handleClose} />}

      {/* ── Main menu ── */}
      {menuOpen && !mode && (
        <div className="ef-fab-menu">
          <button className="ef-fab-menu-btn"
            onClick={() => { setMenuOpen(false); setMode('quick'); }}>
            <span className="ef-fab-menu-btn__icon">⚡</span>
            <div>
              <div className="ef-fab-menu-btn__title">Quick Add</div>
              <div className="ef-fab-menu-btn__sub">Manually enter expense</div>
            </div>
            <i className="bi bi-chevron-right ms-auto" />
          </button>
          <div className="ef-fab-menu-divider" />
          <button className="ef-fab-menu-btn" onClick={openScan}>
            <span className="ef-fab-menu-btn__icon">📷</span>
            <div>
              <div className="ef-fab-menu-btn__title">Scan Bill</div>
              <div className="ef-fab-menu-btn__sub">Camera or gallery</div>
            </div>
            <i className="bi bi-chevron-right ms-auto" />
          </button>
        </div>
      )}

      {/* ── Quick Add Panel ── */}
      {mode === 'quick' && (
        <div className="ef-fab-panel ef-fab-panel--open">
          <div className="ef-fab-panel__header">
            <div className="d-flex align-items-center gap-2">
              <span className="ef-fab-panel__icon">⚡</span>
              <div>
                <div className="ef-fab-panel__title">Quick Add Expense</div>
                <div className="ef-fab-panel__sub">
                  {step===1 && 'How much did you spend?'}
                  {step===2 && 'What category?'}
                  {step===3 && `${selectedCat?.icon} ${selectedCat?.name} · ₹${amount}`}
                </div>
              </div>
            </div>
            <button className="btn-close btn-close-white" onClick={handleClose} />
          </div>
          <div className="ef-fab-panel__body">
            {success && (
              <div className="ef-fab-success">
                <div className="ef-fab-success__icon">✅</div>
                <div className="ef-fab-success__text">Expense Added!</div>
                <div className="ef-fab-success__amt">₹{parseFloat(amount).toFixed(2)}</div>
              </div>
            )}
            {!success && step===1 && (
              <form onSubmit={handleAmountNext} className="ef-fab-step">
                <div className="ef-fab-amount-wrap">
                  <span className="ef-fab-rupee">₹</span>
                  <input ref={amountRef} type="number" className="ef-fab-amount-input"
                    placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}
                    min="0" step="0.01" inputMode="decimal" />
                </div>
                <div className="ef-fab-chips">
                  {[50,100,200,500,1000].map(n=>(
                    <button type="button" key={n}
                      className={`ef-fab-chip ${amount==n?'ef-fab-chip--active':''}`}
                      onClick={()=>setAmount(String(n))}>₹{n}</button>
                  ))}
                </div>
                <button type="submit" className="btn ef-btn-primary w-100 mt-3"
                  disabled={!amount||parseFloat(amount)<=0}>
                  Next — Choose Category <i className="bi bi-arrow-right ms-2"/>
                </button>
              </form>
            )}
            {!success && step===2 && (
              <div className="ef-fab-step">
                <button className="ef-fab-back" onClick={()=>setStep(1)}>
                  <i className="bi bi-arrow-left me-1"/>₹{amount}
                </button>
                <div className="ef-fab-cat-grid">
                  {categories.map(cat=>(
                    <button key={cat._id} type="button" className="ef-fab-cat-btn"
                      style={{'--cat-color':cat.color}} onClick={()=>handleCatSelect(cat._id)}>
                      <span className="ef-fab-cat-icon">{cat.icon}</span>
                      <span className="ef-fab-cat-name">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!success && step===3 && (
              <div className="ef-fab-step">
                <button className="ef-fab-back" onClick={()=>setStep(2)}>
                  <i className="bi bi-arrow-left me-1"/>{selectedCat?.icon} {selectedCat?.name}
                </button>
                <div className="ef-fab-desc-grid">
                  {descs.map(d=>(
                    <button key={d} type="button"
                      className={`ef-fab-desc-btn ${desc===d?'ef-fab-desc-btn--active':''}`}
                      onClick={()=>setDesc(d)}>{d}</button>
                  ))}
                </div>
                <input type="text" className="form-control mt-2"
                  placeholder="Or type custom description…"
                  value={descs.includes(desc)?'':desc} onChange={e=>setDesc(e.target.value)}/>
                {desc && (
                  <div className="ef-fab-preview">
                    <span style={{color:selectedCat?.color}}>{selectedCat?.icon} {selectedCat?.name}</span>
                    <span>·</span><span>{desc}</span>
                    <span className="ms-auto fw-bold">₹{parseFloat(amount).toFixed(2)}</span>
                  </div>
                )}
                <button className="btn ef-btn-primary w-100 mt-3"
                  onClick={handleQuickSave} disabled={!desc||saving}>
                  {saving?<><span className="spinner-border spinner-border-sm me-2"/>Saving…</>
                        :<><i className="bi bi-check-lg me-2"/>Add Expense</>}
                </button>
              </div>
            )}
          </div>
          {!success && (
            <div className="ef-fab-panel__dots">
              {[1,2,3].map(s=>(
                <span key={s} className={`ef-fab-dot
                  ${step===s?'ef-fab-dot--active':step>s?'ef-fab-dot--done':''}`}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Scan Bill Panel ── */}
      {mode === 'scan' && (
        <div className="ef-fab-panel ef-fab-panel--open">
          <div className="ef-fab-panel__header">
            <div className="d-flex align-items-center gap-2">
              <span className="ef-fab-panel__icon">📷</span>
              <div>
                <div className="ef-fab-panel__title">Scan Bill</div>
                <div className="ef-fab-panel__sub">
                  {showScanOpts              && 'Choose how to add photo'}
                  {scanState==='scanning'    && 'Reading your bill...'}
                  {scanState==='review'      && 'Review and confirm details'}
                  {scanState==='saving'      && 'Saving expense...'}
                  {scanState==='success'     && 'Expense saved!'}
                  {scanState==='error'       && 'Something went wrong'}
                </div>
              </div>
            </div>
            <button className="btn-close btn-close-white" onClick={handleClose}/>
          </div>

          <div className="ef-fab-panel__body">

            {/* ── Camera or Gallery choice ── */}
            {showScanOpts && (
              <div className="ef-scan-source">
                <p className="text-muted small text-center mb-3">
                  How do you want to add the bill photo?
                </p>

                {/* Camera button */}
                <button className="ef-scan-source-btn"
                  onClick={() => cameraRef.current?.click()}>
                  <div className="ef-scan-source-btn__icon">📸</div>
                  <div>
                    <div className="ef-scan-source-btn__title">Take Photo</div>
                    <div className="ef-scan-source-btn__sub">Open camera directly</div>
                  </div>
                  <i className="bi bi-chevron-right ms-auto"/>
                </button>

                <div className="ef-fab-menu-divider my-2"/>

                {/* Gallery button */}
                <button className="ef-scan-source-btn"
                  onClick={() => galleryRef.current?.click()}>
                  <div className="ef-scan-source-btn__icon">🖼️</div>
                  <div>
                    <div className="ef-scan-source-btn__title">Choose from Gallery</div>
                    <div className="ef-scan-source-btn__sub">Pick existing photo</div>
                  </div>
                  <i className="bi bi-chevron-right ms-auto"/>
                </button>

                <p className="text-muted mt-3 mb-0" style={{fontSize:11,textAlign:'center'}}>
                  Tip: Keep bill flat, use good lighting for best results
                </p>
              </div>
            )}

            {/* Scanning */}
            {scanState==='scanning' && (
              <div className="ef-scan-loading">
                {previewUrl && <img src={previewUrl} alt="Bill" className="ef-scan-preview-img"/>}
                <div className="ef-scan-loading__spinner"><div className="ef-spinner"/></div>
                <div className="ef-scan-loading__text">Scanning with OCR.space...</div>
                <div className="ef-scan-loading__sub">Usually takes 3–5 seconds</div>
              </div>
            )}

            {/* Error */}
            {scanState==='error' && (
              <div className="ef-scan-error">
                <div className="ef-scan-error__icon">❌</div>
                <div className="ef-scan-error__text">{scanError}</div>
                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-outline-secondary btn-sm flex-grow-1"
                    onClick={()=>{setScanState('idle');setPreviewUrl(null);setShowScanOpts(true);}}>
                    <i className="bi bi-arrow-left me-1"/>Try Again
                  </button>
                  <button className="btn ef-btn-primary btn-sm flex-grow-1"
                    onClick={()=>{setMode('quick');setScanState('idle');}}>
                    <i className="bi bi-pencil me-1"/>Enter Manually
                  </button>
                </div>
              </div>
            )}

            {/* Review */}
            {scanState==='review' && (
              <div className="ef-scan-review">
                {previewUrl && (
                  <div className="ef-scan-thumb-wrap">
                    <img src={previewUrl} alt="Bill" className="ef-scan-thumb"/>
                    <span className="ef-scan-thumb__badge">
                      <i className="bi bi-check-circle-fill text-success me-1"/>Scanned
                    </span>
                  </div>
                )}
                <div className="ef-scan-notice">
                  <i className="bi bi-pencil-square me-2 text-primary"/>
                  Review below. Edit anything that looks wrong.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Amount (₹) <span className="ef-scan-auto-badge">auto</span></label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input type="number" className="form-control" step="0.01" min="0"
                      value={scannedData.amount}
                      onChange={e=>setScannedData(p=>({...p,amount:e.target.value}))}/>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Merchant <span className="ef-scan-auto-badge">auto</span></label>
                  <input type="text" className="form-control" value={scannedData.description}
                    onChange={e=>setScannedData(p=>({...p,description:e.target.value}))}/>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Category <span className="ef-scan-auto-badge">auto</span></label>
                  <select className="form-select" value={scannedData.categoryId}
                    onChange={e=>setScannedData(p=>({...p,categoryId:e.target.value}))}>
                    {categories.map(c=>(
                      <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Date <span className="ef-scan-auto-badge">auto</span></label>
                  <input type="date" className="form-control" value={scannedData.date}
                    onChange={e=>setScannedData(p=>({...p,date:e.target.value}))}/>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-grow-1"
                    onClick={()=>{setScanState('idle');setPreviewUrl(null);setShowScanOpts(true);}}>
                    <i className="bi bi-arrow-left me-1"/>Rescan
                  </button>
                  <button className="btn ef-btn-primary flex-grow-1"
                    onClick={handleScanSave}
                    disabled={!scannedData.amount||!scannedData.categoryId}>
                    <i className="bi bi-check-lg me-2"/>Confirm & Save
                  </button>
                </div>
              </div>
            )}

            {/* Saving */}
            {scanState==='saving' && (
              <div className="ef-scan-loading">
                <div className="ef-scan-loading__spinner"><div className="ef-spinner"/></div>
                <div className="ef-scan-loading__text">Saving expense...</div>
              </div>
            )}

            {/* Success */}
            {scanState==='success' && (
              <div className="ef-fab-success">
                <div className="ef-fab-success__icon">✅</div>
                <div className="ef-fab-success__text">Expense Saved!</div>
                <div className="ef-fab-success__amt">
                  ₹{parseFloat(scannedData.amount||0).toFixed(2)}
                </div>
                <div className="text-muted small mt-1">{scannedData.description}</div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── FAB Button ── */}
      <button className={`ef-fab ${isOpen?'ef-fab--open':''}`}
        onClick={handleFabClick} title="Add Expense">
        <i className={`bi ${isOpen?'bi-x-lg':'bi-plus-lg'}`}/>
      </button>
    </>
  );
}