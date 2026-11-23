import{GlassRenderer,materials,type SurfaceHandle,type Rect}from'../../src';
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const canvas=$<HTMLCanvasElement>('canvas'),board=$('.study'),renderer=new GlassRenderer(canvas),source=document.createElement('canvas'),rearContent=document.createElement('canvas');
source.width=960;source.height=540;rearContent.width=rearContent.height=64;
const rear=renderer.addSurface({id:'rear-content',rect:{x:0,y:0,width:1,height:1,radius:0},material:{variant:'identity'},content:rearContent,contrast:false,sizeAdaptation:false});
const front=renderer.addSurface({id:'front',layer:1,rect:{x:0,y:0,width:1,height:1,radius:0},contrast:{region:{x:.15,y:.25,width:.7,height:.5}}});
const clear=renderer.addSurface({id:'clear',rect:{x:0,y:0,width:1,height:1,radius:0},material:materials.clear});
const dimmed=renderer.addSurface({id:'dimmed',rect:{x:0,y:0,width:1,height:1,radius:0},material:materials.clearDimmed});
const panel=renderer.addSurface({id:'panel',rect:{x:0,y:0,width:1,height:1,radius:0},material:{frost:.4},physics:{geometry:{frequency:3,damping:.94}}});
let lightRear=true,expanded=false,scale=1;
function paint(){const c=source.getContext('2d')!;c.fillStyle='#dce7db';c.fillRect(0,0,960,540);c.fillStyle='#000';c.fillRect(0,0,320,300);c.fillStyle='#fff';c.fillRect(320,0,320,300);const g=c.createLinearGradient(640,0,960,300);g.addColorStop(0,'#f8dea3');g.addColorStop(1,'#fbf9eb');c.fillStyle=g;c.fillRect(640,0,320,300);c.fillStyle='#496858';c.font='64px Georgia';c.fillText('Material in motion.',55,475);c.strokeStyle='#77927c40';for(let y=330;y<540;y+=20){c.beginPath();c.moveTo(0,y);c.lineTo(960,y);c.stroke();}renderer.setBackdrop(source);}
function updateRear(){const c=rearContent.getContext('2d')!;c.fillStyle=lightRear?'white':'black';c.fillRect(0,0,64,64);rear.content(rearContent);}
function rect(x:number,y:number,width:number,height:number,radius:number):Rect{return{x:x*scale,y:y*scale,width:width*scale,height:height*scale,radius:radius*scale};}
function movePanel(animate=true){void panel.move(expanded?rect(52,338,856,142,32):rect(52,350,230,65,32),animate);$('#panel-ink').textContent=expanded?'Collapse the surface ↙':'Expand the surface ↗';$('#panel-ink').setAttribute('aria-expanded',String(expanded));}
function layout(){scale=board.clientWidth/960;renderer.resize(board.clientWidth,board.clientHeight);rear.move(rect(22,70,276,206,22),false);front.move(rect(52,132,216,76,38),false);clear.move(rect(372,132,216,76,38),false);dimmed.move(rect(692,132,216,76,38),false);movePanel(false);}
function place(handle:SurfaceHandle,selector:string){const el=$(selector),r=handle.state.visualRect;Object.assign(el.style,{left:`${r.x}px`,top:`${r.y}px`,width:`${r.width}px`,height:`${r.height}px`,color:handle.foreground});}
const stop=renderer.subscribe(()=>{place(front,'#rear-ink');place(clear,'#clear-ink');place(dimmed,'#dimmed-ink');place(panel,'#panel-ink');for(const[id,s]of[['rear',front],['clear',clear],['dimmed',dimmed]]as const){const c=s.state.contrast;$(`#${id}-result`).textContent=`${c.source} · ${c.foreground} ink\n${c.ratio?.toFixed(2)??'—'}:1 · protection ${(c.protection*100).toFixed(0)}%`;}const m=panel.state;$('#response').textContent=`BASE → DISPLAYED\nThickness ${m.baseMaterial.thickness.toFixed(1)} → ${m.material.thickness.toFixed(1)}  |  Scattering radius ${m.baseMaterial.scatterRadius.toFixed(1)} → ${m.material.scatterRadius.toFixed(1)}  |  Shadow radius ${m.baseMaterial.shadowRadius.toFixed(1)} → ${m.material.shadowRadius.toFixed(1)}\nBevel ${m.material.bevel}  |  Edge intensity ${m.material.specularIntensity.toFixed(2)}  |  Edge width ${m.material.specularWidth.toFixed(1)} px`;});
$('#swap').onclick=()=>{lightRear=!lightRear;updateRear();};$('#rear-ink').onclick=()=>{lightRear=!lightRear;updateRear();};$('#panel-ink').onclick=()=>{expanded=!expanded;movePanel();};
$<HTMLInputElement>('#adaptive').onchange=e=>{panel.sizeAdaptation((e.target as HTMLInputElement).checked?{}:false);};
for(const[id,key]of[['intensity','specularIntensity'],['width','specularWidth']]as const)$<HTMLInputElement>(`#${id}`).oninput=e=>{const value=Number((e.target as HTMLInputElement).value);for(const s of[front,clear,dimmed,panel])s.material({[key]:value},false);};
paint();updateRear();layout();const observer=new ResizeObserver(layout);observer.observe(board);
Object.assign(window,{glassReadability:{renderer,front,clear,dimmed,panel,rear}});
window.addEventListener('pagehide',()=>{stop();observer.disconnect();renderer.dispose();},{once:true});
