import { bindElement } from './dom.js';
import type { GlassRenderer } from './renderer.js';
import type { Control,ControlOptions } from './components.js';
import type { MotionResult } from './motion.js';
export interface SearchControl extends Control<HTMLDivElement>{input:HTMLInputElement;expand:()=>Promise<MotionResult>;collapse:()=>Promise<MotionResult>;readonly expanded:boolean}
export function glassSearch(renderer:GlassRenderer,parent:HTMLElement,options:ControlOptions&{placeholder?:string;width?:number}={}):SearchControl{
  const element=document.createElement('div');element.className='lg-search';element.style.width='52px';
  const button=document.createElement('button');button.type='button';button.className='lg-search-trigger';button.textContent='⌕';button.setAttribute('aria-label','Expand search');button.setAttribute('aria-expanded','false');
  const input=document.createElement('input');input.type='search';input.placeholder=options.placeholder??'Search';input.setAttribute('aria-label',options.placeholder??'Search');input.hidden=true;
  const cancel=document.createElement('button');cancel.type='button';cancel.className='lg-search-cancel';cancel.textContent='×';cancel.setAttribute('aria-label','Close search');cancel.hidden=true;
  element.append(button,input,cancel);parent.append(element);const binding=bindElement(renderer,element,{...options,id:options.id??`search-${crypto.randomUUID()}`,radius:26});let expanded=false,disposed=false;
  const expand=async()=>{expanded=true;input.hidden=cancel.hidden=false;button.setAttribute('aria-expanded','true');element.style.width=`${Math.min(options.width??340,renderer.size.width-36)}px`;binding.refresh(true);const result=await binding.surface.settled();if(result.finished&&expanded&&!disposed)input.focus({preventScroll:true});return result;};
  const collapse=async()=>{expanded=false;button.setAttribute('aria-expanded','false');element.style.width='52px';binding.refresh(true);const result=await binding.surface.settled();if(result.finished&&!expanded&&!disposed){input.hidden=cancel.hidden=true;button.focus({preventScroll:true});}return result;};
  const click=()=>{if(!expanded)void expand();};const close=()=>void collapse();const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();void collapse();}};
  button.addEventListener('click',click);cancel.addEventListener('click',close);input.addEventListener('keydown',key);
  const stop=renderer.subscribe(()=>{const progress=Math.max(0,Math.min(1,(binding.surface.state.visualRect.width-60)/170));input.style.opacity=String(progress);cancel.style.opacity=String(progress);});
  return{element,...binding,input,get expanded(){return expanded;},expand,collapse,dispose:()=>{if(disposed)return;disposed=true;stop();button.removeEventListener('click',click);cancel.removeEventListener('click',close);input.removeEventListener('keydown',key);binding.dispose();element.remove();}};
}
