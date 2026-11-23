export type Vec3=readonly[number,number,number];
export type Vec2=readonly[number,number];
const dot=(a:Vec3,b:Vec3)=>a.reduce((s,n,i)=>s+n*b[i],0);
function unit(v:Vec3):Vec3{if(v.length!==3||v.some(n=>!Number.isFinite(n))||Math.hypot(...v)<1e-9)throw new RangeError('A ray needs a finite nonzero vector');const n=Math.hypot(...v);return v.map(x=>x/n)as unknown as Vec3;}
/** Normal points against the incident ray. null means total internal reflection. */
export function refractRay(incident:Vec3,normal:Vec3,eta:number):Vec3|null{
  if(!Number.isFinite(eta)||eta<=0)throw new RangeError('eta must be positive');
  const i=unit(incident),n=unit(normal),d=dot(n,i);if(d>1e-8)throw new RangeError('Normal must face the incident ray');
  const k=1-eta*eta*(1-d*d);if(k<0)return null;
  return i.map((x,j)=>eta*x-(eta*d+Math.sqrt(k))*n[j])as unknown as Vec3;
}
/** Exact unpolarized interface reflectance, not the Schlick approximation. */
export function fresnelReflectance(cosIncident:number,n1:number,n2:number):number{
  if(!Number.isFinite(cosIncident)||cosIncident<0||cosIncident>1||!Number.isFinite(n1)||!Number.isFinite(n2)||n1<=0||n2<=0)throw new RangeError('Invalid Fresnel input');
  if(n1===n2)return 0;const s2=(n1/n2)**2*(1-cosIncident*cosIncident);if(s2>=1)return 1;
  const ct=Math.sqrt(1-s2),rs=(n1*cosIncident-n2*ct)/(n1*cosIncident+n2*ct),rp=(n1*ct-n2*cosIncident)/(n1*ct+n2*cosIncident);return(rs*rs+rp*rp)/2;
}
export interface SlabRayOptions {incident?:Vec3;entryNormal:Vec3;exitNormal?:Vec3;ior?:number;outsideIor?:number;thickness:number;backdropDistance?:number;absorption?:Vec3}
export interface SlabRay {internal:Vec3|null;outgoing:Vec3|null;offset:Vec2|null;pathLength:number;entryReflectance:number;exitReflectance:number;transmittance:Vec3;totalInternalReflection:boolean}
/** Two planar interfaces, one transmitted path. No internal bounce tree or 3D scene. */
export function traceSlabRay(options:SlabRayOptions):SlabRay{
  const incident=unit(options.incident??[0,0,-1]),entry=unit(options.entryNormal),exit=unit(options.exitNormal??[0,0,1]),ior=options.ior??1.48,outside=options.outsideIor??1,gap=options.backdropDistance??0,sigma=options.absorption??[0,0,0];
  if(!Number.isFinite(options.thickness)||options.thickness<0||!Number.isFinite(gap)||gap<0||sigma.length!==3||sigma.some(n=>!Number.isFinite(n)||n<0)||incident[2]>=-1e-6)throw new RangeError('Invalid slab geometry or absorption');
  const internal=refractRay(incident,entry,outside/ior),entryReflectance=fresnelReflectance(Math.max(0,Math.min(1,-dot(incident,entry))),outside,ior);
  if(!internal)return{internal:null,outgoing:null,offset:null,pathLength:0,entryReflectance,exitReflectance:1,transmittance:[0,0,0],totalInternalReflection:true};
  const projection=dot(internal,exit);if(projection>=-1e-6)throw new RangeError('Internal ray does not reach a front-facing exit plane');
  const pathLength=-options.thickness*exit[2]/projection;if(pathLength<0)throw new RangeError('Exit plane lies behind the entry');
  const outgoing=refractRay(internal,exit,ior/outside),exitReflectance=fresnelReflectance(Math.max(0,Math.min(1,-projection)),ior,outside);
  const travel=outgoing&&outgoing[2]<-1e-6?(-(options.thickness+gap)-internal[2]*pathLength)/outgoing[2]:-1;
  const offset:Vec2|null=outgoing&&travel>=0?[0,1].map(j=>internal[j]*pathLength+outgoing[j]*travel-incident[j]*(options.thickness+gap)/-incident[2])as unknown as Vec2:null;
  return{internal,outgoing,offset,pathLength,entryReflectance,exitReflectance,transmittance:sigma.map(n=>(1-entryReflectance)*(1-exitReflectance)*Math.exp(-n*pathLength))as unknown as Vec3,totalInternalReflection:!outgoing};
}
export interface OpticalProbe {depth:number;width:number;thickness:number;refraction:number;ior:number;gradient:Vec2;presence?:number}
/** CPU reference of the default GPU screen-space kernel. Normal Y is up; gradient Y is down. */
export function sampleGlassOptics(data:OpticalProbe):{normal:Vec3;displacement:Vec2}{
  const presence=data.presence??1;if(Object.values(data).some(v=>typeof v==='number'&&!Number.isFinite(v))||!Number.isFinite(presence)||presence<0||presence>1||data.width<0||data.depth<0||data.thickness<0||data.refraction<0||data.ior<1||data.gradient.length!==2||data.gradient.some(n=>!Number.isFinite(n)))throw new RangeError('Invalid optical probe');
  const len=Math.hypot(...data.gradient),t=Math.max(0,Math.min(1,data.depth/Math.max(data.width,.001))),height=1-(1-t)**3,slope=2.4*(1-t)**2*Math.min(len,1)*(data.width>=.001?1:0);
  const normal=unit([data.gradient[0]/Math.max(len,.0001)*slope,-data.gradient[1]/Math.max(len,.0001)*slope,1]),ray=refractRay([0,0,-1],normal,1/data.ior)!;
  const factor=data.refraction*height*1.6*Math.sqrt(data.thickness/18)*presence/Math.max(-ray[2],.15),d:Vec2=[ray[0]*factor,ray[1]*factor],scale=Math.min(1,Math.max(data.width,.001)*.7/Math.max(Math.hypot(...d),.0001));
  return{normal,displacement:[d[0]*scale,d[1]*scale]};
}
/** Optional GPU slab path, used in an optics hook. Coordinates are the same as traceSlabRay. */
export const slabOpticsGLSL=`
struct SlabRay {vec3 internalRay;vec3 outgoingRay;vec2 offset;float pathLength;float transmission;float tir;float valid;};
float slabFresnel(float ci,float n1,float n2){if(n1==n2)return 0.0;float s2=pow(n1/n2,2.0)*(1.0-ci*ci);if(s2>=1.0)return 1.0;float ct=sqrt(1.0-s2);float rs=(n1*ci-n2*ct)/(n1*ci+n2*ct),rp=(n1*ct-n2*ci)/(n1*ct+n2*ci);return(rs*rs+rp*rp)*.5;}
SlabRay traceSlab(vec3 incident,vec3 entryNormal,vec3 exitNormal,float ior,float outsideIor,float thickness,float gap){
  vec3 i=normalize(incident),n=normalize(entryNormal),e=normalize(exitNormal),inside=refract(i,n,outsideIor/ior);
  if(length(inside)<.000001)return SlabRay(inside,vec3(0),vec2(0),0.0,0.0,1.0,0.0);
  float projection=dot(inside,e);if(projection>=-.000001)return SlabRay(inside,vec3(0),vec2(0),0.0,0.0,0.0,0.0);
  float path=-thickness*e.z/projection;vec3 outRay=refract(inside,e,ior/outsideIor);
  if(path<0.0)return SlabRay(inside,outRay,vec2(0),0.0,0.0,0.0,0.0);
  if(length(outRay)<.000001)return SlabRay(inside,outRay,vec2(0),path,0.0,1.0,0.0);
  float energy=(1.0-slabFresnel(clamp(-dot(i,n),0.0,1.0),outsideIor,ior))*(1.0-slabFresnel(clamp(-dot(inside,e),0.0,1.0),ior,outsideIor));
  if(outRay.z>=-.000001)return SlabRay(inside,outRay,vec2(0),path,energy,0.0,0.0);
  float travel=(-(thickness+gap)-inside.z*path)/outRay.z;if(travel<0.0)return SlabRay(inside,outRay,vec2(0),path,energy,0.0,0.0);
  return SlabRay(inside,outRay,inside.xy*path+outRay.xy*travel-i.xy*(thickness+gap)/-i.z,path,energy,0.0,1.0);
}`;
