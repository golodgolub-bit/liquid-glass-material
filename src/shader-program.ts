import {glassFragment,vertex,copyFragment,blurFragment} from './shaders.js';
export type ShaderValue=number|readonly[number,number]|readonly[number,number,number]|readonly[number,number,number,number];
export interface ShaderUniform {type:'float'|'vec2'|'vec3'|'vec4';value:ShaderValue}
export interface GlassShaderOptions {
  /** Global GLSL declarations/helpers. Uniforms must use the uGlass_ prefix. */
  declarations?:string;
  /** Body of GlassOpticalSample glassOptics(GlassOpticalInput data). */
  optics?:string;
  /** Body of vec4 glassField(vec2 point). Use defaultGlassField(point). */
  field?:string;
  /** Body of vec3 glassShade(vec3 color,vec2 point,vec2 sampleUV,vec3 normal,float depth). */
  shade?:string;
  /** Full fragment replacement. Keep the standard uniform ABI to retain composition. */
  fragment?:string;
  /** Optional full scattering/backdrop passes; preserve their standard uniform ABI. */
  blurFragment?:string;
  backdropFragment?:string;
  uniforms?:Readonly<Record<string,ShaderUniform>>;
}
export interface GlassShader {readonly fragment:string;readonly blurFragment:string;readonly backdropFragment:string;readonly uniforms:Readonly<Record<string,Readonly<ShaderUniform>>>}
const sizes={float:1,vec2:2,vec3:3,vec4:4};
export function validateShaderValue(type:ShaderUniform['type'],value:ShaderValue):void{
  const list=typeof value==='number'?[value]:value;
  if(!(type in sizes)||list.length!==sizes[type]||list.some(n=>!Number.isFinite(n)))throw new TypeError(`Expected finite ${type} uniform`);
}
export function createGlassShader(options:GlassShaderOptions={}):GlassShader{
  if(options.fragment&&(options.optics||options.field||options.shade||options.declarations))throw new TypeError('Use a full fragment or hooks, not both');
  const uniforms:Record<string,Readonly<ShaderUniform>>={};
  for(const[name,u]of Object.entries(options.uniforms??{})){
    if(!/^uGlass_[a-zA-Z0-9_]+$/.test(name))throw new TypeError('Custom uniform names must start with uGlass_');
    validateShaderValue(u.type,u.value);uniforms[name]=Object.freeze({type:u.type,value:typeof u.value==='number'?u.value:Object.freeze([...u.value])as ShaderValue});
  }
  const declarations=Object.entries(uniforms).map(([name,u])=>`uniform ${u.type} ${name};`).join('\n')+'\n'+(options.declarations??'');
  const fragment=options.fragment??glassFragment.replace('/* GLASS_DECLARATIONS */',()=>declarations)
    .replace('/* GLASS_FIELD */',()=>options.field??'return defaultGlassField(point);')
    .replace('/* GLASS_OPTICS */',()=>options.optics??'return defaultGlassOptics(data);')
    .replace('/* GLASS_SHADE */',()=>options.shade??'return color;');
  return Object.freeze({fragment,blurFragment:options.blurFragment??blurFragment,backdropFragment:options.backdropFragment??copyFragment,uniforms:Object.freeze(uniforms)});
}
export const shaderSources=Object.freeze({vertex,glass:createGlassShader().fragment,copy:copyFragment,blur:blurFragment});
