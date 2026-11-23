import{GlassRenderer}from'../../src';
import scene from'./scene.json';
const source=document.createElement('canvas');source.width=scene.width;source.height=scene.height;
const c=source.getContext('2d')!;
c.fillStyle='#f3f0e7';c.fillRect(0,0,480,400);c.fillStyle='#17232f';c.fillRect(480,0,480,400);
for(let x=0;x<960;x+=16){c.strokeStyle=x<480?'#5e716666':'#a1c3cb66';c.lineWidth=x%64===0?3:1;c.beginPath();c.moveTo(x,0);c.lineTo(x,400);c.stroke();}
for(let y=0;y<400;y+=16){c.strokeStyle='#91aaa766';c.lineWidth=y%64===0?3:1;c.beginPath();c.moveTo(0,y);c.lineTo(960,y);c.stroke();}
const gradient=c.createLinearGradient(0,400,960,640);gradient.addColorStop(0,'#186c82');gradient.addColorStop(.5,'#e8b681');gradient.addColorStop(1,'#995da1');c.fillStyle=gradient;c.fillRect(0,400,960,240);
for(let i=0;i<22;i++){c.strokeStyle='#fff9';c.lineWidth=2;c.beginPath();c.moveTo(i*60-200,640);c.lineTo(i*60+160,400);c.stroke();}
const renderer=new GlassRenderer(document.querySelector('canvas')!,{maxPixelRatio:Number(new URLSearchParams(location.search).get('dpr')??1),accessibility:{reducedMotion:true,reducedTransparency:false,increasedContrast:false}});renderer.resize(scene.width,scene.height);renderer.setBackdrop(source);
const surfaces=scene.surfaces.map(({id,variant,...rect})=>renderer.addSurface({id,rect,material:{variant:variant as'regular'|'clear'},contrast:false}));
Object.assign(window,{glassReference:{renderer,source,scene,surfaces,ready:Promise.all(surfaces.map(s=>s.settled()))}});
window.addEventListener('pagehide',()=>renderer.dispose(),{once:true});
