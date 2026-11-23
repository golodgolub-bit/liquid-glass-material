import{chromium}from'@playwright/test';
import{mkdir,writeFile}from'node:fs/promises';
import{existsSync}from'node:fs';
await mkdir('artifacts',{recursive:true});await mkdir('docs/images',{recursive:true});
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(process.platform==='win32'&&existsSync(edge)?edge:undefined),headless:true,args:process.platform==='win32'?['--use-angle=d3d11','--ignore-gpu-blocklist']:[]});
try{
  const page=await browser.newPage({viewport:{width:1200,height:1100},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('/examples/dispersion/',process.env.LIQUID_GLASS_URL??'http://127.0.0.1:5173').href);
  await page.waitForFunction(()=>window.glassDispersion?.renderer.idle);await page.screenshot({path:'artifacts/dispersion-default.png',fullPage:true});
  await page.locator('#amount').fill('2');await page.locator('#amount').dispatchEvent('input');await page.waitForFunction(()=>window.glassDispersion.renderer.idle);
  await page.screenshot({path:'docs/images/dispersion.jpg',type:'jpeg',quality:94,fullPage:true});
  await page.locator('#model').selectOption('cauchy');await page.waitForFunction(()=>window.glassDispersion.renderer.idle);await page.screenshot({path:'artifacts/dispersion-cauchy.png',fullPage:true});
  await writeFile('artifacts/dispersion-errors.json',JSON.stringify(errors));if(errors.length)throw new Error(errors.join('\n'));console.log('Captured the real default, amplified artistic and Cauchy study');
}finally{await browser.close();}
