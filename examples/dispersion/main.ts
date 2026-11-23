import{GlassRenderer,bindDrag,type GlassMaterial}from'../../src';
const canvas=document.querySelector('canvas')!,renderer=new GlassRenderer(canvas),source=document.createElement('canvas');source.width=960;source.height=360;
renderer.resize(960,360);const c=source.getContext('2d')!;
c.fillStyle='#f1efe8';c.fillRect(0,0,960,360);
for(let i=0;i<3;i++){
  const x=i*320;c.save();c.beginPath();c.rect(x+15,20,290,320);c.clip();c.fillStyle='#faf9f4';c.fillRect(x+15,20,290,320);
  c.fillStyle='#8a8b83';c.font='10px monospace';c.fillText('TRANSMISSION / LIGHT FIELD',x+35,53);
  c.fillStyle='#222929';c.font='46px Georgia';c.fillText('Light bends.',x+30,125);c.fillText('Color follows.',x+25,190);
  c.font='13px Georgia';c.fillStyle='#77796f';c.fillText('Every wavelength takes its own path.',x+35,228);
  for(let j=0;j<8;j++){c.fillStyle=j%2?'#a4a89c':'#292e2c';c.fillRect(x+38+j*4,250,1,48);}
  for(let j=0;j<4;j++){c.beginPath();c.fillStyle=['#da795f','#debd61','#74a491','#6e95ac'][j];c.arc(x+124+j*43,277,14,0,Math.PI*2);c.fill();}c.restore();
}
renderer.setBackdrop(source);
const rects=[0,1,2].map(i=>({x:i*320+37,y:91,width:246,height:154,radius:67}));
const surfaces=rects.map((rect,i)=>renderer.addSurface({id:`spectrum-${i}`,rect,sizeAdaptation:false,contrast:false,material:{variant:i===0?'clear':'regular',frost:[.08,.68,1][i],scatterRadius:6,appearance:'light',ambientSpill:0}}));
const handles=[...document.querySelectorAll<HTMLButtonElement>('.lens')],bindings=handles.map((button,i)=>bindDrag(renderer,button,{surface:surfaces[i],bounds:()=>({x:i*320+18,y:25,width:284,height:310,radius:0})}));
renderer.subscribe(()=>surfaces.forEach((s,i)=>{const r=s.state.visualRect;Object.assign(handles[i].style,{left:`${r.x/9.6}%`,top:`${r.y/3.6}%`,width:`${r.width/9.6}%`,height:`${r.height/3.6}%`});}));
handles.forEach((button,i)=>button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const r=surfaces[i].rect;surfaces[i].move({x:Math.max(i*320+18,Math.min(i*320+56,r.x+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0))),y:Math.max(25,Math.min(181,r.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0)))});}));
const model=document.querySelector<HTMLSelectElement>('#model')!,amount=document.querySelector<HTMLInputElement>('#amount')!;
const apply=()=>{
  const value=Number(amount.value),material:Partial<GlassMaterial>=model.value==='cauchy'?{dispersion:0,abbeNumber:value}:model.value==='none'?{dispersion:0,abbeNumber:0}:{dispersion:value,abbeNumber:0};
  surfaces.forEach(s=>s.material(material));document.querySelector('#value')!.textContent=amount.value;
  document.querySelector('#recipe')!.textContent=`surface.material({\n  dispersion: ${material.dispersion},\n  abbeNumber: ${material.abbeNumber},\n  bevel: 0\n});`;
};
model.addEventListener('change',()=>{const physical=model.value==='cauchy';amount.min=physical?'5':'0';amount.max=physical?'100':'5';amount.step=physical?'1':'.05';amount.value=physical?'58':'.35';amount.disabled=model.value==='none';document.querySelector('#coefficient')!.textContent=physical?'Abbe Vd':'RGB separation';apply();});
amount.addEventListener('input',apply);document.querySelector('#reset')!.addEventListener('click',()=>surfaces.forEach((s,i)=>s.move(rects[i])));apply();
Object.assign(window,{glassDispersion:{renderer,surfaces,source}});
window.addEventListener('pagehide',()=>{bindings.forEach(b=>b.dispose());renderer.dispose();},{once:true});
