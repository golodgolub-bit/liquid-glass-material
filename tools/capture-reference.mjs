import{chromium}from'@playwright/test';
import{existsSync,readdirSync}from'node:fs';
import{mkdir,writeFile}from'node:fs/promises';
import{join}from'node:path';
const cache=join(process.env.LOCALAPPDATA??'','ms-playwright'),installed=existsSync(cache)?readdirSync(cache).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>join(cache,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(existsSync):undefined;
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',executablePath=process.env.CHROMIUM_PATH??(existsSync(edge)?edge:installed);
const dpr=Number(process.env.REFERENCE_DPR??1);if(!Number.isFinite(dpr)||dpr<=0)throw new Error('REFERENCE_DPR must be positive');
const browser=await chromium.launch({executablePath,headless:true,args:process.platform==='win32'?['--use-angle=d3d11','--ignore-gpu-blocklist']:[]});
try{const page=await browser.newPage({viewport:{width:1040,height:800},deviceScaleFactor:dpr,reducedMotion:'reduce'});await page.goto(`http://127.0.0.1:5173/examples/reference/?dpr=${dpr}`);await page.waitForFunction(()=>!!window.glassReference);await page.evaluate(()=>window.glassReference.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await mkdir('artifacts/reference',{recursive:true});
const metadata=await page.evaluate(()=>{const f=window.glassReference,gl=f.renderer.canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return{scene:f.scene,devicePixelRatio,stats:f.renderer.stats,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),userAgent:navigator.userAgent,accessibility:{reducedMotion:true,reducedTransparency:false,increasedContrast:false},color:'RGBA8/sRGB'};});
await page.locator('canvas').screenshot({path:'artifacts/reference/web.png'});
// Capture the presented background at the same DPR, avoiding native image-resampling differences.
await page.evaluate(()=>new Promise(resolve=>{const f=window.glassReference,stop=f.renderer.subscribe(()=>{stop();resolve();});f.surfaces.forEach(s=>s.remove());f.renderer.invalidate();}));
await page.locator('canvas').screenshot({path:'artifacts/reference/reference-backdrop.png'});await writeFile('artifacts/reference/web.json',JSON.stringify({capturedAt:new Date().toISOString(),...metadata},null,2));console.log('Captured artifacts/reference/{reference-backdrop.png,web.png,web.json}');
}finally{await browser.close();}
