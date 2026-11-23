export interface Rect { x: number; y: number; width: number; height: number; radius: number }
export function validateRect(rect: Rect): void {
  for (const [key, value] of Object.entries(rect)) if (!Number.isFinite(value)) throw new RangeError(`Invalid rect.${key}`);
  if (rect.width <= 0 || rect.height <= 0 || rect.radius < 0) throw new RangeError('Rect requires positive dimensions and nonnegative radius');
}
export function roundedRectDistance(x: number, y: number, rect: Rect): number {
  const r = Math.min(rect.radius, rect.width / 2, rect.height / 2);
  const qx = Math.abs(x - rect.x - rect.width / 2) - rect.width / 2 + r, qy = Math.abs(y - rect.y - rect.height / 2) - rect.height / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
export function smoothUnion(a: number, b: number, spacing: number): number {
  if (spacing <= 0) return Math.min(a, b);
  const h = Math.max(spacing - Math.abs(a - b), 0) / spacing;
  return Math.min(a, b) - h * h * spacing * 0.25;
}
