export function formatCurrency(value: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: currency || 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    // Fallback to simple formatting if Intl is not available
    return `₹${value.toFixed(2)}`;
  }
}
