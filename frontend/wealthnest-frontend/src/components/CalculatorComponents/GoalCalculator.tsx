import { useState } from 'react';
import { calcSipRequiredMonthly } from '../../utils/calculators';

export default function GoalCalculator() {
  const [target, setTarget] = useState(1000000);
  const [annual, setAnnual] = useState(12);
  const [years, setYears] = useState(10);
  const res = calcSipRequiredMonthly(target, annual, years);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <span className="text-2xl">🎯</span>
        </div>
        <h3 className="text-2xl font-bold text-slate-900">SIP Goal Calculator</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Target Corpus (₹)</label>
          <input
            type="number"
            value={target}
            onChange={e => setTarget(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Annual Return (%)</label>
          <input
            type="number"
            value={annual}
            onChange={e => setAnnual(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Investment Years</label>
          <input
            type="number"
            value={years}
            onChange={e => setYears(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <span className="text-slate-700 font-medium text-lg">Required Monthly SIP</span>
          <strong className="text-3xl text-amber-700">₹{res.requiredMonthly.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
        </div>
      </div>
    </div>
  );
}
