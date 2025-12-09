import type { ReactNode } from 'react';
import { useEffect } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ open, title, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 sm:h-8 sm:w-8 grid place-items-center rounded-lg sm:rounded-md hover:bg-slate-100 active:bg-slate-200 touch-manipulation flex-shrink-0 ml-2">
            <svg className="h-5 w-5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor"><path d="M5 5l10 10M15 5L5 15" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
