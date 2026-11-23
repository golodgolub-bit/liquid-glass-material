import type {GlassRenderer} from './renderer.js';
export interface MediaBackdropOptions {fit?:'cover'|'contain'|'fill';maxPixelRatio?:number;background?:string;onError?:(error:Error)=>void}
export interface MediaBackdropBinding {canvas:HTMLCanvasElement;refresh:()=>void;dispose:()=>void}
/** Capture decoded media with the same crop as its viewport; no stretching unless explicitly requested. */
export function bindMediaBackdrop(renderer:GlassRenderer,source:HTMLImageElement|HTMLVideoElement,options:MediaBackdropOptions={}):MediaBackdropBinding{
  const fit=options.fit??'cover';if(!['cover','contain','fill'].includes(fit))throw new RangeError('Invalid media fit');
  if(options.maxPixelRatio!==undefined&&(!Number.isFinite(options.maxPixelRatio)||options.maxPixelRatio<=0))throw new RangeError('Invalid maxPixelRatio');
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;let disposed=false,token=0;
  const video=source instanceof HTMLVideoElement?source:null;
  const refresh=()=>{
    if(disposed)return;const sw=video?video.videoWidth:(source as HTMLImageElement).naturalWidth,sh=video?video.videoHeight:(source as HTMLImageElement).naturalHeight;if(!sw||!sh)return;
    const ratio=Math.min(devicePixelRatio||1,options.maxPixelRatio??1.5),w=Math.max(1,Math.round(renderer.size.width*ratio)),h=Math.max(1,Math.round(renderer.size.height*ratio));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    try{ctx.clearRect(0,0,w,h);ctx.fillStyle=options.background??'#000';ctx.fillRect(0,0,w,h);
      const scale=fit==='cover'?Math.max(w/sw,h/sh):Math.min(w/sw,h/sh),dw=fit==='fill'?w:sw*scale,dh=fit==='fill'?h:sh*scale;
      ctx.drawImage(source,(w-dw)/2,(h-dh)/2,dw,dh);renderer.setBackdrop(canvas);
    }catch(error){const failure=error instanceof Error?error:new Error(String(error));if(options.onError)options.onError(failure);else throw failure;}
  };
  const frame=()=>{if(disposed||!video)return;refresh();token=video.requestVideoFrameCallback(frame);};
  const observer=new ResizeObserver(refresh);observer.observe(renderer.canvas);
  source.addEventListener('load',refresh);source.addEventListener('loadeddata',refresh);source.addEventListener('seeked',refresh);
  if(video?.requestVideoFrameCallback)token=video.requestVideoFrameCallback(frame);else if(video)video.addEventListener('timeupdate',refresh);
  refresh();return{canvas,refresh,dispose:()=>{if(disposed)return;disposed=true;observer.disconnect();source.removeEventListener('load',refresh);source.removeEventListener('loadeddata',refresh);source.removeEventListener('seeked',refresh);if(video){if(token)video.cancelVideoFrameCallback(token);video.removeEventListener('timeupdate',refresh);}}};
}
