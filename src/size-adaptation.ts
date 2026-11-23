import{materialRanges,type GlassMaterial}from'./material.js';
export interface SizeAdaptation {
  referenceArea:number;thickness:number;refraction:number;frost:number;shadow:number;shadowRadius:number;scatterRadius:number;
}
export const defaultSizeAdaptation:Readonly<SizeAdaptation>=Object.freeze({referenceArea:5760,thickness:.3,refraction:.15,frost:.18,shadow:.35,shadowRadius:.35,scatterRadius:.22});
export function createSizeAdaptation(options:Partial<SizeAdaptation>={}):Readonly<SizeAdaptation>{
  const p={...defaultSizeAdaptation,...options};for(const[k,v]of Object.entries(p))if(!Number.isFinite(v)||v<0||k==='referenceArea'&&v===0||k!=='referenceArea'&&v>2)throw new RangeError('Invalid size adaptation');return Object.freeze(p);
}
/** Effective material at the current geometry; base parameters are never mutated. */
export function resolveMaterialForSize(material:Readonly<GlassMaterial>,rect:{width:number;height:number},profile:Readonly<SizeAdaptation>=defaultSizeAdaptation):Readonly<GlassMaterial>{
  if(!Number.isFinite(rect.width+rect.height)||rect.width<=0||rect.height<=0)throw new RangeError('Invalid material geometry');
  const growth=Math.max(0,Math.log2(Math.sqrt(rect.width*rect.height/profile.referenceArea))),m={...material};
  for(const key of['thickness','refraction','shadow','shadowRadius','scatterRadius']as const){const[min,max]=materialRanges[key];m[key]=Math.max(min,Math.min(max,m[key]*(1+profile[key]*growth)));}
  m.frost=Math.min(1,m.frost+(1-m.frost)*(1-Math.exp(-profile.frost*growth*(m.variant==='clear'?.2:1))));
  return Object.freeze(m);
}
