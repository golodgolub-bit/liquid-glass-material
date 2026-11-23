import type {Rect} from './geometry.js';
import type {SpringOptions} from './motion.js';
export interface SpringProfile {frequency:number;damping:number}
export interface GlassPhysics {
  geometry:SpringProfile;material:SpringProfile;press:SpringProfile;reveal:SpringProfile;
  offset:SpringProfile;impulse:SpringProfile;tone:SpringProfile;shape:SpringProfile;
  pressScale:readonly[number,number];attraction:readonly[number,number];
  velocityScale:number;maxStretch:number;crossCoupling:number;revealScale:number;impulseStrength:number;
}
export type PhysicsOptions = Partial<Omit<GlassPhysics,'geometry'|'material'|'press'|'reveal'|'offset'|'impulse'|'tone'|'shape'>> & Partial<Record<PhysicsChannel,SpringOptions>>;
export type PhysicsChannel='geometry'|'material'|'press'|'reveal'|'offset'|'impulse'|'tone'|'shape';
export interface DeformationState {rect:Readonly<Rect>;visualRect:Readonly<Rect>;velocity:Readonly<Rect>;pressed:number;visibility:number;offset:readonly[number,number]}
/** Pure function: used by rendering, DOM bindings and hit testing; no mutation or side effects. */
export type DeformationFunction=(state:Readonly<DeformationState>)=>Rect;
export const physicsChannels:readonly PhysicsChannel[]=['geometry','material','press','reveal','offset','impulse','tone','shape'];
const profile=(frequency:number,damping:number)=>Object.freeze({frequency,damping});
export const defaultPhysics:Readonly<GlassPhysics>=Object.freeze({geometry:profile(3.5,.88),material:profile(3.5,1),press:profile(4.7,.9),reveal:profile(4.2,.9),offset:profile(4.6,.95),impulse:profile(3,.95),tone:profile(2.3,1),shape:profile(4.5,1),pressScale:Object.freeze([.065,.025])as readonly[number,number],attraction:Object.freeze([5,4])as readonly[number,number],velocityScale:2800,maxStretch:.1,crossCoupling:.25,revealScale:.9,impulseStrength:1});
export function createPhysics(options:PhysicsOptions={},base:Readonly<GlassPhysics>=defaultPhysics):Readonly<GlassPhysics>{
  const p={...base,...options}as GlassPhysics;
  for(const key of physicsChannels){const s={...base[key],...options[key]};if(!Number.isFinite(s.frequency)||s.frequency<=0||!Number.isFinite(s.damping)||s.damping<0)throw new RangeError(`Invalid ${key} spring`);p[key]=Object.freeze(s);}
  for(const key of ['pressScale','attraction']as const){const v=p[key];if(v.length!==2||v.some(n=>!Number.isFinite(n)||n<0))throw new RangeError(`Invalid ${key}`);p[key]=Object.freeze([...v])as readonly[number,number];}
  for(const key of ['velocityScale','maxStretch','crossCoupling','revealScale','impulseStrength']as const)if(!Number.isFinite(p[key])||p[key]<0)throw new RangeError(`Invalid ${key}`);
  if(p.velocityScale===0||p.maxStretch>.5||p.crossCoupling>1||p.revealScale>1||p.pressScale.some(n=>n>1))throw new RangeError('Physics deformation outside supported range');
  return Object.freeze(p);
}
