/** A reusable SVG contour. Curves, concave outlines and even-odd holes are supported. */
export interface GlassShape { readonly path:string; readonly viewBox:readonly [number,number]; readonly fillRule:CanvasFillRule; readonly resolution?:number; readonly kind?:'path'|'mask'|'text' }
const maps=new WeakMap<GlassShape,Map<number,Uint8Array>>();
export const shapeResolution=256;

// Squared Euclidean distance transform: linear work in the number of pixels.
function transform(input:Float64Array,n:number){
  const output=new Float64Array(n),v=new Int32Array(n),z=new Float64Array(n+1);let k=0;
  z[0]=-Infinity;z[1]=Infinity;
  for(let q=1;q<n;q++){
    let s=((input[q]+q*q)-(input[v[k]]+v[k]*v[k]))/(2*(q-v[k]));
    while(s<=z[k]&&k>0){k--;s=((input[q]+q*q)-(input[v[k]]+v[k]*v[k]))/(2*(q-v[k]));}
    k++;v[k]=q;z[k]=s;z[k+1]=Infinity;
  }
  k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;output[q]=(q-v[k])**2+input[v[k]];}
  return output;
}
function distance(mask:Uint8Array,inside:boolean,n:number){
  const values=new Float64Array(n*n),line=new Float64Array(n);
  for(let x=0;x<n;x++){for(let y=0;y<n;y++)line[y]=(!!mask[y*n+x]===inside)?0:1e9;const d=transform(line,n);for(let y=0;y<n;y++)values[y*n+x]=d[y];}
  for(let y=0;y<n;y++){line.set(values.subarray(y*n,(y+1)*n));values.set(transform(line,n),y*n);}
  return values;
}
export interface ShapeRasterOptions {resolution?:number}
function rasterSize(value=shapeResolution):number{if(!Number.isInteger(value)||value<32||value>1024)throw new RangeError('Shape resolution must be an integer in [32,1024]');return value;}
function encode(mask:Uint8Array,n:number):Uint8Array{
  if(!mask.some(Boolean)||mask.every(Boolean))throw new RangeError('Shape needs ink and transparent space; include padding around its boundary');
  const toInside=distance(mask,true,n),toOutside=distance(mask,false,n),signed=new Float64Array(n*n),data=new Uint8Array(n*n*4);
  for(let i=0;i<signed.length;i++)signed[i]=(mask[i]?-(Math.sqrt(toOutside[i])-.5):Math.sqrt(toInside[i])-.5)/n;
  // Smooth only the normal field. Coverage and hit testing keep the original distance.
  const horizontal=new Float32Array(n*n),field=new Float32Array(n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)horizontal[y*n+x]=(signed[y*n+Math.max(0,x-1)]+2*signed[y*n+x]+signed[y*n+Math.min(n-1,x+1)])*.25;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)field[y*n+x]=(horizontal[Math.max(0,y-1)*n+x]+2*horizontal[y*n+x]+horizontal[Math.min(n-1,y+1)*n+x])*.25;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=y*n+x,d=Math.max(0,Math.min(65535,Math.round((signed[i]/4+.5)*65535)));
    const loX=Math.max(0,x-1),hiX=Math.min(n-1,x+1),loY=Math.max(0,y-1),hiY=Math.min(n-1,y+1);
    // Preserve derivative magnitude at a medial axis. Normalizing here creates a cusp.
    const gx=(field[y*n+hiX]-field[y*n+loX])*n/(hiX-loX),gy=(field[hiY*n+x]-field[loY*n+x])*n/(hiY-loY),len=Math.hypot(gx,gy),gain=1/Math.max(1,len);
    data.set([d>>8,d&255,128+Math.round(Math.max(-1,Math.min(1,gx*gain))*127),128+Math.round(Math.max(-1,Math.min(1,gy*gain))*127)],i*4);
  }return data;
}
function register(shape:GlassShape,mask:Uint8Array,n:number):GlassShape{maps.set(shape,new Map([[n,encode(mask,n)]]));return shape;}
/** Rasterized once. Geometry animation never reruns a distance transform. */
export function createGlassShape(options:{path:string;viewBox?:readonly [number,number];fillRule?:CanvasFillRule}&ShapeRasterOptions):GlassShape{
  const viewBox=options.viewBox??[100,100],n=rasterSize(options.resolution);
  if(viewBox.length!==2||viewBox.some(v=>!Number.isFinite(v)||v<=0)||!options.path)throw new RangeError('Invalid shape path or viewBox');
  const shape=Object.freeze({path:options.path,viewBox:Object.freeze([...viewBox])as readonly[number,number],fillRule:options.fillRule??'nonzero',resolution:n,kind:'path' as const});
  const canvas=document.createElement('canvas');canvas.width=canvas.height=n;
  const c=canvas.getContext('2d',{willReadFrequently:true})!;c.scale(n/viewBox[0],n/viewBox[1]);c.fill(new Path2D(shape.path),shape.fillRule);
  const pixels=c.getImageData(0,0,n,n).data,mask=new Uint8Array(n*n);for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4+3]>=128?1:0;
  return register(shape,mask,n);
}
export interface MaskShapeOptions extends ShapeRasterOptions{source:CanvasImageSource;viewBox?:readonly[number,number];alphaThreshold?:number}
/** Alpha defines the contour, including holes. Source RGB is ignored; cross-origin canvas rules apply. */
export function createGlassShapeFromMask(options:MaskShapeOptions):GlassShape{
  const src=options.source as unknown as{videoWidth?:number;videoHeight?:number;naturalWidth?:number;naturalHeight?:number;width?:number;height?:number};
  const viewBox=options.viewBox??[src.videoWidth||src.naturalWidth||src.width!,src.videoHeight||src.naturalHeight||src.height!]as const,n=rasterSize(options.resolution),threshold=options.alphaThreshold??.5;
  if(viewBox.length!==2||viewBox.some(v=>!Number.isFinite(v)||v<=0)||!Number.isFinite(threshold)||threshold<=0||threshold>=1)throw new RangeError('Invalid mask dimensions or alpha threshold');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=n;const c=canvas.getContext('2d',{willReadFrequently:true})!;c.drawImage(options.source,0,0,n,n);
  const pixels=c.getImageData(0,0,n,n).data,mask=new Uint8Array(n*n);for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4+3]>=threshold*255?1:0;
  const shape=Object.freeze({path:'',viewBox:Object.freeze([...viewBox])as readonly[number,number],fillRule:'nonzero' as const,resolution:n,kind:'mask' as const});return register(shape,mask,n);
}
export interface TextShapeOptions extends ShapeRasterOptions{text:string;font:string;padding?:number}
/** Load the desired font before calling. Returned viewBox fits its actual ink bounds plus padding. */
export function createGlassTextShape(options:TextShapeOptions):GlassShape{
  if(!options.text.trim()||!CSS.supports('font',options.font))throw new TypeError('Text and a valid CSS font shorthand are required');
  const padding=options.padding??2;if(!Number.isFinite(padding)||padding<1||padding>256)throw new RangeError('Text padding must be in [1,256]');
  const canvas=document.createElement('canvas'),c=canvas.getContext('2d')!;c.font=options.font;const m=c.measureText(options.text),left=m.actualBoundingBoxLeft,right=m.actualBoundingBoxRight,up=m.actualBoundingBoxAscent,down=m.actualBoundingBoxDescent;
  const width=Math.max(1,Math.ceil(left+right+padding*2)),height=Math.max(1,Math.ceil(up+down+padding*2)),n=rasterSize(options.resolution);
  canvas.width=canvas.height=n;c.setTransform(n/width,0,0,n/height,0,0);c.font=options.font;c.fillStyle='white';c.fillText(options.text,padding+left,padding+up);
  const original=createGlassShapeFromMask({source:canvas,viewBox:[width,height],resolution:n}),shape=Object.freeze({...original,kind:'text' as const});maps.set(shape,maps.get(original)!);return shape;
}
function sample(data:Uint8Array,n:number,x:number,y:number):number[]{
  const px=Math.max(0,Math.min(n-1,x*n-.5)),py=Math.max(0,Math.min(n-1,y*n-.5)),lx=Math.floor(px),ly=Math.floor(py),hx=Math.min(n-1,lx+1),hy=Math.min(n-1,ly+1),tx=px-lx,ty=py-ly;
  return[0,1,2,3].map(k=>(data[(ly*n+lx)*4+k]*(1-tx)+data[(ly*n+hx)*4+k]*tx)*(1-ty)+(data[(hy*n+lx)*4+k]*(1-tx)+data[(hy*n+hx)*4+k]*tx)*ty);
}
export function shapePixels(shape:GlassShape,resolution=shape.resolution??shapeResolution):Uint8Array{
  const variants=maps.get(shape);if(!variants)throw new TypeError('Use a shape factory to create a contour');const n=rasterSize(resolution),cached=variants.get(n);if(cached)return cached;
  const sourceSize=shape.resolution??shapeResolution,source=variants.get(sourceSize)!,data=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const s=sample(source,sourceSize,(x+.5)/n,(y+.5)/n),d=Math.round(s[0]*256+s[1]),i=(y*n+x)*4;data.set([d>>8,d&255,Math.round(s[2]),Math.round(s[3])],i);
  }variants.set(n,data);return data;
}
export function blendShapes(a:GlassShape,b:GlassShape,progress:number):GlassShape{
  const resolution=Math.max(a.resolution??shapeResolution,b.resolution??shapeResolution),first=shapePixels(a,resolution),second=shapePixels(b,resolution),data=new Uint8Array(first.length),t=Math.max(0,Math.min(1,progress));
  for(let i=0;i<data.length;i+=4){const d=Math.round((first[i]*256+first[i+1])*(1-t)+(second[i]*256+second[i+1])*t);data[i]=d>>8;data[i+1]=d&255;data[i+2]=Math.round(first[i+2]*(1-t)+second[i+2]*t);data[i+3]=Math.round(first[i+3]*(1-t)+second[i+3]*t);}
  const shape=Object.freeze({...b,resolution});maps.set(shape,new Map([[resolution,data]]));return shape;
}
export function roundedShape(width:number,height:number,radius:number):GlassShape{
  const rx=Math.min(radius,width/2)/width*100,ry=Math.min(radius,height/2)/height*100;
  return createGlassShape({path:`M ${rx} 0 H ${100-rx} Q 100 0 100 ${ry} V ${100-ry} Q 100 100 ${100-ry} 100 H ${rx} Q 0 100 0 ${100-ry} V ${ry} Q 0 0 ${rx} 0 Z`});
}
export function shapeContains(shape:GlassShape,x:number,y:number):boolean{if(x<0||x>1||y<0||y>1)return false;const s=sample(shapePixels(shape),shape.resolution??shapeResolution,x,y);return s[0]*256+s[1]<32768;}
export function shapeDistance(shape:GlassShape,x:number,y:number,width:number,height:number):number{
  const s=sample(shapePixels(shape),shape.resolution??shapeResolution,x,y),d=((s[0]*256+s[1])/65535-.5)*4,gx=(s[2]-128)/127,gy=(s[3]-128)/127,len=Math.hypot(gx,gy);
  const metric=Math.max(Math.hypot(gx/width,gy/height)/Math.max(len,.01),1/Math.max(width,height));
  return d/metric+Math.hypot((x-Math.max(0,Math.min(1,x)))*width,(y-Math.max(0,Math.min(1,y)))*height);
}
