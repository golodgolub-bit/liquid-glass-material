import type {GlassRenderer} from './renderer.js';
interface DrawableCanvas extends HTMLCanvasElement {content:string;requestPaint:()=>void;clearElementGeometry?:(element:Element)=>void}
interface DrawableContext extends CanvasRenderingContext2D {drawElementImage:(element:HTMLElement,dx:number,dy:number,width:number,height:number)=>void}
export function supportsDomBackdrop():boolean{
  if(typeof document==='undefined')return false;
  const canvas=document.createElement('canvas')as DrawableCanvas;canvas.setAttribute('content','drawable');
  return canvas.content==='drawable'&&typeof(canvas.getContext('2d')as DrawableContext|null)?.drawElementImage==='function';
}
export interface DomBackdropBinding{canvas:HTMLCanvasElement;refresh:()=>void;dispose:()=>void;readonly paints:number}
/** Live native DOM rasterization. The content must be inside this dedicated source canvas. */
export function bindDomBackdrop(renderer:GlassRenderer,canvas:HTMLCanvasElement,content:HTMLElement,options:{maxPixelRatio?:number;background?:string;foreground?:boolean;onError?:(error:Error)=>void}={}):DomBackdropBinding{
  if(!supportsDomBackdrop())throw new Error('Live DOM backdrops require HTML-in-Canvas (Chromium 157+). Supply a canvas/image/video backdrop on other hosts.');
  if(canvas===renderer.canvas||!canvas.contains(content))throw new Error('DOM content must belong to a separate backdrop canvas');
  if(options.maxPixelRatio!==undefined&&(!Number.isFinite(options.maxPixelRatio)||options.maxPixelRatio<=0))throw new RangeError('Invalid maxPixelRatio');
  const drawable=canvas as DrawableCanvas,originalContent=canvas.getAttribute('content'),wasDrawable=content.hasAttribute('drawable');
  canvas.setAttribute('content','drawable');content.setAttribute('drawable','');
  const ctx=canvas.getContext('2d')as DrawableContext;
  if(!ctx)throw new Error('The source canvas must use a 2D context');
  let disposed=false,paints=0,lastSize='';
  const paint=()=>{
    if(disposed)return;
    try{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
      if(options.background){ctx.fillStyle=options.background;ctx.fillRect(0,0,canvas.width,canvas.height);}
      ctx.drawElementImage(content,0,0,canvas.width,canvas.height);paints++;if(options.foreground)renderer.setVibrancySource(canvas);else renderer.setBackdrop(canvas);
    }catch(error){const failure=error instanceof Error?error:new Error(String(error));if(options.onError)options.onError(failure);else console.error(failure);}
  };
  const resize=()=>{const size=renderer.size,ratio=Math.min(devicePixelRatio||1,options.maxPixelRatio??1.5),width=Math.max(1,Math.round(size.width*ratio)),height=Math.max(1,Math.round(size.height*ratio));
    const key=`${width}x${height}`;if(key===lastSize)return;lastSize=key;canvas.width=width;canvas.height=height;drawable.requestPaint();
  };
  canvas.addEventListener('paint',paint);const observer=new ResizeObserver(resize);observer.observe(renderer.canvas);
  resize();drawable.requestPaint();
  return{canvas,get paints(){return paints;},refresh:()=>{if(!disposed){resize();drawable.requestPaint();}},dispose:()=>{if(disposed)return;disposed=true;observer.disconnect();canvas.removeEventListener('paint',paint);drawable.clearElementGeometry?.(content);if(!wasDrawable)content.removeAttribute('drawable');if(originalContent===null)canvas.removeAttribute('content');else canvas.setAttribute('content',originalContent);}};
}
