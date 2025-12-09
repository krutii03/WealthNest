import { useState } from 'react';
import { calcSipFutureValue } from '../../utils/calculators';
import CsvExport from '../CsvExport';

export default function SIPCalculator() {
  const [monthly, setMonthly] = useState(10000);
  const [annual, setAnnual] = useState(12);
  const [years, setYears] = useState(10);
  const res = calcSipFutureValue(monthly, annual, years);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
          <span className="text-2xl">📊</span>
        </div>
        <h3 className="text-2xl font-bold text-slate-900">SIP Calculator</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Monthly Amount (₹)</label>
          <input
            type="number"
            value={monthly}
            onChange={e => setMonthly(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Annual Return (%)</label>
          <input
            type="number"
            value={annual}
            onChange={e => setAnnual(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Investment Years</label>
          <input
            type="number"
            value={years}
            onChange={e => setYears(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 mb-6 space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-emerald-200">
          <span className="text-slate-700 font-medium">Final Corpus</span>
          <strong className="text-2xl text-emerald-700">₹{res.corpus.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-emerald-200">
          <span className="text-slate-700 font-medium">Total Invested</span>
          <strong className="text-xl text-slate-800">₹{res.investedTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-slate-700 font-medium">Total Gains</span>
          <strong className="text-xl text-emerald-600">₹{res.gains.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
        </div>
      </div>
      
      <div className="mt-6">
      <CsvExport filename="sip_schedule.csv" rows={res.schedule.map(s => ({ month: s.month, invested: s.invested.toFixed(2), value: s.value.toFixed(2), gain: s.gain.toFixed(2) }))} />
      </div>
    </div>
  );
}
