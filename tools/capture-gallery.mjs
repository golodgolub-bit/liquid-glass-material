import{chromium}from'@playwright/test';
import{mkdir,writeFile}from'node:fs/promises';
import{existsSync,readdirSync}from'node:fs';
import{join}from'node:path';
const cache=join(process.env.LOCALAPPDATA??'','ms-playwright');
const installed=existsSync(cache)?readdirSync(cache).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>join(cache,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(existsSync):undefined;
const executablePath=process.env.CHROMIUM_PATH??(process.platform==='win32'&&existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':installed);
await mkdir('docs/images',{recursive:true});await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:process.platform==='win32'?['--use-angle=d3d11','--ignore-gpu-blocklist']:[]});
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
  for(const scene of['paper','spectrum','interfaces']){
    await page.goto(new URL(`/examples/gallery/?scene=${scene}&capture=1`,process.env.LIQUID_GLASS_URL??'http://127.0.0.1:5173').href);
    await page.waitForFunction(()=>window.glassGallery?.renderer.stats.frames>0);
    await page.locator('canvas').screenshot({path:`docs/images/${scene}.jpg`,type:'jpeg',quality:92});
    console.log(`Captured docs/images/${scene}.jpg from the real renderer`);
  }
}finally{await browser.close();await writeFile('artifacts/gallery-errors.json',JSON.stringify(errors,null,2));}
if(errors.length)throw new Error(errors.join('\n'));
