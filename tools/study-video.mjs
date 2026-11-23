import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import {Readable} from 'node:stream';
import { createReadStream, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const remote=/^https:\/\//.test(process.argv[2]);
const input=remote?process.argv[2]:resolve(process.argv[2]), out=resolve(process.argv[3] ?? 'artifacts/reference-motion');
let times=(process.argv[4] ?? '7,7.12,7.24,7.36,7.48,7.6,9,9.2,9.4,9.6,9.8,10,19.8,20,20.2,20.4,20.6,20.8').split(',').map(Number);
const size=remote?0:statSync(input).size;
const server=createServer(async(req,res)=> {
  if(req.url==='/video'){
    if(remote){
      const controller=new AbortController();res.on('close',()=>controller.abort());
      try{const upstream=await fetch(input,{headers:req.headers.range?{Range:req.headers.range}:{},signal:controller.signal});
        const headers={};for(const key of ['content-type','content-length','content-range','accept-ranges'])if(upstream.headers.has(key))headers[key]=upstream.headers.get(key);
        res.writeHead(upstream.status,headers);Readable.fromWeb(upstream.body).on('error',()=>res.destroy()).pipe(res);
      }catch(error){if(!controller.signal.aborted){res.writeHead(502);res.end(String(error));}}return;
    }
    const match=/bytes=(\d+)-(\d*)/.exec(req.headers.range ?? '');
    const start=match?+match[1]:0,end=match&&match[2]?Math.min(+match[2],size-1):size-1;
    res.writeHead(match?206:200,{'Content-Type':input.endsWith('.mov')?'video/quicktime':input.endsWith('.webm')?'video/webm':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,...(match?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
    createReadStream(input,{start,end}).pipe(res);
  } else {res.writeHead(200,{'Content-Type':'text/html'});res.end('<html><body><video preload="auto" src="/video" muted></video></body></html>');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=d3d11']});
try {
  await mkdir(out,{recursive:true});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('video').evaluate(v=>new Promise((resolve,reject)=>{if(v.readyState>=2)resolve();else{v.onloadeddata=resolve;v.onerror=reject;}}));
  if(process.argv[4]==='auto'){const duration=await page.locator('video').evaluate(v=>v.duration);times=Array.from({length:20},(_,i)=>(i+.1)/20*duration);}
  const result=await page.evaluate(async(times)=>{
    const v=document.querySelector('video');const cellW=400,cellH=Math.round(v.videoHeight/v.videoWidth*cellW)+24;
    const sheet=document.createElement('canvas');sheet.width=cellW*4;sheet.height=cellH*Math.ceil(times.length/4);
    const c=sheet.getContext('2d');c.fillStyle='#111722';c.fillRect(0,0,sheet.width,sheet.height);c.font='14px monospace';
    for(let i=0;i<times.length;i++){
      v.currentTime=Math.min(v.duration-.02,times[i]);await new Promise(r=>v.addEventListener('seeked',r,{once:true}));
      const x=(i%4)*cellW,y=Math.floor(i/4)*cellH;c.drawImage(v,x,y+24,cellW,cellH-24);c.fillStyle='white';c.fillText(`${times[i].toFixed(2)} s`,x+6,y+17);
    }return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,png:sheet.toDataURL('image/png').split(',')[1]};
  },times);
  await writeFile(resolve(out,'motion-strip.png'),Buffer.from(result.png,'base64'));delete result.png;console.log(result);
}finally{await browser.close();server.close();}
