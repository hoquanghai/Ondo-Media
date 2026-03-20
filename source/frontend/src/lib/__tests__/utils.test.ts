import { cn, formatRelativeTime, formatDate } from '../utils';

describe('cn()', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('should merge conflicting Tailwind classes', () => {
    // tailwind-merge should keep the last conflicting class
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('should handle undefined and null inputs', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });

  it('should handle array inputs via clsx', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });
});

describe('formatDate()', () => {
  it('should format date with default pattern (yyyy年M月d日)', () => {
    const result = formatDate(new Date(2024, 0, 15)); // Jan 15, 2024
    expect(result).toBe('2024年1月15日');
  });

  it('should accept ISO string input', () => {
    const result = formatDate('2024-03-20T00:00:00.000Z');
    // The exact day may vary depending on timezone, but the format should be correct
    expect(result).toMatch(/^\d{4}年\d{1,2}月\d{1,2}日$/);
  });

  it('should accept custom format string', () => {
    const result = formatDate(new Date(2024, 5, 1), 'yyyy/MM/dd');
    expect(result).toBe('2024/06/01');
  });
});

describe('formatRelativeTime()', () => {
  it('should return a relative time string in Japanese', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const result = formatRelativeTime(fiveMinutesAgo);
    // Should contain Japanese suffix like "前" (ago)
    expect(result).toContain('前');
  });

  it('should accept ISO string input', () => {
    const recent = new Date(Date.now() - 60 * 1000).toISOString();
    const result = formatRelativeTime(recent);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should format hours ago correctly', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoHoursAgo);
    expect(result).toContain('前');
  });
});
