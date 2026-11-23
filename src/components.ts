import { bindElement, type ElementBinding } from './dom.js';
import { GlassRenderer, type SurfaceOptions } from './renderer.js';
import{createMaterial}from'./material.js';
export type ControlOptions = Omit<SurfaceOptions,'id'|'rect'> & {id?:string;radius?:number};
export interface Control<T extends HTMLElement> extends ElementBinding {element:T}
let sequence=0;
function bind<T extends HTMLElement>(renderer:GlassRenderer,element:T,target:HTMLElement,options:ControlOptions):Control<T>{
  return {element,...bindElement(renderer,target,{...options,id:options.id??`glass-control-${++sequence}`})};
}
function interaction(renderer:GlassRenderer,element:HTMLElement,binding:ElementBinding,active:(pressed:boolean)=>void):()=>void{
  let held=false;
  const down=(event:PointerEvent|MouseEvent)=>{if(held||event.button!==0||('disabled'in element&&element.disabled))return;held=true;const c=renderer.canvas.getBoundingClientRect();binding.surface.interact(true,(event.clientX-c.left)*renderer.size.width/c.width,(event.clientY-c.top)*renderer.size.height/c.height);active(true);};
  const up=()=>{if(!held)return;held=false;binding.surface.interact(false);active(false);};
  const key=(event:KeyboardEvent)=>{if([' ','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){held=true;binding.surface.interact(true);active(true);}};
  element.addEventListener('pointerdown',down);element.addEventListener('mousedown',down);window.addEventListener('mouseup',up);window.addEventListener('blur',up);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);element.addEventListener('keydown',key);element.addEventListener('keyup',up);element.addEventListener('focusout',up);
  return()=>{element.removeEventListener('pointerdown',down);element.removeEventListener('mousedown',down);window.removeEventListener('mouseup',up);window.removeEventListener('blur',up);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);element.removeEventListener('keydown',key);element.removeEventListener('keyup',up);element.removeEventListener('focusout',up);};
}
export function glassButton(renderer:GlassRenderer,parent:HTMLElement,label:string,options:ControlOptions={}):Control<HTMLButtonElement>{
  const element=document.createElement('button');element.type='button';element.textContent=label;element.className='lg-button';parent.append(element);
  const control=bind(renderer,element,element,options),dispose=control.dispose;control.dispose=()=>{dispose();element.remove();};return control;
}
export{glassToggle}from'./toggle.js';
export type{ToggleControl,ToggleOptions}from'./toggle.js';
export interface SliderControl extends Control<HTMLDivElement>{input:HTMLInputElement;setValue:(value:number)=>void;setPressed:(pressed:boolean)=>void}
export function glassSlider(renderer:GlassRenderer,parent:HTMLElement,label:string,value=50,options:ControlOptions&{min?:number;max?:number;step?:number}={}):SliderControl{
  const min=options.min??0,max=options.max??100,step=options.step??1;
  if(!Number.isFinite(min+max+step+value)||max<=min||step<=0)throw new RangeError('Invalid slider range');
  const element=document.createElement('div');element.className='lg-slider';
  const text=document.createElement('label'),input=document.createElement('input'),output=document.createElement('output'),rail=document.createElement('div'),fill=document.createElement('span'),thumb=document.createElement('span'),backing=document.createElement('span');
  const id=options.id??`glass-control-${++sequence}`;
  input.type='range';input.id=`lg-range-${++sequence}`;input.setAttribute('aria-label',label);input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(value);
  text.htmlFor=input.id;text.textContent=label;output.htmlFor=input.id;rail.className='lg-slider-rail';fill.className='lg-slider-fill';thumb.className='lg-slider-thumb';backing.className='lg-slider-backing';backing.setAttribute('aria-hidden','true');rail.append(backing,fill,thumb,input);element.append(text,output,rail);parent.append(element);
  let rtl=false,paintKey='';
  const place=()=>{rtl=getComputedStyle(element).direction==='rtl';const t=(+input.value-min)/(max-min),p=rtl?1-t:t;thumb.style.left=`calc(${p*100}% - ${p*thumb.offsetWidth}px)`;fill.style.width=`${t*100}%`;output.textContent=input.value;};place();
  const railSource=document.createElement('canvas'),cap=document.createElement('canvas');cap.width=cap.height=4;const cc=cap.getContext('2d')!;cc.fillStyle='#fafbfd';cc.fillRect(0,0,4,4);
  const track=bindElement(renderer,backing,{id:`${id}/track`,layer:options.layer??0,radius:3,material:{variant:'identity'},content:railSource,contrast:false,sizeAdaptation:false,elastic:false,physics:{pressScale:[0,0],attraction:[0,0],impulseStrength:0}});
  const resting=createMaterial({variant:'clear',appearance:'light',frost:.22,refraction:3,highlight:.4,shadow:.16,shadowRadius:1.8,shadowOffset:.8,...options.material});
  const control=bind(renderer,element,thumb,{...options,id,layer:(options.layer??0)+1,radius:12,content:options.content??cap,contrast:options.contrast??false,sizeAdaptation:options.sizeAdaptation??false,physics:{...options.physics,pressScale:options.physics?.pressScale??[.35,.3],attraction:options.physics?.attraction??[0,0],velocityScale:options.physics?.velocityScale??600},material:resting});
  const paint=()=>{const r=control.surface.rect,b=track.surface.rect,w=Math.max(1,backing.offsetWidth),p=Math.max(0,Math.min(w,(r.x+r.width/2-b.x)/b.width*w)),key=`${p.toFixed(1)} ${w} ${rtl} ${input.disabled}`;if(key===paintKey)return;paintKey=key;if(railSource.width!==Math.ceil(w*2)||railSource.height!==12){railSource.width=Math.ceil(w*2);railSource.height=12;}const c=railSource.getContext('2d')!;c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,w,6);c.fillStyle=input.disabled?'#929ba625':'#929ba64d';c.fillRect(0,0,w,6);c.fillStyle=input.disabled?'#007aff66':'#007aff';c.fillRect(rtl?p:0,0,rtl?w-p:p,6);track.surface.content(railSource);};
  const sync=()=>{place();control.refresh(true);paint();};
  const setValue=(next:number)=>{if(!Number.isFinite(next))throw new RangeError('Invalid slider value');input.value=String(Math.max(min,Math.min(max,next)));sync();};input.addEventListener('input',sync);
  const visual=(active:boolean)=>{element.classList.toggle('lg-active',active);control.surface.material(active?{...resting,frost:.04,refraction:14,magnification:.8,edgeWidth:7,highlight:.8}:resting).contentOpacity(input.disabled?.5:active&&!renderer.accessibility.reducedTransparency?.04:options.contentOpacity??1);};
  const setPressed=(pressed:boolean)=>{if(input.disabled)return;control.surface.interact(pressed);visual(pressed);};
  const stopInteraction=interaction(renderer,input,control,visual);
  const observer=new ResizeObserver(()=>{track.refresh();sync();});observer.observe(rail);
  const disabled=new MutationObserver(()=>{element.classList.toggle('lg-disabled',input.disabled);control.surface.interact(false).contentOpacity(input.disabled?.5:options.contentOpacity??1);paintKey='';paint();});disabled.observe(input,{attributes:true,attributeFilter:['disabled']});
  const unsubscribe=renderer.subscribe(paint);paint();
  const dispose=control.dispose;return{...control,input,setValue,setPressed,refresh:(animate=false)=>{track.refresh(animate);place();control.refresh(animate);paint();},dispose:()=>{observer.disconnect();disabled.disconnect();unsubscribe();stopInteraction();input.removeEventListener('input',sync);dispose();track.dispose();element.remove();}};
}
export interface TabsControl extends Control<HTMLDivElement>{select:(index:number)=>void;readonly selectedIndex:number}
export function glassTabs(renderer:GlassRenderer,parent:HTMLElement,labels:readonly string[],options:ControlOptions&{label?:string}={}):TabsControl{
  if(!labels.length)throw new RangeError('At least one navigation item is required');
  const element=document.createElement('div');element.className='lg-tabs';element.role='group';element.setAttribute('aria-label',options.label??'Navigation');
  const selection=document.createElement('span');selection.className='lg-tabs-selection';selection.setAttribute('aria-hidden','true');element.append(selection);
  let selectedIndex=0,control:Control<HTMLDivElement>|undefined;
  const buttons=labels.map(label=>{const b=document.createElement('button');b.type='button';b.textContent=label;element.append(b);return b;});parent.append(element);
  const place=()=>{const b=buttons[selectedIndex];selection.style.left=`${b.offsetLeft}px`;selection.style.top=`${b.offsetTop}px`;selection.style.width=`${b.offsetWidth}px`;selection.style.height=`${b.offsetHeight}px`;};place();
  control=bind(renderer,element,selection,{...options,radius:26,material:{variant:'clear',appearance:'light',frost:.25,refraction:9,...options.material}});
  const select=(index:number)=>{if(!Number.isInteger(index)||index<0||index>=buttons.length)throw new RangeError('Unknown navigation index');selectedIndex=index;buttons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===index));b.tabIndex=i===index?0:-1;});place();control!.refresh(true);};select(0);
  const click=(event:Event)=>{const index=buttons.indexOf((event.target as HTMLElement).closest('button')!);if(index>=0){select(index);element.dispatchEvent(new Event('change',{bubbles:true}));}};
  const key=(event:KeyboardEvent)=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();select(event.key==='Home'?0:event.key==='End'?buttons.length-1:(selectedIndex+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length);buttons[selectedIndex].focus();element.dispatchEvent(new Event('change',{bubbles:true}));};
  element.addEventListener('click',click);element.addEventListener('keydown',key);
  const stopInteraction=interaction(renderer,element,control,active=>control!.surface.material({refraction:active?17:9,frost:active?.08:.25}));
  const observer=new ResizeObserver(()=>{place();control!.refresh();});observer.observe(element);
  const dispose=control.dispose;return{...control,get selectedIndex(){return selectedIndex;},select,refresh:(animate=false)=>{place();control!.refresh(animate);},dispose:()=>{observer.disconnect();stopInteraction();element.removeEventListener('click',click);element.removeEventListener('keydown',key);dispose();element.remove();}};
}
