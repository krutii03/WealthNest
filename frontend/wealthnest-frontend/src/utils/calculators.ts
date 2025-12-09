/**
 * Pure calculator utilities for WealthNest.
 * These functions are deterministic and unit-test friendly.
 */

export interface SipScheduleItem { month: number; invested: number; value: number; gain: number; }

/**
 * SIP Future Value calculation with monthly compounding.
 * @param monthly monthly investment amount
 * @param annualReturnPct expected annual return in percent (e.g., 12 for 12%)
 * @param years tenure in years
 */
export function calcSipFutureValue(monthly: number, annualReturnPct: number, years: number) {
  const months = Math.max(0, Math.floor(years * 12));
  const r = Math.max(0, annualReturnPct) / 100 / 12; // monthly rate
  let fv = 0;
  const schedule: SipScheduleItem[] = [];
  for (let m = 1; m <= months; m++) {
    fv = (fv + monthly) * (1 + r);
    const invested = monthly * m;
    schedule.push({ month: m, invested, value: fv, gain: fv - invested });
  }
  const investedTotal = monthly * months;
  const gains = fv - investedTotal;
  return { corpus: fv, investedTotal, gains, schedule };
}

/** Lumpsum future value with monthly compounding approximation. */
export function calcLumpsumFutureValue(principal: number, annualReturnPct: number, years: number) {
  const months = Math.max(0, Math.floor(years * 12));
  const r = Math.max(0, annualReturnPct) / 100 / 12;
  const fv = principal * Math.pow(1 + r, months);
  const gains = fv - principal;
  return { futureValue: fv, invested: principal, gains };
}

/**
 * SIP Goal: compute required monthly SIP to reach target corpus.
 * Using future value of annuity formula.
 */
export function calcSipRequiredMonthly(targetCorpus: number, annualReturnPct: number, years: number) {
  const months = Math.max(1, Math.floor(years * 12));
  const r = Math.max(0, annualReturnPct) / 100 / 12;
  const numerator = targetCorpus * r;
  const denominator = Math.pow(1 + r, months) - 1;
  const monthly = denominator === 0 ? targetCorpus / months : numerator / denominator;
  return { requiredMonthly: monthly };
}

/**
 * calculateSIP(monthly, annualReturnPercent, years)
 * Returns final corpus, total invested, total gain, and schedule array (month-by-month).
 */
export function calculateSIP(monthly: number, annualReturnPercent: number, years: number) {
  return calcSipFutureValue(monthly, annualReturnPercent, years);
}

/**
 * calculateLumpsum(principal, annualReturnPercent, years)
 * Returns future value, invested, gains.
 */
export function calculateLumpsum(principal: number, annualReturnPercent: number, years: number) {
  return calcLumpsumFutureValue(principal, annualReturnPercent, years);
}

/**
 * calculateSIPForGoal(target, annualReturnPercent, years)
 * Returns requiredMonthly to reach the target corpus.
 */
export function calculateSIPForGoal(target: number, annualReturnPercent: number, years: number) {
  return calcSipRequiredMonthly(target, annualReturnPercent, years);
}
