/**
 * Normalize a raw id (string/number) to a numeric value.
 * Falls back to 0 when the value cannot be parsed.
 */
export function toNumericId(value: any): number {
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}
