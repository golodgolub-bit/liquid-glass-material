import type {GlassRenderer,SurfaceHandle} from './renderer.js';
import type {Rect} from './geometry.js';
import {capturePointer,type PointerInput} from './pointer.js';
import type {SpringOptions} from './motion.js';
import {createPhysics}from'./physics.js';
export interface DragOptions {surface:SurfaceHandle;bounds?:()=>Rect;onStart?:()=>void;onEnd?:()=>void;followSpring?:SpringOptions;releaseSpring?:SpringOptions}
/** Fast critically damped tracking during a grab; a softer spring releases the deformation. */
export function bindDrag(renderer:GlassRenderer,element:HTMLElement,options:DragOptions):{dispose:()=>void;readonly dragging:boolean}{
  const surface=options.surface,tracking=createPhysics({geometry:options.followSpring??{frequency:14,damping:1}}).geometry;
  if(options.releaseSpring)createPhysics({geometry:options.releaseSpring});
  let dragging=false,dx=0,dy=0,restore=surface.physics.geometry;
  const point=(e:PointerInput)=>{const c=renderer.canvas.getBoundingClientRect();return[(e.clientX-c.left)*renderer.size.width/c.width,(e.clientY-c.top)*renderer.size.height/c.height]as const;};
  const follow=(e:PointerInput)=>{const[x,y]=point(e),r=surface.rect,b=options.bounds?.()??{x:0,y:0,...renderer.size,radius:0};surface.move({x:Math.max(b.x,Math.min(b.x+b.width-r.width,x-dx)),y:Math.max(b.y,Math.min(b.y+b.height-r.height,y-dy))});surface.interact(true,x,y);};
  const release=()=>{dragging=false;surface.motion(options.releaseSpring??restore).interact(false);element.classList.remove('lg-dragging');options.onEnd?.();};
  const stop=capturePointer(element,{start:e=>{const[x,y]=point(e);if(!surface.contains(x,y))return false;options.onStart?.();restore=surface.physics.geometry;dragging=true;const r=surface.rect;dx=x-r.x;dy=y-r.y;surface.motion(tracking).interact(true,x,y);element.classList.add('lg-dragging');},move:follow,end:e=>{follow(e);release();},cancel:release});
  return{get dragging(){return dragging;},dispose:stop};
}
