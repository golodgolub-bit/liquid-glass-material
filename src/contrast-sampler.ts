interface Tile<T>{payload:T;x:number;y:number}
export class ContrastSampler<T>{
  private texture:WebGLTexture|null=null;private framebuffer:WebGLFramebuffer|null=null;
  private width=0;private height=0;private columns=1;private tiles:Tile<T>[]=[];
  private flight:{buffer:WebGLBuffer;fence:WebGLSync;tiles:Tile<T>[];width:number;height:number}|null=null;
  readonly tileSize=16;
  constructor(private gl:WebGL2RenderingContext,private maxTextureSize:number){}
  get pending():boolean{return!!this.flight;}
  get bytes():number{return this.width*this.height*4+(this.flight?this.flight.width*this.flight.height*4:0);}
  begin(count:number):boolean{
    if(this.flight||!count)return false;const gl=this.gl,n=this.tileSize;
    this.columns=Math.min(count,Math.floor(this.maxTextureSize/n));const width=this.columns*n,height=Math.ceil(count/this.columns)*n;
    if(height>this.maxTextureSize)throw new RangeError('Contrast sample atlas exceeds GPU capacity');
    if(!this.texture){this.texture=gl.createTexture();this.framebuffer=gl.createFramebuffer();}
    if(width!==this.width||height!==this.height){
      gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Unable to allocate contrast atlas');
      this.width=width;this.height=height;
    }
    this.tiles=[];return true;
  }
  /** Copies the material result BEFORE its own local foreground content is drawn. */
  capture(source:WebGLFramebuffer|null,rect:readonly[number,number,number,number],payload:T):void{
    if(rect[2]<=rect[0]||rect[3]<=rect[1])return;
    const gl=this.gl,n=this.tileSize,index=this.tiles.length,x=index%this.columns*n,y=Math.floor(index/this.columns)*n;
    gl.disable(gl.SCISSOR_TEST);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,source);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.framebuffer);
    gl.blitFramebuffer(...rect,x,y,x+n,y+n,gl.COLOR_BUFFER_BIT,gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER,source);gl.enable(gl.SCISSOR_TEST);this.tiles.push({payload,x,y});
  }
  submit():void{
    if(!this.tiles.length)return;const gl=this.gl,buffer=gl.createBuffer()!;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.framebuffer);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,buffer);
    gl.bufferData(gl.PIXEL_PACK_BUFFER,this.width*this.height*4,gl.STREAM_READ);
    gl.readPixels(0,0,this.width,this.height,gl.RGBA,gl.UNSIGNED_BYTE,0);
    // The renderer submits inside rAF; the following frame boundary flushes commands.
    const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0)!;gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);
    this.flight={buffer,fence,tiles:this.tiles,width:this.width,height:this.height};this.tiles=[];
  }
  poll():{payload:T;pixels:Uint8Array}[]|null{
    if(!this.flight)return null;const gl=this.gl,f=this.flight,status=gl.clientWaitSync(f.fence,0,0);
    if(status===gl.TIMEOUT_EXPIRED)return null;
    if(status===gl.WAIT_FAILED){gl.deleteSync(f.fence);gl.deleteBuffer(f.buffer);this.flight=null;return[];}
    const all=new Uint8Array(f.width*f.height*4);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,f.buffer);gl.getBufferSubData(gl.PIXEL_PACK_BUFFER,0,all);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);
    gl.deleteSync(f.fence);gl.deleteBuffer(f.buffer);this.flight=null;
    return f.tiles.map(tile=>{const pixels=new Uint8Array(this.tileSize**2*4);for(let y=0;y<this.tileSize;y++)pixels.set(all.subarray(((tile.y+y)*f.width+tile.x)*4,((tile.y+y)*f.width+tile.x+this.tileSize)*4),y*this.tileSize*4);return{payload:tile.payload,pixels};});
  }
  dispose():void{const gl=this.gl;if(this.flight){gl.deleteSync(this.flight.fence);gl.deleteBuffer(this.flight.buffer);}gl.deleteTexture(this.texture);gl.deleteFramebuffer(this.framebuffer);this.flight=null;this.texture=this.framebuffer=null;}
}
