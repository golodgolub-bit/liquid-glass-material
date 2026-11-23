import{chromium}from'@playwright/test';
import{mkdir}from'node:fs/promises';
import{existsSync}from'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
await mkdir('artifacts',{recursive:true});await mkdir('docs/images',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(process.platform==='win32'&&existsSync(edge)?edge:undefined),headless:true,args:process.platform==='win32'?['--use-angle=d3d11','--ignore-gpu-blocklist']:[]});
try{
  const page=await browser.newPage({viewport:{width:1200,height:1200}});await page.goto(new URL('/examples/controls/',process.env.LIQUID_GLASS_URL??'http://127.0.0.1:5173').href);
  await page.waitForFunction(()=>window.glassControls?.renderer.idle);await page.screenshot({path:'artifacts/controls-resting.png',fullPage:true});
  const switchControl=page.getByRole('switch',{name:'Preview connection'}),thumb=switchControl.locator('.lg-toggle-thumb'),box=await thumb.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(300);
  await page.screenshot({path:'docs/images/controls.jpg',type:'jpeg',quality:94,fullPage:true});await page.locator('.preview').screenshot({path:'artifacts/switch-active.png'});
  console.log(await page.evaluate(()=>({thumb:window.glassControls.preview.surface.state,track:window.glassControls.preview.trackSurface.rect,error:window.glassControls.renderer.canvas.getContext('webgl2').getError()})));
  await page.mouse.up();await page.waitForFunction(()=>window.glassControls.renderer.idle);console.log('Captured resting and interacting controls from the real compositor');
}finally{await browser.close();}
