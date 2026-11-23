import{GlassRenderer,createGlassTextShape,createGlassShapeFromMask,type GlassShape,type SurfaceHandle,type Rect}from'../../src';
import './style.css';
const stage=document.querySelector<HTMLElement>('.stage')!,canvas=stage.querySelector('canvas')!,interaction=stage.querySelector<HTMLElement>('.interaction')!;
const renderer=new GlassRenderer(canvas,{maxPixelRatio:1,measureGpu:true});renderer.resize(800,520);
const wallpaper=document.createElement('canvas');wallpaper.width=800;wallpaper.height=520;const paint=wallpaper.getContext('2d')!;
const gradient=paint.createLinearGradient(0,0,780,520);gradient.addColorStop(0,'#253c6c');gradient.addColorStop(.48,'#8ab7cf');gradient.addColorStop(1,'#eab49a');paint.fillStyle=gradient;paint.fillRect(0,0,800,520);
for(let i=0;i<5;i++){paint.fillStyle=['#1d426a','#698fb4','#becedb','#ecc3ac','#f1e2d5'][i];paint.beginPath();paint.moveTo(-80,420+i*18);paint.bezierCurveTo(200,80+i*33,390,540-i*30,880,140+i*64);paint.lineTo(880,620);paint.lineTo(-80,620);paint.fill();}renderer.setBackdrop(wallpaper);
const environment=document.createElement('canvas');environment.width=256;environment.height=128;const ec=environment.getContext('2d')!,eg=ec.createLinearGradient(0,0,256,0);eg.addColorStop(0,'#172c55');eg.addColorStop(.28,'#e8f4ff');eg.addColorStop(.35,'#6d8baf');eg.addColorStop(.72,'#ecd4b0');eg.addColorStop(1,'#172c55');ec.fillStyle=eg;ec.fillRect(0,0,256,128);renderer.setReflectionSource(environment);
const glyphs=new Map<string,GlassShape>(),clock:SurfaceHandle[]=[];let compact=false;
const time=document.querySelector<HTMLInputElement>('#time')!;
function updateClock(animate=true){
  if(!/^\d{2}:\d{2}$/.test(time.value)){time.setAttribute('aria-invalid','true');return;}time.removeAttribute('aria-invalid');
  document.querySelector('#clock-label')!.setAttribute('aria-label',`Glass clock: ${time.value}`);
  const shapes=[...time.value].map(char=>{if(!glyphs.has(char))glyphs.set(char,createGlassTextShape({text:char,font:'600 170px system-ui',padding:4,resolution:512}));return glyphs.get(char)!;});
  const height=compact?88:155,gap=compact?5:7,widths=shapes.map(s=>s.viewBox[0]/s.viewBox[1]*height),total=widths.reduce((a,b)=>a+b,0)+gap*4;let x=(800-total)/2;
  shapes.forEach((shape,i)=>{const rect={x,y:compact?104:102,width:widths[i],height,radius:0};x+=widths[i]+gap;
    if(!clock[i])clock[i]=renderer.addSurface({id:`clock-${i}`,layer:2,rect,shape,contrast:false,sizeAdaptation:false,interactive:false,elastic:false,material:{variant:'clear',appearance:'light',frost:.015,edgeWidth:8,refraction:12,tintOpacity:.18,highlight:.9,reflection:.3,shadow:.06},physics:{geometry:{frequency:3.3,damping:.95}}});
    else{clock[i].shape(shape,{immediate:!animate});clock[i].move(rect,animate);}
  });
}
updateClock(false);document.fonts.ready.then(()=>updateClock(false));
const names=['Orbit','Notes','Studio','Library'],colors=['#62a7e9','#f1c96f','#d891bb','#7bc1ae'];
function icon(index:number){const c=document.createElement('canvas');c.width=c.height=128;const p=c.getContext('2d')!;p.fillStyle=colors[index];p.beginPath();p.roundRect(0,0,128,128,32);p.fill();p.strokeStyle='#fff';p.lineWidth=6;p.lineCap='round';
  if(index===0){p.beginPath();p.arc(64,64,28,0,Math.PI*2);p.stroke();p.beginPath();p.ellipse(64,64,43,14,-.6,0,Math.PI*2);p.stroke();}
  else if(index===1){for(let y=40;y<96;y+=18){p.beginPath();p.moveTo(35,y);p.lineTo(93,y);p.stroke();}}
  else if(index===2){p.beginPath();p.moveTo(42,32);p.lineTo(96,64);p.lineTo(42,96);p.closePath();p.stroke();}
  else for(const x of[35,74])for(const y of[35,74]){p.fillStyle='#fff';p.fillRect(x,y,20,20);}return c;}
const dock=renderer.addSurface({id:'dock',layer:3,rect:{x:210,y:410,width:380,height:90,radius:32},contrast:false,interactive:false,elastic:false,material:{variant:'regular',appearance:'light',frost:.6,highlight:.65,shadow:.12}});
const buttons:HTMLButtonElement[]=[],icons:SurfaceHandle[]=[],bases:Rect[]=[];const dockElement=document.querySelector<HTMLElement>('.dock')!;
for(let i=0;i<4;i++){
  const rect={x:242+i*84,y:424,width:64,height:64,radius:18};bases.push(rect);icons.push(renderer.addSurface({id:`icon-${i}`,layer:4,rect,material:{variant:'identity'},content:icon(i),contrast:false,elastic:false}));
  const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Open ${names[i]}`);dockElement.append(b);buttons.push(b);b.addEventListener('click',()=>openPanel(i));
  b.addEventListener('focus',()=>magnify(rect.x+32));
}
const content=document.createElement('canvas');content.width=660;content.height=430;
function panelContent(index:number){const c=content.getContext('2d')!;c.clearRect(0,0,660,430);c.fillStyle='#213c54';c.font='500 38px system-ui';c.fillText(names[index],42,67);c.font='20px system-ui';c.fillStyle='#5e7487';c.fillText('Your application content, inside the compositor.',42,104);
  for(let j=0;j<6;j++){const x=42+j%3*194,y=140+Math.floor(j/3)*104;c.fillStyle=['#deebf5','#eee4ef','#f0e6d5'][j%3];c.beginPath();c.roundRect(x,y,176,84,16);c.fill();c.fillStyle='#61788d';c.font='18px system-ui';c.fillText(['Overview','Activity','Collections','Settings','Recent','Favorites'][j],x+14,y+48);}panel.content(content);
}
// A raster alpha shape can be a logo, a painted path, a custom font outline or host-generated mask.
const mask=document.createElement('canvas');mask.width=mask.height=128;const mc=mask.getContext('2d')!;mc.fillStyle='white';mc.beginPath();mc.moveTo(14,64);mc.bezierCurveTo(14,8,114,8,114,64);mc.bezierCurveTo(114,120,14,120,14,64);mc.fill();
const badge=renderer.addSurface({id:'mask-badge',layer:1,rect:{x:367,y:295,width:66,height:66,radius:0},shape:createGlassShapeFromMask({source:mask}),contrast:false,sizeAdaptation:false,material:{variant:'clear',frost:.02,refraction:11,highlight:.8}});
const panel=renderer.addSurface({id:'app-panel',layer:6,rect:bases[0],hidden:true,contrast:false,elastic:false,content,contentOpacity:0,material:{variant:'regular',appearance:'light',frost:.72,tintOpacity:.15,highlight:.65},physics:{geometry:{frequency:3.6,damping:.94},material:{frequency:4,damping:1}}});
let selected=0,opened=false,behind=false,sequence=0;const actions=document.querySelector<HTMLElement>('.panel-actions')!,status=document.querySelector('#status')!;
function openPanel(index:number){selected=index;const revision=++sequence;if(!opened)panel.move(icons[index].state.visualRect,false);opened=true;behind=false;panel.layer(6);document.querySelector('#order')!.setAttribute('aria-pressed','false');panelContent(index);panel.contentOpacity(1).move({x:180,y:120,width:440,height:286,radius:32});panel.show();actions.hidden=false;buttons.forEach((b,i)=>b.setAttribute('aria-expanded',String(i===index)));status.textContent=`${names[index]} panel is open. Reverse the transition or move it behind the glass clock.`;panel.settled().then(()=>{if(sequence===revision&&opened)document.querySelector<HTMLButtonElement>('#close')!.focus({preventScroll:true});});}
function closePanel(){if(!opened)return;opened=false;++sequence;actions.hidden=true;panel.contentOpacity(0).move(bases[selected]);panel.hide();buttons.forEach(b=>b.setAttribute('aria-expanded','false'));buttons[selected].focus({preventScroll:true});status.textContent='Panel closed. The same surface is ready for its next transition.';}
function magnify(x:number|null){icons.forEach((s,i)=>{const b=bases[i],scale=x===null?1:1+.32*Math.exp(-(((x-b.x-32)/70)**2));s.move({...b,x:b.x-(scale-1)*32,y:b.y-(scale-1)*64,width:b.width*scale,height:b.height*scale,radius:b.radius*scale});});}
stage.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*800/r.width,y=(e.clientY-r.top)*520/r.height;if(y>382)magnify(x);else magnify(null);});stage.addEventListener('pointerleave',()=>magnify(null));
const sync=()=>icons.forEach((s,i)=>{const r=s.state.visualRect;Object.assign(buttons[i].style,{left:`${r.x}px`,top:`${r.y}px`,width:`${r.width}px`,height:`${r.height}px`});});renderer.subscribe(sync);sync();
const program=renderer.addAnimation(({time})=>renderer.setReflectionRotation(time*.35),{paused:true});
time.addEventListener('change',()=>updateClock());document.querySelector('#compact')!.addEventListener('click',e=>{compact=!compact;(e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed',String(compact));updateClock();});
document.querySelector('#light')!.addEventListener('click',e=>{if(program.running)program.pause();else program.resume();(e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed',String(program.running));});
document.querySelector('#motion')!.addEventListener('change',e=>renderer.setAccessibility({reducedMotion:(e.target as HTMLInputElement).checked}));
document.querySelector('#close')!.addEventListener('click',closePanel);document.querySelector('#order')!.addEventListener('click',e=>{behind=!behind;panel.layer(behind?1:6);(e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed',String(behind));status.textContent=behind?'The panel is behind the clock. The clock now refracts its completed pixels.':'The panel is above the clock.';});
window.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel();});const resize=new ResizeObserver(()=>{interaction.style.transform=`scale(${stage.clientWidth/800})`;});resize.observe(stage);
window.addEventListener('pagehide',()=>{resize.disconnect();program.cancel();renderer.dispose();},{once:true});
Object.assign(window,{interfaceKit:{renderer,clock,icons,dock,badge,panel,program,open:openPanel,close:closePanel,updateClock,get opened(){return opened;}}});
