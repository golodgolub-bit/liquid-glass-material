import{GlassRenderer,bindDrag,observeSize}from'../../src';
const stage=document.querySelector<HTMLElement>('.stage')!,canvas=document.querySelector<HTMLCanvasElement>('canvas')!,button=document.querySelector<HTMLButtonElement>('.lens')!,play=document.querySelector<HTMLButtonElement>('#play')!;
const renderer=new GlassRenderer(canvas,{measureGpu:true}),background=document.createElement('canvas'),mask=document.createElement('canvas'),environment=document.createElement('canvas');
const stopSize=observeSize(renderer);
environment.width=512;environment.height=256;const ec=environment.getContext('2d')!,eg=ec.createLinearGradient(0,0,512,0);eg.addColorStop(0,'#0b2046');eg.addColorStop(.25,'#75b5f7');eg.addColorStop(.42,'#f3f8ff');eg.addColorStop(.6,'#4d527f');eg.addColorStop(.82,'#f7a783');eg.addColorStop(1,'#0b2046');ec.fillStyle=eg;ec.fillRect(0,0,512,256);renderer.setReflectionSource(environment);
const lens=renderer.addSurface({id:'programmable',vibrancy:true,rect:{x:140,y:160,width:200,height:84,radius:42},material:{variant:'clear',appearance:'light',frost:.02,magnification:1.04,refraction:20,edgeWidth:4,highlight:.25,reflection:.65,shadow:.035}});
function paint(){
  const w=stage.clientWidth,h=stage.clientHeight,ratio=Math.min(devicePixelRatio,1.5);background.width=mask.width=Math.round(w*ratio);background.height=mask.height=Math.round(h*ratio);
  const c=background.getContext('2d')!,m=mask.getContext('2d')!;c.scale(ratio,ratio);m.scale(ratio,ratio);const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#d6e7f0');g.addColorStop(1,'#f4e4d9');c.fillStyle=g;c.fillRect(0,0,w,h);
  for(const context of[c,m]){context.fillStyle=context===m?'white':'#263c56';context.font=`400 ${Math.min(66,w*.085)}px Georgia,serif`;context.fillText('Glass is',w*.12,h*.43);context.fillText('programmable.',w*.12,h*.43+Math.min(76,w*.098));}
  renderer.resize(w,h);renderer.setBackdrop(background);renderer.setVibrancySource(mask,{color:[.03,.38,1]});lens.move({x:w*.45-100,y:h*.5-42},false);
}
const resize=new ResizeObserver(paint);resize.observe(stage);paint();
renderer.subscribe(stats=>{const r=lens.state.visualRect;Object.assign(button.style,{left:`${r.x}px`,top:`${r.y}px`,width:`${r.width}px`,height:`${r.height}px`,borderRadius:`${r.radius}px`});document.querySelector('#stats')!.textContent=`${stats.cpuMs.toFixed(2)} ms CPU · ${stats.gpuMs?.toFixed(2)??'—'} ms GPU · отражение: ${stats.reflectionUploads} upload · ${renderer.accessibility.reducedMotion?'Reduced Motion':'анимация разрешена'}`;});
const animation=renderer.addAnimation(({time})=>{const w=renderer.size.width,h=renderer.size.height;lens.move({x:(w-200)/2+Math.sin(time*.7)*Math.max(20,w*.2),y:h*.5-42+Math.sin(time*1.1)*32},false);renderer.setReflectionRotation(time*.35);renderer.setLight(-.65+Math.sin(time*.6)*.25,-.76,false);},{paused:true});
function syncPlay(){play.setAttribute('aria-pressed',String(animation.running));play.textContent=animation.running?'Приостановить':'Запустить движение';}
play.addEventListener('click',()=>{animation.running?animation.pause():animation.resume();syncPlay();});
const drag=bindDrag(renderer,button,{surface:lens,onStart:()=>{animation.pause();syncPlay();}});
document.querySelector<HTMLInputElement>('#reflection')!.addEventListener('input',e=>lens.material({reflection:+(e.target as HTMLInputElement).value},false));
document.querySelector<HTMLInputElement>('#edge')!.addEventListener('input',e=>lens.material({edgeWidth:+(e.target as HTMLInputElement).value},false));
let reflected=true;document.querySelector('#environment')!.addEventListener('click',e=>{reflected=!reflected;renderer.setReflectionSource(reflected?environment:null);const target=e.currentTarget as HTMLButtonElement;target.setAttribute('aria-pressed',String(reflected));target.textContent=`Карта окружения: ${reflected?'вкл':'выкл'}`;});
Object.assign(window,{programmaticGlass:{renderer,lens,animation,dispose:()=>{animation.cancel();drag.dispose();resize.disconnect();stopSize();renderer.dispose();}}});
