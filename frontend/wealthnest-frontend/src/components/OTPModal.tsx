import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

type Props = {
  open: boolean;
  title?: string;
  hint?: string;
  onClose: () => void;
  onConfirm: (code: string) => Promise<void> | void;
};

export default function OTPModal({ open, title = 'Enter OTP', hint, onClose, onConfirm }: Props) {
  const [code, setCode] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setCode('');
      setErr(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const confirm = async () => {
    if (!code || code.length < 4) return;
    setBusy(true);
    try {
      await onConfirm(code);
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Failed to verify');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-3">
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
        {err && <div className="text-xs text-rose-600">{err}</div>}
        <label className="block text-sm text-slate-700">
          6-digit code
          <input
            ref={inputRef}
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm tracking-widest text-center focus:ring-2 focus:ring-teal-500"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium border border-slate-200 hover:shadow">Cancel</button>
          <button disabled={busy || code.length !== 6} onClick={confirm} className="rounded-lg px-3 py-2 text-sm font-medium bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50">
            {busy ? 'Verifying…' : 'Confirm'}
          </button>
        </div>
        <div className="text-xs text-slate-500">Simulation mode — no real money</div>
      </div>
    </Modal>
  );
}
