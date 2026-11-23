import {chromium}from'@playwright/test';
import{mkdir,rename,writeFile}from'node:fs/promises';
await mkdir('artifacts/motion-recording',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:'artifacts/motion-recording',size:{width:1280,height:900}}});
const page=await context.newPage(),errors=[];page.on('pageerror',error=>{errors.push(error.stack??error.message);console.error(error.stack??error.message);});
page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('Failed to load resource:')){errors.push(message.text());console.error(message.text());}});
try{
  await page.goto(process.env.LIQUID_GLASS_URL??'http://127.0.0.1:5173');await page.locator('#motion-studio').scrollIntoViewIfNeeded();
  await page.evaluate(()=>window.motionStudio.stop());
  await page.exposeFunction('reportMotion',text=>console.log('Scene:',text));
  await page.evaluate(()=>{new MutationObserver(()=>window.reportMotion(document.querySelector('#motion-title').textContent)).observe(document.querySelector('#motion-title'),{childList:true,subtree:true});});
  let deadline;
  try{await Promise.race([page.evaluate(()=>window.motionStudio.play(true)),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Motion showcase exceeded 90 seconds')),90000);})]);}finally{clearTimeout(deadline);}
  const result=await page.evaluate(()=>({scenario:window.motionStudio.scenario,playing:window.motionStudio.playing,caption:document.querySelector('#motion-step').textContent}));
  console.log('Playback result:',result);
  if(result.scenario!=='sheet'||!result.caption.startsWith('SETTLED'))throw new Error('Playback interrupted: '+JSON.stringify(result));
  await page.screenshot({path:'artifacts/motion-studio-desktop.png'});
}finally{
  const video=page.video();await context.close();if(video){const path=await video.path();await rename(path,'artifacts/motion-showcase.webm');}
  await writeFile('artifacts/motion-recording/errors.json',JSON.stringify(errors,null,2));await browser.close();
}
if(errors.length)throw new Error(errors.join('\n'));
console.log('Recorded all motion scenarios: artifacts/motion-showcase.webm');
