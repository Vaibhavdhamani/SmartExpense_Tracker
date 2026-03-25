/**
 * billParser.js
 * Parses raw OCR text into expense fields.
 * Handles Indian bill formats — GST, CGST, SGST, Rs., ₹ etc.
 */

const CATEGORY_KEYWORDS = {
  'Food & Dining': [
    'restaurant','cafe','coffee','pizza','burger','swiggy','zomato','dominos',
    'mcdonalds','kfc','subway','hotel','dhaba','biryani','food','dining',
    'kitchen','bakery','sweet','juice','chai','tea','dine','eat','meals',
    'canteen','mess','tiffin','snacks','spice','garden','grill','tandoor',
    'curry','masala','lassi','udupi','idli','dosa','thali'
  ],
  'Groceries': [
    'grocery','supermarket','dmart','reliance fresh','big bazaar','more store',
    'spencer','nature basket','vegetables','fruits','milk','bread','rice',
    'flour','dal','oil','provisions','kirana','departmental'
  ],
  'Transportation': [
    'petrol','diesel','fuel','gas station','hp','iocl','bpcl','indian oil',
    'uber','ola','auto','taxi','cab','parking','toll','bus','metro',
    'rapido','irctc','train','airways','indigo','air india'
  ],
  'Shopping': [
    'amazon','flipkart','myntra','ajio','nykaa','mall','store','shop',
    'boutique','fashion','clothing','wear','electronics','mobile','laptop',
    'appliance','furniture','retail'
  ],
  'Healthcare': [
    'pharmacy','medical','hospital','clinic','doctor','medicine','apollo',
    'medplus','netmeds','diagnostic','lab','pathology','health','dental',
    'eye','chemist','drug store','dispensary'
  ],
  'Bills & Utilities': [
    'electricity','bescom','mseb','tata power','water','gas','internet',
    'broadband','airtel','jio','vodafone','bsnl','mobile bill','recharge',
    'insurance','lic','utility','telecom'
  ],
  'Entertainment': [
    'cinema','pvr','inox','movie','theatre','netflix','hotstar','spotify',
    'concert','event','game','sport','bowling','amusement','club','pub',
    'bar','lounge'
  ],
  'Education': [
    'school','college','university','tuition','coaching','academy','course',
    'book','stationery','notebook','library','fees','institute'
  ],
  'Travel': [
    'resort','oyo','makemytrip','goibibo','yatra','flight','airport',
    'boarding','lodge','inn','stay','vacation','holiday'
  ],
  'Personal Care': [
    'salon','spa','parlour','beauty','haircut','gym','fitness','yoga',
    'cosmetics','skincare','grooming','wellness','unisex'
  ],
};

export function parseAmount(text) {
  const priorityPatterns = [
    /(?:grand\s*total|total\s*amount|net\s*payable|amount\s*payable|total\s*due|bill\s*total|net\s*total|payable\s*amount)[^\d]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:^|\n)\s*total[^\d\n]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/im,
  ];

  for (const pattern of priorityPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (amount > 0 && amount < 1000000) return amount;
    }
  }

  // Collect all Rs./₹ amounts and return the largest
  const amounts = [];
  const rsPattern = /(?:rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi;
  let m;
  while ((m = rsPattern.exec(text)) !== null) {
    const val = parseFloat(m[1].replace(/,/g, ''));
    if (val >= 1 && val < 1000000) amounts.push(val);
  }

  // Also grab standalone numbers as fallback
  const numPattern = /\b(\d{2,6}(?:\.\d{1,2})?)\b/g;
  while ((m = numPattern.exec(text)) !== null) {
    const val = parseFloat(m[1]);
    if (val >= 10 && val < 100000) amounts.push(val);
  }

  return amounts.length > 0 ? Math.max(...amounts) : null;
}

export function parseDate(text) {
  const patterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/,
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let day, month, year;
        if (pattern.source.includes('jan|feb')) {
          const mn = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
          day = parseInt(match[1]); month = mn[match[2].toLowerCase().slice(0,3)]; year = parseInt(match[3]);
        } else if (match[1].length === 4) {
          year = parseInt(match[1]); month = parseInt(match[2]); day = parseInt(match[3]);
        } else {
          day = parseInt(match[1]); month = parseInt(match[2]); year = parseInt(match[3]);
          if (year < 100) year += 2000;
        }
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime()) && year >= 2000 && year <= 2035)
          return d.toISOString().split('T')[0];
      } catch { continue; }
    }
  }
  return new Date().toISOString().split('T')[0];
}

export function parseMerchant(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 3 && l.length <= 60);
  const skip = [
    /^\d+$/, /\d{10}/, /gst|cgst|sgst|igst/i, /total|amount|payable|due|balance/i,
    /thank\s*you/i, /invoice|bill\s*no|order\s*no|receipt/i, /^[\d\s\.\,\-\/\+\:]+$/,
    /table|cover|cashier|waiter/i, /www\.|\.com|\.in/i, /ph:|phone|mobile|tel/i,
    /date|time|gstin/i,
  ];
  for (const line of lines) {
    if (!skip.some(p => p.test(line)))
      return line.replace(/[^\w\s\-\&\.]/g, '').trim().slice(0, 40);
  }
  return 'Unknown Merchant';
}

export function detectCategory(text, merchant) {
  const s = (text + ' ' + merchant).toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS))
    for (const kw of kws)
      if (s.includes(kw)) return cat;
  return 'Others';
}

export function parseBillText(rawText) {
  if (!rawText?.trim())
    return { success: false, error: 'No text found. Please try a clearer photo.' };

  const amount   = parseAmount(rawText);
  const date     = parseDate(rawText);
  const merchant = parseMerchant(rawText);
  const category = detectCategory(rawText, merchant);

  if (!amount)
    return { success: false, error: 'Could not find total amount. Please enter manually.' };

  return { success: true, amount, description: merchant, date, category, rawText };
}