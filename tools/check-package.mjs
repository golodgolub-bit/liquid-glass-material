import { chromium } from '@playwright/test';
import { existsSync,readdirSync } from 'node:fs';
import { join } from 'node:path';
const cache=join(process.env.LOCALAPPDATA ?? '','ms-playwright');
const executablePath=process.env.CHROMIUM_PATH ?? (existsSync(cache)?readdirSync(cache).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>join(cache,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(existsSync):undefined);
const browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage();await page.goto('http://127.0.0.1:5173/tests/harness.html');
  const exports=await page.evaluate(async()=> {
    const lib=await import('/dist/liquid-glass.js');
    const canvas=document.createElement('canvas');canvas.style.cssText='width:100px;height:100px';document.body.append(canvas);
    const renderer=new lib.GlassRenderer(canvas);renderer.addSurface({id:'package-check',rect:{x:5,y:5,width:80,height:80,radius:30}});
    await new Promise(r=>requestAnimationFrame(r));
    if(renderer.stats.frames<1)throw new Error('Built renderer failed to draw');renderer.dispose();
    return Object.keys(lib).sort();
  });console.log('Built ESM loaded and rendered:',exports.join(', '));
} finally {await browser.close();}
