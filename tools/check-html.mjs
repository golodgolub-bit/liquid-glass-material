import{chromium}from'@playwright/test';
import{readFile,readdir,stat}from'node:fs/promises';
import{resolve,dirname,join}from'node:path';
import{pathToFileURL}from'node:url';
import{existsSync}from'node:fs';
const root=resolve('dist-html'),files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await walk(p);else if(e.name.endsWith('.html'))files.push(p);}}await walk(root);
const broken=[];for(const file of files){const html=await readFile(file,'utf8');for(const m of html.matchAll(/(?:href|src)="([^"<>]+)"/g)){const href=m[1].split('#')[0].split('?')[0];if(!href||/^(?:[a-z]+:|\/\/)/i.test(href))continue;const path=resolve(dirname(file),decodeURIComponent(href));if(!path.startsWith(root))continue;try{const item=await stat(path);if(item.isDirectory()&&!existsSync(join(path,'index.html')))broken.push([file,href]);}catch{broken.push([file,href]);}}}
if(broken.length)throw Error(`Broken static links: ${JSON.stringify(broken)}`);
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??(process.platform==='win32'&&existsSync(edge)?edge:undefined),headless:true,args:process.platform==='win32'?['--use-angle=d3d11','--ignore-gpu-blocklist']:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1100,height:950}}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
await page.goto(pathToFileURL(join(root,'examples/interface-kit/index.html')).href);await page.waitForFunction(()=>window.interfaceKit?.renderer.stats.frames>0);await page.getByRole('button',{name:'Open Notes',exact:true}).click();await page.waitForFunction(()=>window.interfaceKit.opened);await page.getByRole('button',{name:'Send behind clock',exact:true}).click();await page.waitForFunction(()=>window.interfaceKit.panel.state.layer===1);await page.keyboard.press('Escape');
await page.goto(pathToFileURL(join(root,'examples/controls/index.html')).href);await page.waitForFunction(()=>window.glassControls?.renderer.idle);await page.getByRole('switch',{name:'Preview connection',exact:true}).click();await page.waitForFunction(()=>!window.glassControls.preview.checked);
const {version}=JSON.parse(await readFile(join(root,'version.json'),'utf8'));
for(const file of files.filter(f=>!f.startsWith(join(root,'docs')))){
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  if(await page.locator('meta[name="liquid-glass-version"]').getAttribute('content')!==version)throw Error(`Version mismatch in ${file}`);
}
if(errors.length||requests.length)throw Error(JSON.stringify({errors,requests}));console.log(`Checked ${files.length} HTML pages and links; offline controls and composition run without HTTP requests`);
}finally{await browser.close();}
