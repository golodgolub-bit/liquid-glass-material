import {capturePointer,type PointerInput} from './pointer.js';
import type{GlassRenderer,SurfaceHandle}from'./renderer.js';
import type{Rect}from'./geometry.js';
import type{GlassMaterial}from'./material.js';
export interface LiquidSelectionOptions{id:string;items:readonly HTMLElement[];initialIndex?:number;vibrancy?:boolean;material?:Partial<GlassMaterial>;onSelect?:(index:number)=>void}
export interface LiquidSelection{surface:SurfaceHandle;readonly selectedIndex:number;select:(index:number,animate?:boolean)=>void;refresh:()=>void;dispose:()=>void}
/** A touch-tracking lens lifts off a navigation rail, magnifies its foreground, then snaps back. */
export function bindLiquidSelection(renderer:GlassRenderer,element:HTMLElement,options:LiquidSelectionOptions):LiquidSelection{
  if(!options.items.length)throw new RangeError('Selection needs at least one item');
  let index=options.initialIndex??0,dragging=false,disposed=false,rects:Rect[]=[];
  if(!Number.isInteger(index)||index<0||index>=options.items.length)throw new RangeError('Invalid selection index');
  const measure=()=>{const c=renderer.canvas.getBoundingClientRect(),sx=renderer.size.width/c.width,sy=renderer.size.height/c.height;rects=options.items.map(item=>{const r=item.getBoundingClientRect();return{x:(r.left-c.left)*sx,y:(r.top-c.top)*sy,width:r.width*sx,height:r.height*sy,radius:r.height*sy/2};});};measure();
  const resting={variant:'clear' as const,appearance:'dark' as const,frost:.08,refraction:7,magnification:1,tint:[.015,.02,.03] as const,tintOpacity:.4,shadow:.06,...options.material};
  const surface=renderer.addSurface({id:options.id,rect:rects[index],vibrancy:options.vibrancy??true,layer:1,material:resting});
  const rest=()=>surface.material(resting);
  const select=(next:number,animate=true)=>{if(!Number.isInteger(next)||next<0||next>=rects.length)throw new RangeError('Invalid selection index');index=next;options.items.forEach((item,i)=>{item.setAttribute('aria-pressed',String(i===index));item.tabIndex=i===index?0:-1;});surface.move(rects[index],animate);rest();options.onSelect?.(index);};select(index,false);
  const point=(event:PointerInput)=>{const c=renderer.canvas.getBoundingClientRect();return[(event.clientX-c.left)*renderer.size.width/c.width,(event.clientY-c.top)*renderer.size.height/c.height]as const;};
  const follow=(event:PointerInput)=>{const[x,y]=point(event),first=rects[0],last=rects.at(-1)!,base=rects[index],w=base.width*1.12,h=base.height*1.48;
    const px=Math.max(first.x+first.width*.25,Math.min(last.x+last.width*.75,x));
    surface.move({x:px-w/2,y:first.y+first.height/2-h/2-3,width:w,height:h,radius:h/2});surface.interact(true,x,y);
  };
  const down=(event:PointerInput)=>{measure();dragging=true;surface.motion({frequency:14,damping:1});surface.material({frost:.025,refraction:15,magnification:1.16,tintOpacity:0});follow(event);};
  const up=(event:PointerInput)=>{if(!dragging)return;follow(event);dragging=false;const[x]=point(event);let best=0,distance=Infinity;rects.forEach((r,i)=>{const d=Math.abs(x-r.x-r.width/2);if(d<distance){distance=d;best=i;}});surface.motion({frequency:4.6,damping:.8}).interact(false);select(best);};
  const cancel=()=>{if(!dragging)return;dragging=false;surface.motion({frequency:4.6,damping:.8}).interact(false);select(index);};
  const stopPointer=capturePointer(element,{start:down,move:event=>{if(dragging)follow(event);},end:up,cancel});
  const key=(event:KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();select(event.key==='Home'?0:event.key==='End'?rects.length-1:(index+(event.key==='ArrowRight'?1:-1)+rects.length)%rects.length);options.items[index].focus();}};
  const click=(event:MouseEvent)=>{if(event.detail!==0)return;const selected=options.items.findIndex(item=>item.contains(event.target as Node));if(selected>=0)select(selected);};
  const refresh=()=>{if(disposed)return;measure();if(!dragging)surface.move(rects[index],false);};
  element.addEventListener('keydown',key);element.addEventListener('click',click);
  const observer=new ResizeObserver(refresh);observer.observe(element);observer.observe(renderer.canvas);
  return{surface,get selectedIndex(){return index;},select,refresh,dispose:()=>{if(disposed)return;disposed=true;observer.disconnect();stopPointer();element.removeEventListener('keydown',key);element.removeEventListener('click',click);surface.remove();}};
}
