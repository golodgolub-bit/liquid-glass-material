import {vertex} from './shaders.js';
interface Tile<T>{payload:T;x:number;y:number}
interface RangeTarget{framebuffer:WebGLFramebuffer;low:WebGLTexture;high:WebGLTexture;width:number;height:number}
const reduceFragment=`#version 300 es
precision highp float;
uniform sampler2D lowSource;uniform sampler2D highSource;
uniform ivec2 sourceSize;uniform bool firstPass;
layout(location=0) out vec4 lowColor;layout(location=1) out vec4 highColor;
void main(){
  ivec2 start=ivec2(gl_FragCoord.xy)*4;
  vec3 lo=vec3(1),hi=vec3(0);
  for(int y=0;y<4;y++)for(int x=0;x<4;x++){
    ivec2 p=min(start+ivec2(x,y),sourceSize-1);
    vec3 a=texelFetch(lowSource,p,0).rgb;
    vec3 b=firstPass?a:texelFetch(highSource,p,0).rgb;
    lo=min(lo,a);hi=max(hi,b);
  }
  lowColor=vec4(lo,1);highColor=vec4(hi,1);
}`;
/** Conservative RGB bounds, with no filtered or skipped source pixels. */
export class ContrastSampler<T>{
  private texture:WebGLTexture|null=null;private framebuffer:WebGLFramebuffer|null=null;
  private width=0;private height=0;private columns=1;private tiles:Tile<T>[]=[];
  private scratch:{texture:WebGLTexture;framebuffer:WebGLFramebuffer;width:number;height:number}|null=null;
  private ranges:RangeTarget[]=[];private program:WebGLProgram|null=null;
  private uniforms:{low:WebGLUniformLocation|null;high:WebGLUniformLocation|null;size:WebGLUniformLocation|null;first:WebGLUniformLocation|null}|null=null;
  private flight:{buffer:WebGLBuffer;fence:WebGLSync;tiles:Tile<T>[];width:number;height:number}|null=null;
  // A 32-cell bound tile covers controls up to 128 render pixels in one pass.
  readonly tileSize=32;
  constructor(private gl:WebGL2RenderingContext,private maxTextureSize:number){}
  get pending():boolean{return!!this.flight;}
  get bytes():number{return this.width*this.height*4+(this.flight?this.flight.width*this.flight.height*4:0)+(this.scratch?this.scratch.width*this.scratch.height*4:0)+this.ranges.reduce((n,t)=>n+t.width*t.height*8,0);}
  private makeTexture(width:number,height:number):WebGLTexture{
    const gl=this.gl,t=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return t;
  }
  private checkTarget():void{const gl=this.gl;if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Unable to allocate contrast reduction target');}
  private prepare(width:number,height:number):void{
    const gl=this.gl;
    if(!this.program){
      const p=gl.createProgram()!;this.program=p;
      for(const [type,source]of[[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,reduceFragment]]as const){
        const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);
        if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(`Contrast shader: ${error}`);}
        gl.attachShader(p,s);gl.deleteShader(s);
      }
      gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(`Contrast program: ${gl.getProgramInfoLog(p)}`);
      this.uniforms={low:gl.getUniformLocation(p,'lowSource'),high:gl.getUniformLocation(p,'highSource'),size:gl.getUniformLocation(p,'sourceSize'),first:gl.getUniformLocation(p,'firstPass')};
    }
    if(this.scratch&&width<=this.scratch.width&&height<=this.scratch.height)return;
    // Grow shared storage, rather than retaining a full-size copy per surface.
    const w=Math.min(this.maxTextureSize,2**Math.ceil(Math.log2(Math.max(width,this.scratch?.width??1)))),h=Math.min(this.maxTextureSize,2**Math.ceil(Math.log2(Math.max(height,this.scratch?.height??1))));
    if(this.scratch){gl.deleteTexture(this.scratch.texture);gl.deleteFramebuffer(this.scratch.framebuffer);}
    for(const t of this.ranges){gl.deleteTexture(t.low);gl.deleteTexture(t.high);gl.deleteFramebuffer(t.framebuffer);}this.ranges=[];
    const texture=this.makeTexture(w,h),framebuffer=gl.createFramebuffer()!;gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);this.checkTarget();
    this.scratch={texture,framebuffer,width:w,height:h};
    for(const divisor of[4,16]){
      const rw=Math.max(1,Math.ceil(w/divisor)),rh=Math.max(1,Math.ceil(h/divisor)),low=this.makeTexture(rw,rh),high=this.makeTexture(rw,rh),f=gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,low,0);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,high,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);this.checkTarget();
      this.ranges.push({framebuffer:f,low,high,width:rw,height:rh});
    }
  }
  begin(count:number):boolean{
    if(this.flight||!count)return false;const gl=this.gl,n=this.tileSize;
    this.columns=Math.min(count,Math.floor(this.maxTextureSize/n));const width=this.columns*n,height=Math.ceil(count/this.columns)*n*2;
    if(height>this.maxTextureSize)throw new RangeError('Contrast sample atlas exceeds GPU capacity');
    if(!this.texture){this.texture=gl.createTexture();this.framebuffer=gl.createFramebuffer();}
    if(width!==this.width||height!==this.height){
      gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);this.checkTarget();this.width=width;this.height=height;
    }
    this.tiles=[];return true;
  }
  /** Captures before own foreground. Caller restores its program, textures 0/1,
   * viewport, blending, scissor and dithering after all captures for a draw group. */
  capture(source:WebGLFramebuffer|null,rect:readonly[number,number,number,number],payload:T):number{
    if(rect[2]<=rect[0]||rect[3]<=rect[1])return 0;
    const gl=this.gl,n=this.tileSize,index=this.tiles.length,x=index%this.columns*n,y=Math.floor(index/this.columns)*n*2;
    let w=rect[2]-rect[0],h=rect[3]-rect[1];gl.activeTexture(gl.TEXTURE0);this.prepare(w,h);
    gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);gl.disable(gl.DITHER);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,source);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.scratch!.framebuffer);
    gl.blitFramebuffer(...rect,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);
    gl.useProgram(this.program);gl.uniform1i(this.uniforms!.low,0);gl.uniform1i(this.uniforms!.high,1);
    let low=this.scratch!.texture,high=low,pass=0,target:RangeTarget;
    do{
      target=this.ranges[pass%2];gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,low);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,high);
      gl.uniform2i(this.uniforms!.size,w,h);gl.uniform1i(this.uniforms!.first,pass===0?1:0);
      w=Math.ceil(w/4);h=Math.ceil(h/4);gl.viewport(0,0,w,h);gl.drawArrays(gl.TRIANGLES,0,3);
      low=target.low;high=target.high;pass++;
    }while(w>n||h>n);
    // Upsampling only repeats cells; every reduced cell is retained.
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,target.framebuffer);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.framebuffer);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);gl.blitFramebuffer(0,0,w,h,x,y,x+n,y+n,gl.COLOR_BUFFER_BIT,gl.NEAREST);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);gl.blitFramebuffer(0,0,w,h,x,y+n,x+n,y+n*2,gl.COLOR_BUFFER_BIT,gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER,source);this.tiles.push({payload,x,y});return pass;
  }
  submit():void{
    if(!this.tiles.length)return;const gl=this.gl,buffer=gl.createBuffer()!;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.framebuffer);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,buffer);
    gl.bufferData(gl.PIXEL_PACK_BUFFER,this.width*this.height*4,gl.STREAM_READ);gl.readPixels(0,0,this.width,this.height,gl.RGBA,gl.UNSIGNED_BYTE,0);
    const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0)!;gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);
    this.flight={buffer,fence,tiles:this.tiles,width:this.width,height:this.height};this.tiles=[];
  }
  poll():{payload:T;pixels:Uint8Array}[]|null{
    if(!this.flight)return null;const gl=this.gl,f=this.flight,status=gl.clientWaitSync(f.fence,0,0);
    if(status===gl.TIMEOUT_EXPIRED)return null;
    if(status===gl.WAIT_FAILED){gl.deleteSync(f.fence);gl.deleteBuffer(f.buffer);this.flight=null;return[];}
    const all=new Uint8Array(f.width*f.height*4);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,f.buffer);gl.getBufferSubData(gl.PIXEL_PACK_BUFFER,0,all);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);
    gl.deleteSync(f.fence);gl.deleteBuffer(f.buffer);this.flight=null;
    return f.tiles.map(tile=>{
      // Collapse component bounds before allocating normalized RGB samples. A
      // surface sends only two RGB values to the solver, not 512 temporary arrays.
      const pixels=new Uint8Array([255,255,255,255,0,0,0,255]);
      for(let y=0;y<this.tileSize;y++)for(let x=0;x<this.tileSize;x++){
        const lo=((tile.y+y)*f.width+tile.x+x)*4,hi=lo+this.tileSize*f.width*4;
        for(let channel=0;channel<3;channel++){pixels[channel]=Math.min(pixels[channel],all[lo+channel]);pixels[4+channel]=Math.max(pixels[4+channel],all[hi+channel]);}
      }
      return{payload:tile.payload,pixels};
    });
  }
  dispose():void{
    const gl=this.gl;if(this.flight){gl.deleteSync(this.flight.fence);gl.deleteBuffer(this.flight.buffer);}
    if(this.scratch){gl.deleteTexture(this.scratch.texture);gl.deleteFramebuffer(this.scratch.framebuffer);}
    for(const t of this.ranges){gl.deleteTexture(t.low);gl.deleteTexture(t.high);gl.deleteFramebuffer(t.framebuffer);}
    gl.deleteTexture(this.texture);gl.deleteFramebuffer(this.framebuffer);gl.deleteProgram(this.program);this.flight=null;this.texture=this.framebuffer=null;this.program=null;this.scratch=null;this.ranges=[];
  }
}
