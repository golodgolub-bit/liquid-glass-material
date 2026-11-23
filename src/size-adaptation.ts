import{materialRanges,type GlassMaterial}from'./material.js';
export interface MaterialFootprint {width:number;height:number;area?:number}
/** Exact union area of axis-aligned member rectangles; empty gaps add no area.
 * Curved silhouettes and SDF bridges still require an application-supplied area. */
export function measureMaterialFootprint(rects:readonly {x:number;y:number;width:number;height:number}[]):Required<MaterialFootprint>{
  if(!rects.length||rects.some(r=>![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.width<=0||r.height<=0))throw new RangeError('Invalid material rectangles');
  if(rects.length===1)return{width:rects[0].width,height:rects[0].height,area:rects[0].width*rects[0].height};
  const xs=[...new Set(rects.flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b);let area=0;
  for(let i=1;i<xs.length;i++){
    const intervals=rects.filter(r=>r.x<xs[i]&&r.x+r.width>xs[i-1]).map(r=>[r.y,r.y+r.height]).sort((a,b)=>a[0]-b[0]);
    let start=intervals[0]?.[0]??0,end=start,covered=0;
    for(const[a,b]of intervals){if(a>end){covered+=end-start;start=a;end=b;}else end=Math.max(end,b);}
    area+=(xs[i]-xs[i-1])*(covered+end-start);
  }
  return{width:xs.at(-1)!-xs[0],height:Math.max(...rects.map(r=>r.y+r.height))-Math.min(...rects.map(r=>r.y)),area};
}
export interface SizeAdaptation {
  referenceArea:number;thickness:number;refraction:number;frost:number;shadow:number;shadowRadius:number;scatterRadius:number;
}
export const defaultSizeAdaptation:Readonly<SizeAdaptation>=Object.freeze({referenceArea:5760,thickness:.3,refraction:.15,frost:.18,shadow:.35,shadowRadius:.35,scatterRadius:.22});
export function createSizeAdaptation(options:Partial<SizeAdaptation>={}):Readonly<SizeAdaptation>{
  const p={...defaultSizeAdaptation,...options};for(const[k,v]of Object.entries(p))if(!Number.isFinite(v)||v<0||k==='referenceArea'&&v===0||k!=='referenceArea'&&v>2)throw new RangeError('Invalid size adaptation');return Object.freeze(p);
}
/** Effective material at the current geometry; base parameters are never mutated. */
export function resolveMaterialForSize(material:Readonly<GlassMaterial>,rect:Readonly<MaterialFootprint>,profile:Readonly<SizeAdaptation>=defaultSizeAdaptation):Readonly<GlassMaterial>{
  if(!Number.isFinite(rect.width+rect.height)||rect.width<=0||rect.height<=0)throw new RangeError('Invalid material geometry');
  const area=rect.area??rect.width*rect.height;if(!Number.isFinite(area)||area<=0||area>rect.width*rect.height*(1+1e-12))throw new RangeError('Invalid material area');
  const growth=Math.max(0,Math.log2(Math.sqrt(area/profile.referenceArea))),m={...material};
  for(const key of['thickness','refraction','shadow','shadowRadius','scatterRadius']as const){const[min,max]=materialRanges[key];m[key]=Math.max(min,Math.min(max,m[key]*(1+profile[key]*growth)));}
  m.frost=Math.min(1,m.frost+(1-m.frost)*(1-Math.exp(-profile.frost*growth*(m.variant==='clear'?.2:1))));
  return Object.freeze(m);
}
