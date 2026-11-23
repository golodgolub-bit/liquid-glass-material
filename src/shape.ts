/** A reusable SVG contour. Curves, concave outlines and even-odd holes are supported. */
export interface GlassShape { readonly path:string; readonly viewBox:readonly [number,number]; readonly fillRule:CanvasFillRule }
const maps=new WeakMap<GlassShape,Uint8Array>();
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
function distance(mask:Uint8Array,inside:boolean){
  const n=shapeResolution,values=new Float64Array(n*n),line=new Float64Array(n);
  for(let x=0;x<n;x++){for(let y=0;y<n;y++)line[y]=(!!mask[y*n+x]===inside)?0:1e9;const d=transform(line,n);for(let y=0;y<n;y++)values[y*n+x]=d[y];}
  for(let y=0;y<n;y++){line.set(values.subarray(y*n,(y+1)*n));values.set(transform(line,n),y*n);}
  return values;
}
/** Rasterized once, uploaded once. Moving/resizing a shape never runs a CPU distance transform. */
export function createGlassShape(options:{path:string;viewBox?:readonly [number,number];fillRule?:CanvasFillRule}):GlassShape{
  const viewBox=options.viewBox??[100,100];
  if(viewBox.length!==2||viewBox.some(n=>!Number.isFinite(n)||n<=0)||!options.path)throw new RangeError('Invalid shape path or viewBox');
  const shape=Object.freeze({path:options.path,viewBox:Object.freeze([...viewBox]) as readonly[number,number],fillRule:options.fillRule??'nonzero'});
  const n=shapeResolution,canvas=document.createElement('canvas');canvas.width=canvas.height=n;
  const c=canvas.getContext('2d',{willReadFrequently:true})!;c.scale(n/viewBox[0],n/viewBox[1]);c.fill(new Path2D(shape.path),shape.fillRule);
  const pixels=c.getImageData(0,0,n,n).data,mask=new Uint8Array(n*n);for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4+3]>=128?1:0;
  if(!mask.some(Boolean)||mask.every(Boolean))throw new RangeError('Shape must have a visible boundary inside its viewBox');
  const toInside=distance(mask,true),toOutside=distance(mask,false),signed=new Float64Array(n*n);
  for(let i=0;i<signed.length;i++)signed[i]=(mask[i]?-(Math.sqrt(toOutside[i])-.5):Math.sqrt(toInside[i])-.5)/n;
  const data=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=y*n+x,d=Math.max(0,Math.min(65535,Math.round((signed[i]/4+.5)*65535)));
    const gx=signed[y*n+Math.min(n-1,x+1)]-signed[y*n+Math.max(0,x-1)],gy=signed[Math.min(n-1,y+1)*n+x]-signed[Math.max(0,y-1)*n+x],len=Math.hypot(gx,gy)||1;
    data.set([d>>8,d&255,Math.round((gx/len*.5+.5)*255),Math.round((gy/len*.5+.5)*255)],i*4);
  }
  maps.set(shape,data);return shape;
}
export function shapePixels(shape:GlassShape):Uint8Array{const data=maps.get(shape);if(!data)throw new TypeError('Use createGlassShape to create a contour');return data;}
export function blendShapes(a:GlassShape,b:GlassShape,progress:number):GlassShape{
  const first=shapePixels(a),second=shapePixels(b),data=new Uint8Array(first.length),t=Math.max(0,Math.min(1,progress));
  for(let i=0;i<data.length;i+=4){const d=Math.round((first[i]*256+first[i+1])*(1-t)+(second[i]*256+second[i+1])*t);data[i]=d>>8;data[i+1]=d&255;data[i+2]=Math.round(first[i+2]*(1-t)+second[i+2]*t);data[i+3]=Math.round(first[i+3]*(1-t)+second[i+3]*t);}
  const shape=Object.freeze({...b});maps.set(shape,data);return shape;
}
export function roundedShape(width:number,height:number,radius:number):GlassShape{
  const rx=Math.min(radius,width/2)/width*100,ry=Math.min(radius,height/2)/height*100;
  return createGlassShape({path:`M ${rx} 0 H ${100-rx} Q 100 0 100 ${ry} V ${100-ry} Q 100 100 ${100-rx} 100 H ${rx} Q 0 100 0 ${100-ry} V ${ry} Q 0 0 ${rx} 0 Z`});
}
export function shapeContains(shape:GlassShape,x:number,y:number):boolean{
  if(x<0||x>1||y<0||y>1)return false;
  const data=shapePixels(shape),i=(Math.min(255,Math.floor(y*256))*256+Math.min(255,Math.floor(x*256)))*4;
  return data[i]*256+data[i+1]<32768;
}
export function shapeDistance(shape:GlassShape,x:number,y:number,width:number,height:number):number{
  const data=shapePixels(shape),px=Math.max(0,Math.min(255,Math.floor(x*256))),py=Math.max(0,Math.min(255,Math.floor(y*256))),i=(py*256+px)*4;
  const d=((data[i]*256+data[i+1])/65535-.5)*4,gx=(data[i+2]/255*2-1)/width,gy=(data[i+3]/255*2-1)/height;
  return d/Math.max(Math.hypot(gx,gy),.00001)+Math.hypot((x-Math.max(0,Math.min(1,x)))*width,(y-Math.max(0,Math.min(1,y)))*height);
}
