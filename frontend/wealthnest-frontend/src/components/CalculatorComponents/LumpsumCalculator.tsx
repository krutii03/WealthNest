import { useState } from 'react';
import { calcLumpsumFutureValue } from '../../utils/calculators';

export default function LumpsumCalculator() {
  const [principal, setPrincipal] = useState(100000);
  const [annual, setAnnual] = useState(12);
  const [years, setYears] = useState(5);
  const res = calcLumpsumFutureValue(principal, annual, years);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="text-2xl">💰</span>
        </div>
        <h3 className="text-2xl font-bold text-slate-900">Lumpsum Calculator</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Principal Amount (₹)</label>
          <input
            type="number"
            value={principal}
            onChange={e => setPrincipal(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Annual Return (%)</label>
          <input
            type="number"
            value={annual}
            onChange={e => setAnnual(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Investment Years</label>
          <input
            type="number"
            value={years}
            onChange={e => setYears(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-indigo-200">
          <span className="text-slate-700 font-medium">Future Value</span>
          <strong className="text-2xl text-indigo-700">₹{res.futureValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-indigo-200">
          <span className="text-slate-700 font-medium">Invested</span>
          <strong className="text-xl text-slate-800">₹{res.invested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-slate-700 font-medium">Gains</span>
          <strong className="text-xl text-indigo-600">₹{res.gains.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
        </div>
      </div>
    </div>
  );
}
