import{chromium}from'@playwright/test';
import{mkdir,writeFile,rename}from'node:fs/promises';
await mkdir('artifacts/interaction-recording',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:'artifacts/interaction-recording',size:{width:1280,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.stack??e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Failed to load resource:'))errors.push(m.text());});
const delay=ms=>page.waitForTimeout(ms),select=async id=>{await page.locator(`[data-motion="${id}"]`).click();await delay(220);},box=async selector=>{const b=await selector.boundingBox();if(!b)throw new Error('Missing interaction target');return b;};
async function drag(locator,dx,dy){const b=await box(locator);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await delay(350);await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:30});await delay(240);await page.mouse.up();await delay(500);}
try{
  await page.goto(process.env.LIQUID_GLASS_URL??'http://127.0.0.1:5173');
  await page.locator('#motion-studio').evaluate(e=>e.scrollIntoView({block:'start'}));
  await select('touch');await drag(page.getByRole('button',{name:'Hold & move',exact:true}),-160,-55);await drag(page.getByRole('button',{name:'Hold & move',exact:true}),190,65);
  await select('layers');await drag(page.getByRole('button',{name:'Drag front glass',exact:true}),-135,-30);await drag(page.getByRole('button',{name:'Drag front glass',exact:true}),90,75);await page.screenshot({path:'artifacts/material-layers.png'});
  await select('shape');await drag(page.getByRole('button',{name:'Drag free glass contour',exact:true}),-35,5);await page.screenshot({path:'artifacts/material-contour.png'});
  await page.getByRole('button',{name:'Pebble',exact:true}).click();await delay(700);await page.getByRole('button',{name:'Ring',exact:true}).click();await delay(700);await page.screenshot({path:'artifacts/material-ring.png'});
  await select('morph');await page.getByRole('button',{name:'Open studio menu'}).click();await delay(800);
  for(const name of ['Edit appearance','Share this moment','Add to collection']){await page.getByRole('menuitem',{name}).hover();await delay(250);}await page.screenshot({path:'artifacts/material-menu.png'});await page.keyboard.press('Escape');await delay(700);
  await select('navigation');const start=await box(page.getByRole('button',{name:'Calls',exact:true})),end=await box(page.getByRole('button',{name:'Settings',exact:true}));
  await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await delay(400);await page.mouse.move(end.x+end.width/2,end.y+end.height/2,{steps:35});await delay(350);await page.screenshot({path:'artifacts/material-navigation-held.png'});await page.mouse.up();await delay(800);
  await page.goto(new URL('/examples/programmatic/',page.url()).href);await page.getByRole('button',{name:'Start motion',exact:true}).click();await delay(1800);await page.getByRole('button',{name:'Pause motion',exact:true}).click();await delay(400);
  await drag(page.getByRole('button',{name:'Drag the glass lens',exact:true}),-120,20);await page.locator('#bevel').fill('1');await delay(300);await page.locator('#bevel').fill('0');await delay(300);await page.screenshot({path:'artifacts/material-programmable.png'});
}finally{
  const video=page.video();await context.close();if(video)await rename(await video.path(),'artifacts/material-interactions.webm');await browser.close();await writeFile('artifacts/interaction-recording/errors.json',JSON.stringify(errors,null,2));
}
if(errors.length)throw new Error(errors.join('\n'));
console.log('Verified real pointer interactions: artifacts/material-interactions.webm');
