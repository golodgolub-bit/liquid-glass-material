import { chromium } from '@playwright/test';
import { existsSync,readdirSync } from 'node:fs';
import { mkdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const cache=join(process.env.LOCALAPPDATA ?? '','ms-playwright');
const installed=existsSync(cache)?readdirSync(cache).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>join(cache,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(existsSync):undefined;
const software=process.argv.includes('--software');
const hardware=process.argv.includes('--d3d11'),spectral=process.argv.includes('--spectral');
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? (hardware && existsSync(edge)?edge:installed),headless:true,args:software?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:hardware?['--use-angle=d3d11','--ignore-gpu-blocklist']:[]});
try {
  const page=await browser.newPage({viewport:{width:960,height:640}});
  await page.goto('http://127.0.0.1:5173/tests/harness.html');
  const result=await page.evaluate(async(spectral)=> {
    const {GlassRenderer}=await import('/src/index.ts');
    window.testGlass.renderer.dispose();document.body.innerHTML='';
    const quantile=(values,p)=> {const a=[...values].sort((a,b)=>a-b);return a.length?a[Math.min(a.length-1,Math.floor(a.length*p))]:null;};
    const baseline=[];await new Promise(resolve=>{let last=0;const tick=now=>{if(last)baseline.push(now-last);last=now;if(baseline.length<30)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
    const canvas=document.createElement('canvas');canvas.style.cssText='width:800px;height:500px';document.body.append(canvas);
    const gl=canvas.getContext('webgl2'), info=gl.getExtension('WEBGL_debug_renderer_info');
    const device=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
    const source=document.createElement('canvas');source.width=800;source.height=500;
    const ctx=source.getContext('2d'),g=ctx.createLinearGradient(0,0,800,500);g.addColorStop(0,'#becee5');g.addColorStop(1,'#f7bca5');ctx.fillStyle=g;ctx.fillRect(0,0,800,500);
    const renderer=new GlassRenderer(canvas,{maxPixelRatio:1,measureGpu:true});renderer.resize(800,500);renderer.setBackdrop(source);
    const results=[];
    for(const [count,layout] of [[1,'grid'],[8,'grid'],[24,'grid'],[3,'stack'],[8,'stack']]) {
      const surfaces=[];
      for(let i=0;i<count;i++)surfaces.push(renderer.addSurface({id:`bench-${i}`,rect:{x:40+(layout==='stack'?i*18:(i%6)*120),y:50+(layout==='stack'?i*12:Math.floor(i/6)*100),width:100,height:64,radius:30},material:{abbeNumber:spectral?58:0}}));
      await new Promise(r=>setTimeout(r,500));
      const frameTimes=[],cpu=[],gpu=[];let last=0,frames=0;
      const started=performance.now();
      await new Promise(resolve=> {
        const stop=renderer.subscribe(stats=> {
          const now=performance.now();
          if(last && frames>8){frameTimes.push(now-last);cpu.push(stats.cpuMs);if(stats.gpuMs!==null)gpu.push(stats.gpuMs);}
          last=now;frames++;
          if(frames>68||now-started>12000){stop();resolve();}
        });
        function tick(){if(frames>68||performance.now()-started>12500)return;surfaces.forEach((s,i)=>s.move({y:50+(layout==='stack'?i*12:Math.floor(i/6)*100)+Math.sin(performance.now()/350+i)*8},false));requestAnimationFrame(tick);}
        requestAnimationFrame(tick);
      });
      results.push({surfaces:count,layout,viewport:'800×500 @ 1×',frames:frameTimes.length,frameMedianMs:quantile(frameTimes,.5),frameP95Ms:quantile(frameTimes,.95),cpuMedianMs:quantile(cpu,.5),cpuP95Ms:quantile(cpu,.95),gpuMedianMs:quantile(gpu,.5),gpuP95Ms:quantile(gpu,.95),stats:renderer.stats});
      surfaces.forEach(s=>s.remove());
    }
    await new Promise(r=>setTimeout(r,1000));const before=renderer.stats.frames;await new Promise(r=>setTimeout(r,400));const idleFrames=renderer.stats.frames-before;
    renderer.dispose();return {device,baselineRafMedianMs:quantile(baseline,.5),baselineRafP95Ms:quantile(baseline,.95),results,idleFrames};
  },spectral);
  const report={recordedAt:new Date().toISOString(),softwareRequested:software,hardwareRequested:hardware,spectralDispersion:spectral,...result};
  await mkdir('artifacts',{recursive:true});await writeFile(`artifacts/benchmark-${software?'software':hardware?'hardware':'default'}${spectral?'-spectral':''}.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
