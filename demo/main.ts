import {version} from './version';
import {GlassRenderer,bindElement,bindDrag,bindLiquidSelection,bindMediaBackdrop,bindEnvironmentLight,createMaterial,materials,type BackdropSource,type GlassMaterial,type SurfaceHandle} from '../src';
import {paintBackdrop,type BackdropName} from './backdrops';
import {mountMotionStudio} from './motion-studio';
import {markup} from './markup';
import './style.css';
import '../src/style.css';

const icons:Record<string,string>={
glass:'<path d="M5 7.5c0-3 14-3 14 0v9c0 3-14 3-14 0z"/><ellipse cx="12" cy="7.5" rx="7" ry="3"/><path d="M8 12v3"/>',
arrow:'<path d="M7 17 17 7M7 7h10v10"/>',layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',code:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 18"/>',reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
move:'<path d="M12 3v18M3 12h18m-12-6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',plus:'<path d="M12 5v14M5 12h14"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
image:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',sliders:'<path d="M4 7h7m4 0h5M4 17h3m4 0h9"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',check:'<path d="m5 12 4 4L19 6"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',pause:'<path d="M8 5v14M16 5v14"/>',
};
const icon=(name:string,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]??icons.glass}</svg>`;
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const slider=(id:string,label:string,min:number,max:number,value:number,step:number,unit:string)=>`<label class="slider-control" for="${id}"><span>${label}<output id="${id}-value">${value}${unit}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${unit}" /></label>`;
$('#app').innerHTML=markup(icon,slider);mountMotionStudio($('.laboratory'));
const snippet=`import { GlassRenderer, bindElement, bindDrag }\n  from '@liquid-glass/material';\nimport '@liquid-glass/material/style.css';\n\nconst glass = new GlassRenderer(canvas);\nglass.setBackdrop(backgroundCanvas);\nconst button = bindElement(glass, element, {\n  id: 'action', radius: 28,\n  material: { variant: 'regular' },\n});\nconst drag = bindDrag(glass, element, {\n  surface: button.surface,\n});\n// On unmount: drag.dispose(), button.dispose(), glass.dispose().`;
$('#code-example').textContent=snippet;
let toastTimer:ReturnType<typeof setTimeout>;
const toast=(message:string)=>{$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2400);};
for(const[selector,text]of[['#copy-code',snippet],['#copy-install',`npm install ./liquid-glass-material-${version}.tgz`]])$(selector).addEventListener('click',async()=>{try{await navigator.clipboard.writeText(text);toast('Copied to clipboard');}catch{toast('Select and copy the code below');}});

const canvas=$<HTMLCanvasElement>('#material-canvas'),stage=$('#stage'),backdrop=document.createElement('canvas');
const renderer=new GlassRenderer(canvas,{measureGpu:true,onError:error=>{$('.stage-error').hidden=false;$('.stage-error').textContent=error.message;}});
const lightBinding=bindEnvironmentLight(renderer,stage,{strength:.45});
let scene:BackdropName='dawn',fusion=false,menuOpen=false,lightAngle=-2.3,current=createMaterial();
let importedMedia:ReturnType<typeof bindMediaBackdrop>|undefined,mediaUrl='',mediaVideo:HTMLVideoElement|undefined,mediaGeneration=0;
function releaseMedia(){mediaGeneration++;importedMedia?.dispose();importedMedia=undefined;mediaVideo?.pause();mediaVideo?.removeAttribute('src');mediaVideo?.load();mediaVideo=undefined;if(mediaUrl)URL.revokeObjectURL(mediaUrl);mediaUrl='';}
function renderBackdrop(){if(importedMedia){importedMedia.refresh();return;}paintBackdrop(backdrop,stage.clientWidth,stage.clientHeight,scene);renderer.setBackdrop(backdrop);}
function switchScene(next:BackdropName){releaseMedia();scene=next;renderBackdrop();$('#scene-label span').textContent={dawn:'First light',night:'Blue hour',grid:'Test grid',editorial:'Editorial'}[scene];document.querySelectorAll<HTMLElement>('[data-scene]').forEach(el=>{const active=el.dataset.scene===scene;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});}
renderer.resize(stage.clientWidth,stage.clientHeight);renderBackdrop();
const bindings=['#scene-label','#lighting','#dock','#search'].map(selector=>bindElement(renderer,$(selector),{id:selector.slice(1),radius:selector==='#dock'?34:26,material:current}));
const lens=renderer.addSurface({id:'lens',group:'fluid',spacing:32,rect:{x:100,y:200,width:184,height:96,radius:36},material:current,materialize:true});
const fusionLens=renderer.addSurface({id:'fusion-lens',group:'fluid',spacing:32,rect:{x:stage.clientWidth+200,y:220,width:96,height:96,radius:48},material:current});
const menu=renderer.addSurface({id:'menu',rect:{x:stage.clientWidth-70,y:24,width:46,height:46,radius:23},material:current});
const lensEl=$('#lens'),secondEl=$('#fusion-lens'),menuEl=$('#material-menu');
function positionLens(reset=false){const width=Math.min(184,stage.clientWidth*.56),height=96,x=fusion?stage.clientWidth*.5-width*.75:stage.clientWidth*.55-width/2,y=stage.clientHeight*.54-height/2;lens.move({x,y,width,height,radius:36},!reset);fusionLens.move({x:fusion?x+width-24:stage.clientWidth+180,y:y+8,width:80,height:80,radius:40},!reset);}
positionLens(true);
const observer=new ResizeObserver(()=>{if(!stage.clientWidth||!stage.clientHeight)return;renderer.resize(stage.clientWidth,stage.clientHeight);renderBackdrop();positionLens(true);bindings.forEach(b=>b.refresh());updateMenu(false);});observer.observe(stage);
const samples:number[]=[];let chartCounter=0;
renderer.subscribe(stats=>{
  for(const[handle,element]of[[lens,lensEl],[fusionLens,secondEl]]as const){const r=handle.state.visualRect;Object.assign(element.style,{left:`${r.x}px`,top:`${r.y}px`,width:`${r.width}px`,height:`${r.height}px`,color:handle.foreground});}
  menuEl.style.color=menu.foreground;if(!menuEl.hidden){const r=menu.state.visualRect;Object.assign(menuEl.style,{left:`${r.x}px`,top:`${r.y}px`,right:'auto',width:`${r.width}px`,height:`${r.height}px`,borderRadius:`${r.radius}px`,opacity:String(Math.max(0,Math.min(1,(r.width-60)/170)))});}
  for(const[id,key]of[['motion','reducedMotion'],['contrast','increasedContrast'],['transparency','reducedTransparency']]as const)$(`#${id}`).setAttribute('aria-pressed',String(renderer.accessibility[key]));
  $('#cpu-ms').innerHTML=`${stats.cpuMs.toFixed(2)}<small> ms</small>`;$('#gpu-ms').innerHTML=stats.gpuMs===null?'<small>Unavailable</small>':`${stats.gpuMs.toFixed(2)}<small> ms</small>`;$('#draw-calls').textContent=String(stats.drawCalls);$('#texture-mb').innerHTML=`${(stats.textureBytes/1048576).toFixed(1)}<small> MB</small>`;
  samples.push(stats.cpuMs);if(samples.length>48)samples.shift();if(++chartCounter%4===0||samples.length<4)$('#frame-chart').innerHTML=samples.map(n=>`<i style="height:${Math.max(3,Math.min(44,n*10))}px"></i>`).join('');
});
function allMaterials(){lens.material(current);menu.material(current);bindings.forEach(b=>b.surface.material(current));}
const opticalKeys=['refraction','thickness','edgeWidth','bevel','edgeContrast','specularIntensity','specularWidth','scatterRadius','ambientSpill','frost','dispersion','highlight','reflection','ior','cornerPower']as const;
function syncControls(){for(const key of opticalKeys){const input=$<HTMLInputElement>(`#${key}`),value=key==='frost'?Math.round(current[key]*100):current[key];input.value=String(value);$(`#${key}-value`).textContent=`${value}${input.dataset.unit}`;input.style.setProperty('--progress',`${(+input.value-+input.min)/(+input.max-+input.min)*100}%`);}}
function setVariant(next:'regular'|'clear'){current=createMaterial(next==='clear'?materials.clearDimmed:materials.regular);allMaterials();syncControls();$('#variant-note').innerHTML=next==='regular'?'Adaptive, softly scattered.<br>Made for controls and navigation.':'Clear, with localized dimming.<br>Made for rich media backgrounds.';document.querySelectorAll<HTMLElement>('[data-variant]').forEach(el=>{const active=el.dataset.variant===next;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});}
for(const key of opticalKeys)$<HTMLInputElement>(`#${key}`).addEventListener('input',event=>{const input=event.target as HTMLInputElement;current=createMaterial({...current,[key]:+input.value/(key==='frost'?100:1)});allMaterials();syncControls();});
document.querySelectorAll<HTMLElement>('[data-variant]').forEach(el=>el.addEventListener('click',()=>setVariant(el.dataset.variant as 'regular'|'clear')));
document.querySelectorAll<HTMLElement>('[data-scene]').forEach(el=>el.addEventListener('click',()=>switchScene(el.dataset.scene as BackdropName)));
const tintMap={neutral:[1,1,1],blue:[.27,.48,.98],violet:[.62,.39,.86],coral:[.95,.41,.31],green:[.31,.66,.46]}as const;
document.querySelectorAll<HTMLElement>('[data-tint]').forEach(el=>el.addEventListener('click',()=>{const name=el.dataset.tint as keyof typeof tintMap;current=createMaterial({...current,tint:tintMap[name],tintOpacity:name==='neutral'?0:.42});allMaterials();document.querySelectorAll<HTMLElement>('[data-tint]').forEach(b=>{const active=b===el;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.innerHTML=active?icon('check',13):'';});}));
$('#fusion').addEventListener('click',()=>{fusion=!fusion;$('#fusion').setAttribute('aria-pressed',String(fusion));secondEl.hidden=!fusion;if(fusion)positionLens();else fusionLens.move({x:stage.clientWidth+180});});
for(const[id,key]of[['motion','reducedMotion'],['contrast','increasedContrast'],['transparency','reducedTransparency']]as const)$(`#${id}`).addEventListener('click',()=>renderer.setAccessibility({[key]:!renderer.accessibility[key]}));
$<HTMLSelectElement>('#quality').addEventListener('change',event=>renderer.setQuality((event.target as HTMLSelectElement).value as 'low'|'balanced'|'high'));
$('#search').addEventListener('click',()=>switchScene(scene==='grid'?'dawn':'grid'));$('#scene-label').addEventListener('click',()=>{const choices:BackdropName[]=['dawn','night','grid','editorial'];switchScene(choices[(choices.indexOf(scene)+1)%choices.length]);});
$('#lighting').addEventListener('click',()=>{lightAngle+=Math.PI/2;renderer.setLight(Math.cos(lightAngle),Math.sin(lightAngle));toast('Light direction rotated');});
function updateMenu(animate=true){const rect=menuOpen?{x:stage.clientWidth-278,y:24,width:254,height:224,radius:28}:{x:stage.clientWidth-70,y:24,width:46,height:46,radius:23};menuEl.hidden=false;void menu.animateTo(rect,{immediate:!animate}).then(result=>{if(result.finished&&!menuOpen)menuEl.hidden=true;});$('#menu-toggle').setAttribute('aria-expanded',String(menuOpen));$('#menu-toggle').classList.toggle('open',menuOpen);}
$('#menu-toggle').addEventListener('click',()=>{menuOpen=!menuOpen;updateMenu();});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menuOpen){menuOpen=false;updateMenu();$('#menu-toggle').focus();}});
document.querySelectorAll<HTMLElement>('[data-menu]').forEach(el=>el.addEventListener('click',()=>{menuOpen=false;updateMenu();if(el.dataset.menu==='grid')switchScene('grid');else if(el.dataset.menu==='clear')setVariant('clear');else reset();}));
const dockItems=[...document.querySelectorAll<HTMLElement>('[data-dock]')];
const dockSelection=bindLiquidSelection(renderer,$('#dock'),{id:'dock-selection',items:dockItems,vibrancy:false,material:{appearance:'light',tint:[1,1,1],tintOpacity:.15,frost:.16,highlight:.25},onSelect:index=>{const el=dockItems[index];dockItems.forEach(b=>b.classList.toggle('active',b===el));if(el.dataset.dock==='heart')toast('A little love for the material.');else if(el.dataset.dock==='sliders'){menuOpen=!menuOpen;updateMenu();}else switchScene('dawn');}});
function reset(){setVariant('regular');switchScene('dawn');fusion=false;secondEl.hidden=true;$('#fusion').setAttribute('aria-pressed','false');menuOpen=false;updateMenu();renderer.setAccessibility({reducedMotion:undefined,reducedTransparency:undefined,increasedContrast:undefined});lightAngle=-2.3;renderer.setLight(Math.cos(lightAngle),Math.sin(lightAngle));document.querySelector<HTMLElement>('[data-tint="neutral"]')!.click();positionLens();fusionLens.move({x:stage.clientWidth+180});toast('Material reset');}
$('#reset').addEventListener('click',reset);
const dragBindings=[bindDrag(renderer,lensEl,{surface:lens,bounds:()=>({x:8,y:82,width:stage.clientWidth-16,height:stage.clientHeight-174,radius:0})}),bindDrag(renderer,secondEl,{surface:fusionLens})];
for(const[element,handle]of[[lensEl,lens],[secondEl,fusionLens]]as const)element.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const r=handle.rect,step=event.shiftKey?30:10;handle.move({x:r.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),y:r.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)});});
$('#media-file').addEventListener('change',async event=>{
  const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;releaseMedia();const generation=mediaGeneration;mediaUrl=URL.createObjectURL(file);
  try{if(file.type.startsWith('video/')){const video=document.createElement('video');mediaVideo=video;video.muted=true;video.loop=true;video.playsInline=true;video.src=mediaUrl;importedMedia=bindMediaBackdrop(renderer,video,{fit:'cover',onError:e=>toast(e.message)});await video.play();}
    else{const image=new Image();image.src=mediaUrl;await image.decode();if(generation!==mediaGeneration)return;importedMedia=bindMediaBackdrop(renderer,image,{fit:'cover'});}
    if(generation!==mediaGeneration)return;document.querySelectorAll<HTMLElement>('[data-scene]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});$('#scene-label span').textContent=file.name;
  }catch{if(generation!==mediaGeneration)return;releaseMedia();renderBackdrop();toast('Could not decode this media file');}
});
syncControls();Object.assign(window,{glassLab:{renderer,lens,fusionLens,backdrop,switchScene,setVariant,reset,setBackdrop:(source:BackdropSource)=>renderer.setBackdrop(source),dispose:()=>{observer.disconnect();releaseMedia();lightBinding.dispose();dragBindings.forEach(b=>b.dispose());dockSelection.dispose();bindings.forEach(b=>b.dispose());renderer.dispose();}}});
