import {GlassRenderer,bindDrag,GlassEffectContainer,createGlassShape}from'../../src';
const canvas=document.querySelector('canvas')!,handle=document.querySelector<HTMLButtonElement>('.glass-handle')!,board=document.querySelector<HTMLElement>('.artboard')!;
const params=new URLSearchParams(location.search),scenes=['paper','spectrum','interfaces'];
if(params.has('capture'))document.documentElement.classList.add('capture');
const renderer=new GlassRenderer(canvas,{maxPixelRatio:1}),backdrop=document.createElement('canvas');
const lens=renderer.addSurface({id:'gallery-lens',sizeAdaptation:false,contrast:false,rect:{x:440,y:415,width:560,height:144,radius:72},material:{variant:'clear',appearance:'light',frost:.025,thickness:22,refraction:19,edgeWidth:15,bevel:0,edgeContrast:.12,highlight:.5,reflection:.16,abbeNumber:58},vibrancy:true});
const effects=new GlassEffectContainer(renderer,{namespace:'gallery-controls',sizeAdaptation:false,spacing:24,layer:-1,material:{appearance:'light',frost:.4,edgeWidth:10,edgeContrast:.12}});
let scene=params.get('scene')??'paper',expanded=true;
const font=(c:CanvasRenderingContext2D,size:number,family='Georgia',weight=400)=>{c.font=`${weight} ${size}px ${family}`;};
function tracked(c:CanvasRenderingContext2D,text:string,x:number,y:number,spacing=3){for(const character of text){c.fillText(character,x,y);x+=c.measureText(character).width+spacing;}}
function paint(){
  const w=1600,h=1000;backdrop.width=w;backdrop.height=h;
  const c=backdrop.getContext('2d')!;
  c.fillStyle=scene==='spectrum'?'#101c2c':'#f2eee4';c.fillRect(0,0,w,h);
  if(scene==='paper'){
    const light=c.createLinearGradient(0,0,w,h);light.addColorStop(0,'#f8f5ec');light.addColorStop(.7,'#ece7da');light.addColorStop(1,'#e2dece');c.fillStyle=light;c.fillRect(0,0,w,h);
    let seed=7;for(let i=0;i<40000;i++){seed=(seed*16807)%2147483647;const x=seed%w;seed=(seed*16807)%2147483647;const y=seed%h;c.fillStyle=i%2?'#7e755207':'#ffffff25';c.fillRect(x,y,1,1);}
    c.fillStyle='#666f65';font(c,13,'Arial');tracked(c,'MATERIAL STUDY / 001',100,94);tracked(c,'LIGHT · TYPE · PAPER',1190,94,2);
    c.strokeStyle='#717c5a45';c.beginPath();c.moveTo(100,122);c.lineTo(1500,122);c.stroke();
    c.fillStyle='#243d36';font(c,108);c.fillText('Refraction,',100,285);c.fillText('in plain sight.',100,395);
    c.fillStyle='#939886';font(c,17,'Arial');c.fillText('A transparent material with a life of its own.',104,448);
    c.fillStyle='#294237';font(c,29);const text=['It is a truth universally acknowledged, that a single man in','possession of a good fortune, must be in want of a wife.','However little known the feelings or views of such a man','may be on his first entering a neighbourhood, this truth','is so well fixed in the minds of the surrounding families,','that he is considered the rightful property of some one','or other of their daughters.'];
    text.forEach((line,i)=>c.fillText(line,102,566+i*43));
    c.fillStyle='#7a816f';font(c,12,'Arial');tracked(c,'JANE AUSTEN — PRIDE AND PREJUDICE, 1813',102,930,1.4);
    c.fillStyle='#768271';font(c,12,'Arial');tracked(c,'CLEAR / REALTIME WEBGL 2',1180,930,1.5);
  }else if(scene==='spectrum'){
    const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#0f2137');g.addColorStop(.48,'#214753');g.addColorStop(1,'#a6b0a0');c.fillStyle=g;c.fillRect(0,0,w,h);
    for(const [x,y,r,color]of [[1250,250,480,'#ffc47c'],[430,710,600,'#589bab'],[1400,880,480,'#7799e9']]as const){const glow=c.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,color+'b0');glow.addColorStop(1,color+'00');c.fillStyle=glow;c.fillRect(0,0,w,h);}
    c.fillStyle='#e9f1e9';font(c,13,'Arial');tracked(c,'MATERIAL STUDY / 002',100,94);font(c,128);c.fillText('Light has',100,300);c.fillText('a softer side.',100,432);
    c.fillStyle='#ffffffcc';font(c,18,'Arial');c.fillText('Refraction. Reflection. A continuous response.',106,510);
    c.strokeStyle='#e9f1e955';c.lineWidth=1;for(let i=0;i<21;i++){c.beginPath();c.moveTo(100,620+i*9);c.bezierCurveTo(500,560+i*13,850,910-i*9,1500,700+i*8);c.stroke();}
    font(c,12,'Arial');c.fillStyle='#e9f1e9';tracked(c,'SPECTRAL INDICES / PROGRAMMABLE OPTICS',100,930,1.5);
  }else{
    const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#e6ebe8');g.addColorStop(1,'#ccd5d1');c.fillStyle=g;c.fillRect(0,0,w,h);
    c.fillStyle='#4c625a';font(c,13,'Arial');tracked(c,'MATERIAL STUDY / 003',100,94);font(c,112);c.fillText('One material.',100,286);c.fillText('Many possibilities.',100,404);
    font(c,18,'Arial');c.fillText('Stable identities. Shared contours. Uninterrupted motion.',106,466);

    c.strokeStyle='#a1afa7';c.beginPath();c.moveTo(100,850);c.lineTo(1500,850);c.stroke();font(c,12,'Arial');tracked(c,'SHARED CONTAINERS / MATCHED GEOMETRY',100,930,1.5);
  }
  renderer.resize(board.clientWidth,board.clientHeight);renderer.setBackdrop(backdrop);
  // No recoloring for the editorial studies: all visible distortion comes from the material.
  renderer.setVibrancySource(null);
  const scale=renderer.size.width/1600;
  const position=scene==='paper'?{x:430,y:572,width:655,height:148,radius:74}:scene==='spectrum'?{x:860,y:625,width:420,height:250,radius:125}:{x:760,y:690,width:430,height:180,radius:90};
  lens.shape(scene==='spectrum'?createGlassShape({path:'M 70 35 C 140 -10 255 10 320 35 C 380 60 410 120 390 170 C 365 230 260 240 170 226 C 60 215 10 173 15 118 C 17 80 39 51 70 35 Z',viewBox:[420,250]}):null,{immediate:true});
  lens.material({variant:'clear',appearance:scene==='spectrum'?'dark':'light',frost:.025,thickness:22,refraction:19,edgeWidth:15,bevel:0,edgeContrast:.12,highlight:.5,reflection:scene==='spectrum'?.32:.16,abbeNumber:58},false);
  lens.move(Object.fromEntries(Object.entries(position).map(([k,v])=>[k,v*scale])),false);
  void effects.reconcile(scene==='interfaces'?[0,1,2].slice(0,expanded?3:1).map(i=>({id:String(i),rect:{x:(100+i*230)*scale,y:650*scale,width:220*scale,height:100*scale,radius:50*scale}})):[],{animate:false});
  if(scene==='interfaces')for(const [i,label]of ['EXPLORE','COLLECT','CREATE'].entries()){const ink=document.createElement('canvas');ink.width=440;ink.height=200;const c=ink.getContext('2d')!;c.fillStyle='#405d4d';font(c,26,'Arial');c.textAlign='center';c.fillText(label,220,112);effects.get(String(i))?.content(ink);}
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-scene]'))button.setAttribute('aria-pressed',String(button.dataset.scene===scene));
}
renderer.subscribe(()=>{const r=lens.state.visualRect;Object.assign(handle.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px',borderRadius:r.radius+'px'});});
const drag=bindDrag(renderer,handle,{surface:lens});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-scene]'))button.addEventListener('click',()=>{scene=button.dataset.scene!;paint();});
const observer=new ResizeObserver(paint);observer.observe(board);paint();
handle.addEventListener('keydown',event=>{const d=event.shiftKey?20:4;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const r=lens.state.rect;lens.move({x:r.x+(event.key==='ArrowRight'?d:event.key==='ArrowLeft'?-d:0),y:r.y+(event.key==='ArrowDown'?d:event.key==='ArrowUp'?-d:0)});}});
Object.assign(window,{glassGallery:{renderer,lens,effects,setExpanded(value:boolean){expanded=value;const s=renderer.size.width/1600;return effects.reconcile([0,1,2].slice(0,expanded?3:1).map(i=>({id:String(i),rect:{x:(100+i*230)*s,y:650*s,width:220*s,height:100*s,radius:50*s}})));},dispose(){observer.disconnect();drag.dispose();effects.dispose();renderer.dispose();}}});
