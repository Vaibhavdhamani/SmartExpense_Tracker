import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const ICONS  = { success:'bi-check-circle-fill', error:'bi-x-circle-fill', warning:'bi-exclamation-triangle-fill', info:'bi-info-circle-fill' };
const LABELS = { success:'Success', error:'Error', warning:'Warning', info:'Info' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="ef-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`ef-toast ef-toast--${t.type}`} role="alert">
            <div className={`ef-toast__icon ef-toast__icon--${t.type}`}>
              <i className={`bi ${ICONS[t.type] || ICONS.info}`} />
            </div>
            <div className="ef-toast__body">
              <div className="ef-toast__label">{LABELS[t.type] || 'Info'}</div>
              <div className="ef-toast__msg">{t.message}</div>
            </div>
            <button className="ef-toast__close" onClick={() => remove(t.id)}>
              <i className="bi bi-x-lg" />
            </button>
            <div className={`ef-toast__bar ef-toast__bar--${t.type}`} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);