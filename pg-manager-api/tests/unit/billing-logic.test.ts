/**
 * Unit tests for billing computation logic.
 * These test pure functions and algorithms without database dependencies.
 */

describe('Invoice status computation', () => {
  function computeInvoiceStatus(totalPaid: number, invoiceTotal: number): string {
    if (totalPaid >= invoiceTotal) return 'paid';
    if (totalPaid > 0) return 'partially_paid';
    return 'overdue';
  }

  it('returns paid when total paid equals invoice total', () => {
    expect(computeInvoiceStatus(5000, 5000)).toBe('paid');
  });

  it('returns paid when total paid exceeds invoice total', () => {
    expect(computeInvoiceStatus(5001, 5000)).toBe('paid');
  });

  it('returns partially_paid when some payment made', () => {
    expect(computeInvoiceStatus(2000, 5000)).toBe('partially_paid');
  });

  it('returns overdue when no payment made', () => {
    expect(computeInvoiceStatus(0, 5000)).toBe('overdue');
  });
});

describe('Late fee calculation', () => {
  function calculateLateFee(
    rentAmount: number,
    feeType: 'fixed' | 'percentage',
    feeAmount: number,
    maxFee?: number,
  ): number {
    let fee: number;
    if (feeType === 'percentage') {
      fee = (rentAmount * feeAmount) / 100;
    } else {
      fee = feeAmount;
    }
    if (maxFee !== undefined) {
      fee = Math.min(fee, maxFee);
    }
    return fee;
  }

  it('calculates fixed late fee', () => {
    expect(calculateLateFee(5000, 'fixed', 500)).toBe(500);
  });

  it('calculates percentage late fee', () => {
    expect(calculateLateFee(10000, 'percentage', 5)).toBe(500);
  });

  it('caps fee at maxFee', () => {
    expect(calculateLateFee(100000, 'percentage', 10, 2000)).toBe(2000);
  });

  it('does not cap when below maxFee', () => {
    expect(calculateLateFee(5000, 'percentage', 5, 1000)).toBe(250);
  });

  it('handles zero rent amount', () => {
    expect(calculateLateFee(0, 'percentage', 5)).toBe(0);
  });
});

describe('Aging bucket assignment', () => {
  function getBucketKey(daysOverdue: number): string {
    if (daysOverdue <= 0) return 'current';
    if (daysOverdue <= 30) return '1-30';
    if (daysOverdue <= 60) return '31-60';
    if (daysOverdue <= 90) return '61-90';
    return '90+';
  }

  it('assigns current for not yet due', () => {
    expect(getBucketKey(0)).toBe('current');
    expect(getBucketKey(-5)).toBe('current');
  });

  it('assigns 1-30 for recently overdue', () => {
    expect(getBucketKey(1)).toBe('1-30');
    expect(getBucketKey(15)).toBe('1-30');
    expect(getBucketKey(30)).toBe('1-30');
  });

  it('assigns 31-60 for moderately overdue', () => {
    expect(getBucketKey(31)).toBe('31-60');
    expect(getBucketKey(45)).toBe('31-60');
    expect(getBucketKey(60)).toBe('31-60');
  });

  it('assigns 61-90 for significantly overdue', () => {
    expect(getBucketKey(61)).toBe('61-90');
    expect(getBucketKey(90)).toBe('61-90');
  });

  it('assigns 90+ for severely overdue', () => {
    expect(getBucketKey(91)).toBe('90+');
    expect(getBucketKey(365)).toBe('90+');
  });
});

describe('Idempotency key generation', () => {
  function generateKey(leaseId: string, year: number, month: number): string {
    return `lease:${leaseId}:${year}-${String(month + 1).padStart(2, '0')}`;
  }

  it('generates correct key format', () => {
    expect(generateKey('abc-123', 2026, 0)).toBe('lease:abc-123:2026-01');
    expect(generateKey('abc-123', 2026, 11)).toBe('lease:abc-123:2026-12');
  });

  it('pads single-digit months', () => {
    expect(generateKey('xyz', 2026, 2)).toBe('lease:xyz:2026-03');
  });

  it('same inputs produce same key (idempotent)', () => {
    const key1 = generateKey('lease-1', 2026, 5);
    const key2 = generateKey('lease-1', 2026, 5);
    expect(key1).toBe(key2);
  });

  it('different months produce different keys', () => {
    const key1 = generateKey('lease-1', 2026, 5);
    const key2 = generateKey('lease-1', 2026, 6);
    expect(key1).not.toBe(key2);
  });
});

describe('Outstanding balance computation', () => {
  function computeOutstanding(invoiceTotal: number, payments: { amount: number; status: string }[]): number {
    const totalPaid = payments
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, invoiceTotal - totalPaid);
  }

  it('returns full amount when no payments', () => {
    expect(computeOutstanding(5000, [])).toBe(5000);
  });

  it('subtracts successful payments', () => {
    expect(computeOutstanding(5000, [
      { amount: 2000, status: 'success' },
      { amount: 1000, status: 'success' },
    ])).toBe(2000);
  });

  it('ignores failed payments', () => {
    expect(computeOutstanding(5000, [
      { amount: 2000, status: 'success' },
      { amount: 3000, status: 'failed' },
    ])).toBe(3000);
  });

  it('returns zero when fully paid', () => {
    expect(computeOutstanding(5000, [
      { amount: 5000, status: 'success' },
    ])).toBe(0);
  });

  it('returns zero when overpaid', () => {
    expect(computeOutstanding(5000, [
      { amount: 6000, status: 'success' },
    ])).toBe(0);
  });
});

describe('Reconciliation shortfall', () => {
  function computeShortfall(expected: number, collected: number): number {
    return expected - collected;
  }

  it('returns positive shortfall when undercollected', () => {
    expect(computeShortfall(10000, 7000)).toBe(3000);
  });

  it('returns zero when fully collected', () => {
    expect(computeShortfall(10000, 10000)).toBe(0);
  });

  it('returns negative when overcollected', () => {
    expect(computeShortfall(10000, 12000)).toBe(-2000);
  });
});
