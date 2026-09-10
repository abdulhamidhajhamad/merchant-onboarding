export function calculateEffectiveRate(monthlyVolume: number, totalFees: number): number {
  if (!Number.isFinite(monthlyVolume) || !Number.isFinite(totalFees)) {
    throw new Error('monthlyVolume and totalFees must be finite numbers');
  }

  if (monthlyVolume <= 0) {
    return 0;
  }

  return Number(((totalFees / monthlyVolume) * 100).toFixed(4));
}

export function calculateMonthlyVolume(averageTicketSize: number, transactionCount: number): number {
  if (!Number.isFinite(averageTicketSize) || !Number.isFinite(transactionCount)) {
    throw new Error('averageTicketSize and transactionCount must be finite numbers');
  }

  return Number((averageTicketSize * transactionCount).toFixed(2));
}

export function calculateChargebackRate(chargebackFees: number, monthlyVolume: number): number {
  if (!Number.isFinite(chargebackFees) || !Number.isFinite(monthlyVolume)) {
    throw new Error('chargebackFees and monthlyVolume must be finite numbers');
  }

  if (monthlyVolume <= 0) {
    return 0;
  }

  return Number(((chargebackFees / monthlyVolume) * 100).toFixed(4));
}

export function formatPercent(value: number): string {
  return `${Number(value).toFixed(2)}%`;
}
