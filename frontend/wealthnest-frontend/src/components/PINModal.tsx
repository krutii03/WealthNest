import { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  title?: string;
  hint?: string;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<void> | void;
  mode?: 'verify' | 'set' | 'change';
};

export default function PINModal({ 
  open, 
  title = 'Enter PIN', 
  hint, 
  onClose, 
  onConfirm,
  mode = 'verify'
}: Props) {
  const [pin, setPin] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setPin('');
      setErr(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const confirm = async () => {
    if (!pin || pin.length !== 4) {
      setErr('PIN must be 4 digits');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onConfirm(pin);
      if (mode === 'set' || mode === 'change') {
        onClose();
      }
    } catch (e: any) {
      setErr(e?.message || 'Invalid PIN');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog" 
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          {hint && <p className="text-sm text-slate-600 mt-1">{hint}</p>}
        </div>
        
        <div className="px-6 py-5 space-y-4">
          {err && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-700">{err}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {mode === 'set' ? 'Set 4-digit PIN' : mode === 'change' ? 'New 4-digit PIN' : 'Enter 4-digit PIN'}
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(value);
                setErr(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pin.length === 4) {
                  confirm();
                }
              }}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
            />
            <p className="text-xs text-slate-500 mt-2">
              {mode === 'set' ? 'Create a 4-digit PIN for transaction security' : 
               mode === 'change' ? 'Enter a new 4-digit PIN' :
               'Enter your PIN to confirm this transaction'}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          {mode !== 'set' && (
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button 
            disabled={busy || pin.length !== 4} 
            onClick={confirm} 
            className={`${mode === 'set' ? 'w-full' : 'flex-1'} px-4 py-2.5 rounded-lg font-medium bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            {busy ? 'Verifying…' : mode === 'set' ? 'Set PIN' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

