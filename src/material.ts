export type RGB = readonly [number, number, number];
export type Quality = 'low' | 'balanced' | 'high';
export type Appearance = 'auto' | 'light' | 'dark';

/** All spatial parameters use CSS pixels; colors use sRGB in [0, 1]. */
export interface GlassMaterial {
  variant: 'regular' | 'clear' | 'identity';
  appearance: Appearance;
  /** Optical path depth in CSS pixels. Independent from the edge roll width. */
  thickness: number;
  /** Width of optical lensing in CSS pixels. Independent from decorative bevel. */
  edgeWidth:number;
  /** Optional raised edge shading, [0,1]. Disabled by default. */
  bevel:number;
  refraction: number;
  /** Interior lens magnification, independent from the curved edge. */
  magnification: number;
  dispersion: number;
  /** Refractive index and strength of environment reflection. */
  ior: number;
  reflection: number;
  /** Continuous corner profile; circles and full capsules stay circular. */
  cornerPower: number;
  /** Mix of shared blurred backdrop and sharp transmission, [0, 1]. */
  frost: number;
  tint: RGB;
  tintOpacity: number;
  saturation: number;
  highlight: number;
  shadow: number;
  /** Localized darkening, particularly useful for Clear over bright media. */
  dimming: number;
}
const base: GlassMaterial = {
  variant: 'regular', appearance: 'auto', thickness: 18, edgeWidth:12, bevel:0, refraction: 13, magnification:1,
  dispersion: 0.35, ior:1.48,reflection:.38,cornerPower:2.6,frost: 0.68, tint: Object.freeze([1, 1, 1]) as RGB, tintOpacity: 0,
  saturation: 1.12, highlight: 0.5, shadow: 0.065, dimming: 0,
};
export const materials = Object.freeze({
  regular: Object.freeze({ ...base }),
  clear: Object.freeze({ ...base, variant: 'clear' as const, frost: 0.08, refraction: 17, thickness: 16, highlight: 0.6, appearance: 'dark' as const }),
  identity: Object.freeze({ ...base, variant: 'identity' as const }),
});
const range = (n: number, min: number, max: number, key: string) => {
  if (!Number.isFinite(n) || n < min || n > max) throw new RangeError(`${key} must be in [${min}, ${max}]`);
};
export function createMaterial(options: Partial<GlassMaterial> = {}): Readonly<GlassMaterial> {
  const preset = options.variant === 'clear' ? materials.clear : materials.regular;
  const m = { ...preset, ...options };
  if (!['regular', 'clear', 'identity'].includes(m.variant)) throw new TypeError('Unknown material variant');
  if (!['auto', 'light', 'dark'].includes(m.appearance)) throw new TypeError('Unknown appearance');
  for (const key of ['frost', 'tintOpacity', 'shadow', 'dimming','bevel'] as const) range(m[key], 0, 1, key);
  for (const key of ['thickness', 'refraction'] as const) range(m[key], 0, 100, key);
  range(m.edgeWidth,0,32,'edgeWidth');
  range(m.dispersion, 0, 5, 'dispersion'); range(m.saturation, 0, 3, 'saturation'); range(m.highlight, 0, 2, 'highlight');
  range(m.magnification,1,2,'magnification');range(m.ior,1,2.5,'ior');range(m.reflection,0,1,'reflection');range(m.cornerPower,2,4,'cornerPower');
  if (m.tint.length !== 3) throw new TypeError('tint must contain three components');
  m.tint.forEach(n => range(n, 0, 1, 'tint'));
  return Object.freeze({ ...m, tint: Object.freeze([...m.tint]) as RGB });
}
