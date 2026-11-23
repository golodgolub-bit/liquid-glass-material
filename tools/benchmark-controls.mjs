import{chromium}from'@playwright/test';import{writeFile}from'node:fs/promises';import{existsSync}from'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(existsSync(edge)?edge:undefined),headless:true,args:process.platform==='win32'?['--use-angle=d3d11','--ignore-gpu-blocklist']:[]});
try{const page=await browser.newPage({viewport:{width:960,height:640}});await page.goto('http://127.0.0.1:5173/tests/harness.html');
const report=await page.evaluate(async()=>{
  const lib=await import('/src/index.ts');window.testGlass.renderer.dispose();document.body.innerHTML='';
  const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;inset:0;width:800px;height:500px;z-index:0';document.body.append(canvas);
  const parent=document.createElement('div');parent.style.cssText='position:relative;z-index:1;width:800px;display:grid;grid-template-columns:repeat(3,220px);column-gap:30px;row-gap:8px;padding:20px;font:14px system-ui';document.body.append(parent);
  const renderer=new lib.GlassRenderer(canvas,{maxPixelRatio:1,measureGpu:true,accessibility:{reducedMotion:false}});renderer.resize(800,500);
  const source=document.createElement('canvas');source.width=800;source.height=500;const c=source.getContext('2d');c.fillStyle='#f5f7fa';c.fillRect(0,0,800,500);renderer.setBackdrop(source);
  const gl=canvas.getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info'),device=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),results=[];
  const quantile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))]??null;
  for(const count of[1,8,24]){
    const controls=Array.from({length:count},(_,i)=>lib.glassToggle(renderer,parent,`Setting ${i+1}`,i%2===0));let phase=-1;
    controls.forEach(s=>s.setPressed(true));const program=renderer.addAnimation(({time})=>{const next=Math.floor(time*3);if(next!==phase){phase=next;controls.forEach((s,i)=>s.setChecked((next+i)%2===0));}},{essential:true});
    const cpu=[],gpu=[],interval=[];let frames=0,last=0;
    await new Promise(resolve=>{const stop=renderer.subscribe(stats=>{const now=performance.now();if(frames++>=30){cpu.push(stats.cpuMs);if(stats.gpuMs!==null)gpu.push(stats.gpuMs);if(last)interval.push(now-last);}last=now;if(cpu.length===60){stop();resolve();}});});
    program.cancel();controls.forEach(s=>s.setPressed(false));await Promise.all(controls.map(s=>s.surface.settled()));await new Promise((resolve,reject)=>{const start=performance.now();const idle=()=>{if(renderer.idle)resolve();else if(performance.now()-start>5000)reject(new Error('Controls failed to sleep'));else requestAnimationFrame(idle);};requestAnimationFrame(idle);});
    const a=renderer.stats.frames;await new Promise(r=>setTimeout(r,250));const idleFrames=renderer.stats.frames-a;
    results.push({controls:count,mode:'programmatic retargets at 3 Hz with pressed glass thumbs',viewport:'800x500 @ 1x',measuredFrames:cpu.length,cpuMedianMs:quantile(cpu,.5),cpuP95Ms:quantile(cpu,.95),gpuMedianMs:quantile(gpu,.5),gpuP95Ms:quantile(gpu,.95),frameMedianMs:quantile(interval,.5),frameP95Ms:quantile(interval,.95),idleFrames,stats:renderer.stats});controls.forEach(s=>s.dispose());
  }
  renderer.dispose();return{device,results};
});await writeFile('artifacts/controls-benchmark.json',JSON.stringify({recordedAt:new Date().toISOString(),...report},null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
