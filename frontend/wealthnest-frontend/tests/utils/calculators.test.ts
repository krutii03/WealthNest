import { describe, it, expect } from 'vitest';
import { calculateSIP, calculateLumpsum, calculateSIPForGoal } from '../../src/utils/calculators';

describe('calculators', () => {
  it('SIP should accumulate over time', () => {
    const { corpus, investedTotal, gains, schedule } = calculateSIP(1000, 12, 1);
    expect(investedTotal).toBe(12000);
    expect(corpus).toBeGreaterThan(investedTotal);
    expect(gains).toBeGreaterThan(0);
    expect(schedule.length).toBe(12);
  });
  it('Lumpsum future value should be >= principal', () => {
    const { futureValue, invested } = calculateLumpsum(10000, 12, 1);
    expect(invested).toBe(10000);
    expect(futureValue).toBeGreaterThanOrEqual(10000);
  });
  it('Goal SIP should require positive monthly amount', () => {
    const { requiredMonthly } = calculateSIPForGoal(100000, 12, 2);
    expect(requiredMonthly).toBeGreaterThan(0);
  });
});
