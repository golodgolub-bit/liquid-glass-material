export type RGB = readonly [number, number, number];
export type Quality = 'low' | 'balanced' | 'high';
export type Appearance = 'auto' | 'light' | 'dark';
const limits=(min:number,max:number)=>Object.freeze([min,max]as const);
/** Numeric bounds used for input validation and projecting oscillating springs onto valid optics. */
export const materialRanges=Object.freeze({thickness:limits(0,100),edgeWidth:limits(0,32),bevel:limits(0,1),edgeContrast:limits(0,1),specularIntensity:limits(0,2),specularWidth:limits(.1,12),shadowRadius:limits(.1,32),shadowOffset:limits(0,24),scatterRadius:limits(0,12),ambientSpill:limits(0,1),refraction:limits(0,100),magnification:limits(1,2),dispersion:limits(0,5),ior:limits(1,2.5),outsideIor:limits(1,2.5),abbeNumber:limits(0,1e6),reflection:limits(0,1),cornerPower:limits(2,4),frost:limits(0,1),tintOpacity:limits(0,1),saturation:limits(0,3),highlight:limits(0,2),shadow:limits(0,1),dimming:limits(0,1)});

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
  /** Narrow contrast contour, independent from decorative bevel. */
  edgeContrast:number;
  /** Edge illumination independent from raised bevel shading. */
  specularIntensity:number;
  specularWidth:number;
  shadowRadius:number;
  shadowOffset:number;
  /** Effective interpolation radius of the cached scattering kernels, CSS pixels. */
  scatterRadius:number;
  /** Local ambient color carried into the surface and its shadow. */
  ambientSpill:number;
  refraction: number;
  /** Interior lens magnification, independent from the curved edge. */
  magnification: number;
  dispersion: number;
  /** Refractive index and strength of environment reflection. */
  ior: number;
  /** Refractive index of the surrounding medium. Refraction uses outsideIor / ior. */
  outsideIor:number;
  /** Vd dispersion: 0 keeps artistic RGB separation; positive values enable Cauchy RGB indices. */
  abbeNumber:number;
  /** Beer-Lambert extinction coefficients per CSS pixel, RGB, [0,1]. */
  absorption:RGB;
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
  variant: 'regular', appearance: 'auto', thickness: 18, edgeWidth:12, bevel:0, edgeContrast:.18,specularIntensity:.55,specularWidth:1.4,shadowRadius:5,shadowOffset:1.5,scatterRadius:9,ambientSpill:.12, refraction: 13, magnification:1,
  dispersion: 0.35, ior:1.48,outsideIor:1,abbeNumber:0,absorption:Object.freeze([0,0,0])as RGB,reflection:.38,cornerPower:2.6,frost: 0.68, tint: Object.freeze([1, 1, 1]) as RGB, tintOpacity: 0,
  saturation: 1.12, highlight: 0.5, shadow: 0.065, dimming: 0,
};
export const materials = Object.freeze({
  regular: Object.freeze({ ...base }),
  clear: Object.freeze({ ...base, variant: 'clear' as const, frost: 0.08,scatterRadius:6,refraction: 17, thickness: 16, highlight: 0.6 }),
  clearDimmed:Object.freeze({...base,variant:'clear' as const,frost:.08,scatterRadius:6,refraction:17,thickness:16,highlight:.6,dimming:.35}),
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
  for(const key of Object.keys(materialRanges)as(keyof typeof materialRanges)[])range(m[key],...materialRanges[key],key);
  if(m.abbeNumber>0&&m.abbeNumber<5)throw new RangeError('abbeNumber must be 0 or at least 5');
  for(const key of ['tint','absorption']as const){if(m[key].length!==3)throw new TypeError(`${key} must contain three components`);m[key].forEach(n=>range(n,0,1,key));}
  return Object.freeze({ ...m, tint: Object.freeze([...m.tint]) as RGB,absorption:Object.freeze([...m.absorption])as RGB });
}
