import type {GlassRenderer,SurfaceHandle} from './renderer.js';
import type {Rect} from './geometry.js';
export interface ScrollBehaviorOptions{surface:SurfaceHandle;expanded:Rect;collapsed:Rect;edge?:'top'|'bottom';edgeExtent?:number;threshold?:number;onScroll?:(offset:number)=>void}
/** Direction-aware minimization with hysteresis. The application supplies its scrolling backdrop. */
export function bindScrollBehavior(renderer:GlassRenderer,scroller:HTMLElement,options:ScrollBehaviorOptions):{refresh:()=>void;dispose:()=>void}{
  let last=scroller.scrollTop,travel=0,minimized=false,token=0,disposed=false;
  const previous=renderer.scrollEdges;
  renderer.setScrollEdges({[options.edge??'bottom']:options.edgeExtent??90});
  const update=()=>{token=0;if(disposed)return;const current=scroller.scrollTop,delta=current-last;last=current;
    travel=Math.sign(travel)===Math.sign(delta)?travel+delta:delta;
    if(current<4&&minimized){minimized=false;options.surface.move(options.expanded);}
    else if(Math.abs(travel)>(options.threshold??9)&&Math.abs(delta)>.01){const next=travel>0;if(next!==minimized){minimized=next;options.surface.move(next?options.collapsed:options.expanded);}travel=0;}
    options.onScroll?.(current);
  };
  const schedule=()=>{if(!token)token=requestAnimationFrame(update);};scroller.addEventListener('scroll',schedule,{passive:true});
  return{refresh:schedule,dispose:()=>{if(disposed)return;disposed=true;cancelAnimationFrame(token);scroller.removeEventListener('scroll',schedule);renderer.setScrollEdges(previous);}};
}
