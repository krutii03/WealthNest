export default function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 ${className}`} aria-busy aria-live="polite">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="h-4 w-full bg-slate-100 rounded" />
        <div className="h-4 w-5/6 bg-slate-100 rounded" />
        <div className="h-4 w-2/3 bg-slate-100 rounded" />
      </div>
    </div>
  );
}
