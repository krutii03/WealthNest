import { Link } from 'react-router-dom';
import SIPCalculator from '../components/CalculatorComponents/SIPCalculator';
import LumpsumCalculator from '../components/CalculatorComponents/LumpsumCalculator';
import GoalCalculator from '../components/CalculatorComponents/GoalCalculator';

export default function CalculatorsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
        
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Investment Calculators</h1>
          <p className="mt-2 text-lg text-slate-600">Plan your investments with precision using our financial calculators</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <main className="lg:col-span-2 space-y-6">
            <SIPCalculator />
            <LumpsumCalculator />
            <GoalCalculator />
          </main>
          <aside className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 max-w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="text-2xl">💡</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Tips</h3>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <p>These are estimations. Actual returns vary based on market conditions and fund performance.</p>
                  <div className="pt-3 border-t border-slate-200">
                    <p className="font-medium text-slate-900 mb-1">Did you know?</p>
                    <p>SIP investments help you benefit from rupee cost averaging, reducing the impact of market volatility.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
