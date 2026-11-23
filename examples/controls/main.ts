import{GlassRenderer,glassToggle,glassButton,glassSlider,observeSize}from'../../src';
const canvas=document.querySelector('canvas')!,stage=document.querySelector<HTMLElement>('.stage')!,source=document.createElement('canvas'),renderer=new GlassRenderer(canvas);
const stopResize=observeSize(renderer),background=()=>{
  const r=stage.getBoundingClientRect(),p=Math.min(devicePixelRatio||1,2);source.width=Math.round(r.width*p);source.height=Math.round(r.height*p);const c=source.getContext('2d')!;c.scale(p,p);c.fillStyle='#eef1f3';c.fillRect(0,0,r.width,r.height);
  for(const panel of stage.querySelectorAll<HTMLElement>('.panel')){const a=panel.getBoundingClientRect();c.fillStyle='white';c.beginPath();c.roundRect(a.left-r.left,a.top-r.top,a.width,a.height,16);c.fill();}
  const b=document.querySelector('#motion-board')!.getBoundingClientRect(),x=b.left-r.left,y=b.top-r.top;c.strokeStyle='#e1e9ed';c.lineWidth=1;
  for(let j=0;j<12;j++){c.beginPath();c.moveTo(x+j*80,y+12);c.lineTo(x+j*80,y+132);c.stroke();}
  c.fillStyle='#c6d7dd';c.font='40px Georgia';c.fillText('continuity / continuity / continuity',x+12,y+95);renderer.setBackdrop(source);
};
const settings=document.querySelector<HTMLElement>('#settings')!,controls=[['Wi-Fi',true],['Bluetooth',false],['Airplane mode',false],['Low Power Mode',true]].map(([label,value])=>glassToggle(renderer,settings,String(label),Boolean(value),{onOffLabels:true}));
const slider=glassSlider(renderer,settings,'Volume',55,{id:'settings-volume'});
const preview=glassToggle(renderer,document.querySelector<HTMLElement>('#large')!,'Preview connection',true,{id:'preview-switch',onOffLabels:true,onChange:checked=>{document.querySelector('#value')!.textContent=checked?'On':'Off';}});
const motion=glassButton(renderer,document.querySelector<HTMLElement>('#motion-board')!,'Continuity',{id:'basic-motion',material:{variant:'clear',frost:.12,magnification:1.04},sizeAdaptation:false});motion.element.classList.add('motion-actor');motion.refresh();
let right=false,wide=false,visible=true;
const motionTarget=(animate=true)=>{const box=document.querySelector('#motion-board')!.getBoundingClientRect(),root=canvas.getBoundingClientRect(),w=Math.min(wide?250:170,box.width-30);motion.surface.move({x:box.left-root.left+(right?box.width-w-15:15),y:box.top-root.top+25,width:w,height:wide?90:64,radius:wide?25:32},animate);};
document.querySelector('#move')!.addEventListener('click',()=>{right=!right;motionTarget();});
document.querySelector('#reshape')!.addEventListener('click',()=>{wide=!wide;motionTarget();});
document.querySelector('#reveal')!.addEventListener('click',()=>{visible=!visible;document.querySelector('#reveal')!.textContent=visible?'Hide the glass':'Show the glass';void(visible?motion.surface.show():motion.surface.hide());});
document.querySelector('#disable')!.addEventListener('click',()=>{preview.setDisabled(!preview.disabled);document.querySelector('#disable')!.textContent=preview.disabled?'Enable preview':'Disable preview';});
document.querySelector<HTMLInputElement>('#rtl')!.addEventListener('change',e=>{document.querySelector<HTMLElement>('#large')!.dir=(e.target as HTMLInputElement).checked?'rtl':'ltr';preview.refresh();});
document.querySelector<HTMLInputElement>('#reduce')!.addEventListener('change',e=>renderer.setAccessibility({reducedMotion:(e.target as HTMLInputElement).checked}));
renderer.subscribe(()=>{document.querySelector('#phase')!.textContent=preview.surface.state.pressed>.1?'Interacting':preview.surface.state.moving?'Settling':'Resting';});
const observer=new ResizeObserver(()=>{background();controls.forEach(c=>c.refresh());preview.refresh();motion.refresh();motionTarget(false);});observer.observe(stage);background();
Object.assign(window,{glassControls:{renderer,controls,slider,preview,motion}});
window.addEventListener('pagehide',()=>{observer.disconnect();stopResize();controls.forEach(c=>c.dispose());slider.dispose();preview.dispose();motion.dispose();renderer.dispose();},{once:true});
