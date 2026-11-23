import{chromium}from'@playwright/test';
import{mkdir,writeFile,rename}from'node:fs/promises';
await mkdir('artifacts/workbench-recording',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:process.platform==='win32'?['--use-angle=d3d11','--ignore-gpu-blocklist']:[]});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:'artifacts/workbench-recording',size:{width:1280,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const pause=ms=>page.waitForTimeout(ms);
async function drag(dx,dy){const b=await page.locator('.lens').boundingBox();if(!b)throw new Error('Lens missing');const x=b.x+b.width/2,y=b.y+b.height/2;await page.mouse.move(x,y);await page.mouse.down();await pause(200);for(let i=1;i<=36;i++){await page.mouse.move(x+dx*i/36,y+dy*i/36);await pause(16);}await page.mouse.up();await pause(550);}
try{
  await page.goto(new URL('/examples/workbench/',process.env.LIQUID_GLASS_URL??'http://127.0.0.1:5173').href);
  await pause(650);await drag(-150,-70);await drag(135,40);
  await page.locator('#model').selectOption('slab');await pause(650);await drag(-110,-15);
  await page.locator('#gain').fill('1.5');await pause(450);await page.locator('#gain').fill('1');
  await page.locator('#deform').check();await page.locator('#kick').click();await pause(1400);
  await page.locator('#play').click();await pause(2200);await page.locator('#play').click();await pause(550);
  await page.locator('summary').click();await page.locator('#code').fill('GlassOpticalSample ray = defaultGlassOptics(data);\nray.displacement *= uGlass_gain;\nreturn ray;');await page.locator('#apply').click();await pause(650);
  if(await page.locator('#status').getAttribute('data-error')==='true')throw new Error(await page.locator('#status').textContent());
  await page.screenshot({path:'artifacts/workbench-v0.6.png'});
}finally{const video=page.video();await context.close();if(video)await rename(await video.path(),'artifacts/workbench-v0.6.webm');await browser.close();await writeFile('artifacts/workbench-recording/errors.json',JSON.stringify(errors,null,2));}
if(errors.length)throw new Error(errors.join('\n'));console.log('Recorded real controls, ray model, GLSL and motion: artifacts/workbench-v0.6.webm');
