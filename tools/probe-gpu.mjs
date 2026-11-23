import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const executablePath=process.env.CHROMIUM_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!existsSync(executablePath))throw new Error('Set CHROMIUM_PATH to the browser to probe');
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
try {
  const page=await browser.newPage();
  console.log(await page.evaluate(()=> {
    const gl=document.createElement('canvas').getContext('webgl2');
    if(!gl)return {webgl2:false};
    const info=gl.getExtension('WEBGL_debug_renderer_info');
    const contentCanvas=document.createElement('canvas');contentCanvas.setAttribute('content','drawable');const ctx=contentCanvas.getContext('2d');
    return {webgl2:true,renderer:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),htmlInCanvas:contentCanvas.content==='drawable'&&typeof ctx.drawElementImage==='function',browser:navigator.userAgent};
  }));
} finally {await browser.close();}
