import { GlassRenderer, type SurfaceHandle } from './renderer.js';
import type { GlassMaterial } from './material.js';
import type { Rect } from './geometry.js';
import type { MotionResult } from './motion.js';
import {createGlassShape} from './shape.js';
import {bindLiquidHighlight} from './highlight.js';

export interface PanelOptions {
  id?:string; parent?:HTMLElement; width?:number; height?:number; radius?:number;
  material?:Partial<GlassMaterial>; destination?:()=>Rect;
  /** Rounded transient contour during menu expansion and retraction. */
  liquidMorph?:boolean;
}
export interface PanelController {
  element:HTMLDivElement;surface:SurfaceHandle;readonly isOpen:boolean;
  open:()=>Promise<MotionResult>;close:()=>Promise<MotionResult>;toggle:()=>Promise<MotionResult>;
  refresh:()=>void;dispose:()=>void;
}
let sequence=0;
/** One optical surface morphs from the actual source control into the presentation. */
function panel(renderer:GlassRenderer,anchor:HTMLElement,content:HTMLElement,role:'menu'|'dialog',options:PanelOptions):PanelController{
  const parent=options.parent??renderer.canvas.parentElement!;
  const element=document.createElement('div');element.className='lg-panel';element.role=role;element.hidden=true;element.id=options.id??`lg-panel-${++sequence}`;element.append(content);parent.append(element);
  if(role==='dialog'){element.setAttribute('aria-modal','true');element.setAttribute('aria-label',content.getAttribute('aria-label')??'Details');}
  const original={opacity:anchor.style.opacity,pointerEvents:anchor.style.pointerEvents,expanded:anchor.getAttribute('aria-expanded'),haspopup:anchor.getAttribute('aria-haspopup')};
  anchor.setAttribute('aria-haspopup',role);anchor.setAttribute('aria-controls',element.id);anchor.setAttribute('aria-expanded','false');
  const measure=():Rect=>{const c=renderer.canvas.getBoundingClientRect(),a=anchor.getBoundingClientRect(),sx=renderer.size.width/c.width,sy=renderer.size.height/c.height;return{x:(a.left-c.left)*sx,y:(a.top-c.top)*sy,width:a.width*sx,height:a.height*sy,radius:Math.min(a.width,a.height)/2};};
  const destination=():Rect=>{
    if(options.destination)return options.destination();
    const a=measure(),width=Math.min(options.width??258,renderer.size.width-24),height=Math.min(options.height??228,renderer.size.height-24);
    return{x:Math.max(12,Math.min(renderer.size.width-width-12,a.x+a.width-width)),y:Math.max(12,Math.min(renderer.size.height-height-12,a.y)),width,height,radius:options.radius??28};
  };
  let sourceRect=measure(),targetRect=destination();
  const surface=renderer.addSurface({id:element.id,rect:sourceRect,material:options.material,elastic:false});
  let isOpen=false,disposed=false,returnFocus=false,transition=0;
  const liquid=role==='menu'&&(options.liquidMorph??true);
  const transient=liquid?createGlassShape({path:'M 50 3 C 69 5 91 30 95 57 C 99 83 81 97 51 97 C 19 97 1 81 6 54 C 9 32 34 4 50 3 Z'}):null;
  let contourReturning=false,opening=false;
  const focusables=()=>Array.from(content.querySelectorAll<HTMLElement>('button:not([disabled]),input,a[href],[tabindex="0"]'));
  const sync=()=>{
    if(disposed)return;const state=surface.state,r=state.visualRect,a=sourceRect,end=targetRect;
    const travel=Math.hypot(end.width-a.width,end.height-a.height);
    const progress=travel<.01?+isOpen:Math.max(0,Math.min(1,Math.hypot(r.width-a.width,r.height-a.height)/travel));
    if(liquid&&!contourReturning&&(opening?progress>.26&&progress<.96:progress<.6)){
      contourReturning=true;void surface.shape(null,{spring:{frequency:opening?4.2:5.5,damping:1}});
    }
    Object.assign(element.style,{left:`${r.x}px`,top:`${r.y}px`,width:`${r.width}px`,height:`${r.height}px`,borderRadius:`${r.radius}px`,color:surface.foreground});
    content.style.opacity=String(Math.max(0,Math.min(1,(progress-.22)/.62)));content.style.translate=`0 ${(1-progress)*10}px`;content.style.filter=progress<.96?`blur(${(1-progress)*3}px)`:'';
    anchor.style.opacity=String(Math.max(0,1-progress*4));anchor.style.pointerEvents=isOpen?'none':original.pointerEvents;
  };
  const unsubscribe=renderer.subscribe(sync);
  const open=async()=>{
    if(disposed)return{finished:false};const ticket=++transition;sourceRect=measure();targetRect=destination();isOpen=true;opening=true;contourReturning=false;element.hidden=false;anchor.setAttribute('aria-expanded','true');
    if(liquid&&transient)void surface.shape(transient,{spring:{frequency:6,damping:1}});
    let result=await surface.animateTo(targetRect);if(!result.finished&&ticket===transition&&!disposed)result=await surface.settled();if(result.finished&&ticket===transition&&isOpen&&!disposed)focusables()[0]?.focus({preventScroll:true});return result;
  };
  const close=async()=>{
    if(disposed)return{finished:false};const ticket=++transition;returnFocus=element.contains(document.activeElement);isOpen=false;opening=false;contourReturning=false;anchor.setAttribute('aria-expanded','false');
    if(liquid&&transient)void surface.shape(transient,{spring:{frequency:5.5,damping:1}});
    sourceRect=measure();let result=await surface.animateTo(sourceRect);if(!result.finished&&ticket===transition&&!disposed)result=await surface.settled();if(result.finished&&ticket===transition&&!isOpen&&!disposed){element.hidden=true;anchor.style.opacity=original.opacity;anchor.style.pointerEvents=original.pointerEvents;if(returnFocus)anchor.focus({preventScroll:true});}return result;
  };
  const toggle=()=>isOpen?close():open();
  const refresh=()=>{if(!disposed){const source=measure(),target=destination();const same=(a:Rect,b:Rect)=>(Object.keys(a)as(keyof Rect)[]).every(k=>Math.abs(a[k]-b[k])<.001);if(same(source,sourceRect)&&same(target,targetRect))return;sourceRect=source;targetRect=target;surface.move(isOpen?targetRect:sourceRect,false);}};
  const outside=(event:PointerEvent)=>{if(isOpen&&!element.contains(event.target as Node)&&!anchor.contains(event.target as Node))void close();};
  const key=(event:KeyboardEvent)=>{
    if(!isOpen)return;
    if(event.key==='Escape'){event.preventDefault();void close();return;}
    const items=focusables(),current=items.indexOf(document.activeElement as HTMLElement);
    if(role==='menu'&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?items.length-1:(current+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus();}
    if(role==='dialog'&&event.key==='Tab'&&items.length){event.preventDefault();items[(current+(event.shiftKey?-1:1)+items.length)%items.length]?.focus();}
  };
  const click=()=>void toggle();anchor.addEventListener('click',click);document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
  const press=(event:PointerEvent)=>{const c=renderer.canvas.getBoundingClientRect();surface.interact(true,event.clientX-c.left,event.clientY-c.top);};const release=()=>surface.interact(false);
  anchor.addEventListener('pointerdown',press);window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  const observer=new ResizeObserver(refresh);observer.observe(anchor);observer.observe(renderer.canvas);
  return{element,surface,get isOpen(){return isOpen;},open,close,toggle,refresh,dispose:()=>{
    if(disposed)return;disposed=true;observer.disconnect();unsubscribe();anchor.removeEventListener('click',click);anchor.removeEventListener('pointerdown',press);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);surface.remove();element.remove();anchor.style.opacity=original.opacity;anchor.style.pointerEvents=original.pointerEvents;
    for(const [key,value]of [['aria-expanded',original.expanded],['aria-haspopup',original.haspopup]] as const){if(value===null)anchor.removeAttribute(key);else anchor.setAttribute(key,value);}anchor.removeAttribute('aria-controls');
  }};
}
export interface MenuItem {label:string;onSelect?:()=>void;disabled?:boolean;separator?:boolean}
export function glassPopover(renderer:GlassRenderer,anchor:HTMLElement,items:readonly MenuItem[],options:PanelOptions={}):PanelController{
  const content=document.createElement('div');content.className='lg-menu-content';
  let controller:PanelController;
  for(const item of items){if(item.separator){const hr=document.createElement('hr');content.append(hr);}const button=document.createElement('button');button.type='button';button.role='menuitem';button.textContent=item.label;button.disabled=item.disabled??false;button.addEventListener('click',()=>{void controller.close();item.onSelect?.();});content.append(button);}
  controller=panel(renderer,anchor,content,'menu',{height:items.length*46+30,...options});
  const enabled=[...content.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  const highlight=enabled.length?bindLiquidHighlight(renderer,content,{id:`${controller.surface.id}-highlight`,items:enabled}):null;
  const stop=renderer.subscribe(()=>{if(!controller.isOpen)highlight?.select(-1);else if(controller.surface.state.moving)highlight?.refresh();});
  const dispose=controller.dispose;return{...controller,get isOpen(){return controller.isOpen;},dispose:()=>{stop();highlight?.dispose();dispose();}};
}
export interface SheetController extends PanelController {setDetent:(detent:'medium'|'large')=>Promise<MotionResult>}
export function glassSheet(renderer:GlassRenderer,anchor:HTMLElement,content:HTMLElement,options:PanelOptions={}):SheetController{
  content.classList.add('lg-sheet-content');let detent:'medium'|'large'='medium';
  const controller=panel(renderer,anchor,content,'dialog',{...options,destination:()=>{const size=renderer.size,h=detent==='large'?size.height-18:Math.min(options.height??320,size.height*.68);return{x:18,y:size.height-h-18,width:size.width-36,height:h,radius:detent==='large'?22:36};}});
  return{...controller,get isOpen(){return controller.isOpen;},setDetent:async(next)=>{detent=next;controller.surface.material({frost:next==='large'?.96:.68,tintOpacity:next==='large'?.65:0});return controller.open();}};
}
