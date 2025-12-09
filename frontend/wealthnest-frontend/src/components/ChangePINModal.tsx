import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string, partialPhone: string, newPin: string) => Promise<void> | void;
};

export default function ChangePINModal({ open, onClose, onConfirm }: Props) {
  const [password, setPassword] = useState('');
  const [partialPhone, setPartialPhone] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleConfirm = async () => {
    setErr(null);
    
    // Validation
    if (!password) {
      setErr('Password is required');
      return;
    }
    if (!partialPhone || partialPhone.length < 4) {
      setErr('Please enter at least last 4 digits of your phone number');
      return;
    }
    if (newPin.length !== 4) {
      setErr('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setErr('PINs do not match');
      return;
    }

    setBusy(true);
    try {
      await onConfirm(password, partialPhone, newPin);
      // Reset form on success
      setPassword('');
      setPartialPhone('');
      setNewPin('');
      setConfirmPin('');
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Failed to change PIN');
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
          <h3 className="text-xl font-semibold text-slate-900">Change PIN</h3>
          <p className="text-sm text-slate-600 mt-1">Verify your identity to change your PIN</p>
        </div>
        
        <div className="px-6 py-5 space-y-4">
          {err && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-700">{err}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErr(null);
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Last 4 digits of Phone Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={partialPhone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPartialPhone(value);
                setErr(null);
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="1234"
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setNewPin(value);
                setErr(null);
              }}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center text-xl tracking-widest font-mono"
              placeholder="••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirm New PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setConfirmPin(value);
                setErr(null);
              }}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center text-xl tracking-widest font-mono"
              placeholder="••••"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            disabled={busy || !password || partialPhone.length < 4 || newPin.length !== 4 || newPin !== confirmPin} 
            onClick={handleConfirm} 
            className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? 'Changing…' : 'Change PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}

