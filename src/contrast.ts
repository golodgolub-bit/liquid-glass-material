import type{RGB}from'./material.js';
export type ForegroundAppearance='auto'|'light'|'dark'|'material';
export interface ContrastRegion{x:number;y:number;width:number;height:number}
export interface ContrastOptions {
  /** material follows GlassMaterial.appearance; auto always chooses readable ink. */
  appearance:ForegroundAppearance;
  /** Normalized local rectangle occupied by foreground, excluding the refracting edge. */
  region:Readonly<ContrastRegion>;
  minimumRatio:number;
  /** Maximum neutral protection opacity for Regular. Clear never adds this protection. */
  protection:number;
}
export type ContrastSettings=Partial<Omit<ContrastOptions,'region'>>&{region?:Partial<ContrastRegion>};
export interface ContrastState {
  foreground:'light'|'dark';source:'pending'|'source'|'composited'|'explicit';
  ratio:number|null;minimumRatio:number;meetsTarget:boolean|null;protection:number;
}
export const foregroundColors=Object.freeze({dark:Object.freeze([23/255,26/255,36/255])as RGB,light:Object.freeze([247/255,248/255,252/255])as RGB});
export const protectionColors=Object.freeze({dark:Object.freeze([.96,.97,.99])as RGB,light:Object.freeze([.07,.085,.11])as RGB});
export const defaultContrast:Readonly<ContrastOptions>=Object.freeze({appearance:'material',region:Object.freeze({x:.12,y:.18,width:.76,height:.64}),minimumRatio:4.5,protection:.85});
export function createContrast(options:ContrastSettings={},base=defaultContrast):Readonly<ContrastOptions>{
  const c={...base,...options,region:{...base.region,...options.region}};
  if(!['auto','light','dark','material'].includes(c.appearance)||!Number.isFinite(c.minimumRatio)||c.minimumRatio<1||c.minimumRatio>21||!Number.isFinite(c.protection)||c.protection<0||c.protection>1)throw new RangeError('Invalid contrast policy');
  const r=c.region;if(Object.values(r).some(v=>!Number.isFinite(v))||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1||r.y+r.height>1)throw new RangeError('Contrast region must fit inside normalized local bounds');
  return Object.freeze({...c,region:Object.freeze(r)});
}
export function relativeLuminance(rgb:RGB):number{return rgb.reduce((sum,v,i)=>{const x=Math.max(0,Math.min(1,v));return sum+(x<=.04045?x/12.92:((x+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];},0);}
export function contrastRatio(a:RGB,b:RGB):number{const x=relativeLuminance(a),y=relativeLuminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export interface ContrastEvaluation {foreground:'light'|'dark';ratio:number;protection:number;meetsTarget:boolean}
/** Evaluate actual RGB samples. Protection is solved in sRGB, the compositor's mixing space. */
export function evaluateContrast(samples:readonly RGB[],options:Readonly<ContrastOptions>=defaultContrast,previous:'light'|'dark'='dark',fixed?:'light'|'dark'):ContrastEvaluation{
  if(!samples.length)throw new RangeError('Contrast evaluation requires samples');
  const low=[1,1,1],high=[0,0,0];let minL=1,maxL=0;
  for(const rgb of samples){const l=relativeLuminance(rgb);minL=Math.min(minL,l);maxL=Math.max(maxL,l);for(let i=0;i<3;i++){low[i]=Math.min(low[i],rgb[i]);high[i]=Math.max(high[i],rgb[i]);}}
  const score=(ink:'light'|'dark',opacity:number)=>{
    const foreground=relativeLuminance(foregroundColors[ink]);
    const lo=opacity===0?minL:relativeLuminance(low.map((v,i)=>v*(1-opacity)+protectionColors[ink][i]*opacity)as unknown as RGB);
    const hi=opacity===0?maxL:relativeLuminance(high.map((v,i)=>v*(1-opacity)+protectionColors[ink][i]*opacity)as unknown as RGB);
    if(foreground>=lo&&foreground<=hi)return 1;
    return Math.min((Math.max(foreground,lo)+.05)/(Math.min(foreground,lo)+.05),(Math.max(foreground,hi)+.05)/(Math.min(foreground,hi)+.05));
  };
  const required=(ink:'light'|'dark')=>{if(score(ink,0)>=options.minimumRatio)return 0;let lo=0,hi=options.protection;for(let i=0;i<10;i++){const m=(lo+hi)/2;if(score(ink,m)>=options.minimumRatio+.12)hi=m;else lo=m;}return hi;};
  const dark=required('dark'),light=required('light');let foreground=fixed??(dark<light-.025?'dark':light<dark-.025?'light':score('dark',0)>score('light',0)?'dark':'light');
  if(!fixed&&Math.abs(dark-light)<.025&&score(previous,0)>=Math.max(score('dark',0),score('light',0))*.92)foreground=previous;
  const protection=foreground==='dark'?dark:light,ratio=score(foreground,protection);
  return{foreground,ratio,protection,meetsTarget:ratio>=options.minimumRatio-.02};
}
