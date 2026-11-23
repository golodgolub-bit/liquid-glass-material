import { createMaterial,materialRanges, type GlassMaterial, type Quality, type RGB } from './material.js';
import { Spring } from './spring.js';
import { validateRect, type Rect } from './geometry.js';
import { vertex, blurFragment } from './shaders.js';
import {createGlassShader,validateShaderValue,type GlassShader,type ShaderValue}from'./shader-program.js';
import {createPhysics,type GlassPhysics,type PhysicsOptions,type DeformationFunction}from'./physics.js';
import { configureSpring, isResting, type MotionOptions, type MotionResult, type SpringOptions } from './motion.js';
import {shapePixels,shapeDistance,shapeResolution,blendShapes,roundedShape,type GlassShape} from './shape.js';
import {GlassAnimation,type AnimationCallback,type AnimationOptions} from './animation.js';

/** Canvas/image/video sources with consistent WebGL upload orientation. Draw ImageBitmap/ImageData/VideoFrame into a canvas first. */
export type BackdropSource = HTMLCanvasElement | OffscreenCanvas | HTMLImageElement | HTMLVideoElement;

export interface Accessibility { reducedMotion: boolean; reducedTransparency: boolean; increasedContrast: boolean }
export interface ScrollEdges {top:number;right:number;bottom:number;left:number;hard:boolean;color:RGB|null}
export interface RendererOptions {
  quality?: Quality;
  maxPixelRatio?: number;
  drawBackdrop?: boolean;
  accessibility?: Partial<Accessibility>;
  /** Optional asynchronous timer queries. CPU submission time is always available. */
  measureGpu?: boolean;
  onError?: (error: Error) => void;
  physics?:PhysicsOptions;
  shader?:GlassShader;
}
export interface SurfaceOptions {
  id: string;
  rect: Rect;
  material?: Partial<GlassMaterial>;
  /** Same group => shared material and SDF union. One material per group. */
  group?: string;
  spacing?: number;
  interactive?: boolean;
  materialize?: boolean;
  hidden?: boolean;
  /** Keep velocity-driven stretch for draggable objects; disable for a rigid panel. */
  elastic?: boolean;
  /** Composite the optional vibrant foreground through this surface's lens. */
  vibrancy?:boolean;
  /** Back-to-front order. Equal layers retain insertion order. A union shares one layer. */
  layer?:number;
  /** SVG contour in place of the rounded rectangle; fitted to rect. */
  shape?:GlassShape;
  /** Local transparent content, painted above this material and visible to higher glass layers. */
  content?:BackdropSource;
  physics?:PhysicsOptions;
  deform?:DeformationFunction;
}
export interface SurfaceState { rect: Rect; visualRect: Rect; velocity:Rect;visibility: number; pressed: number; energy: number; moving: boolean; material: Readonly<GlassMaterial> }
export interface RenderStats {
  frames: number; cpuMs: number; gpuMs: number | null;
  drawCalls: number; uploads: number; blurPasses: number;
  surfaces: number; groups: number; pixelRatio: number; textureBytes: number;foregroundUploads:number;reflectionUploads:number;
}
type Motion = { [K in keyof Rect]: Spring };
interface Surface {
  id: string; group: string; motion: Motion; press: Spring; reveal: Spring;
  material: Readonly<GlassMaterial>; spacing: number; interactive: boolean;
  pointer: [number, number]; tone: Spring; fixedTone?: number; detail: number;
  offsetX: Spring; offsetY: Spring; impulse: Spring; impulseAge: number; pressed: boolean; elastic: boolean;
  materialMotion: Map<string,Spring>; variantMix: Spring;
  waiters: Set<(result: MotionResult)=>void>;
  vibrancy:boolean;
  layer:number;shape:GlassShape|null;shapeFrom:GlassShape|null;shapeMix:Spring;content:BackdropSource|null;contentTexture?:WebGLTexture;contentDirty:boolean;contentBytes:number;
  physics:Readonly<GlassPhysics>;deform:DeformationFunction|null;
}
const materialKeys = ['thickness','edgeWidth','bevel','edgeContrast','refraction','magnification','dispersion','ior','reflection','cornerPower','frost','tintOpacity','saturation','highlight','shadow','dimming'] as const;
interface Program { handle: WebGLProgram; uniforms: Map<string, WebGLUniformLocation | null> }
interface Target { texture: WebGLTexture; framebuffer: WebGLFramebuffer }
interface TimerExtension { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }
const rectKeys = ['x', 'y', 'width', 'height', 'radius'] as const;
const profiles = { low: { ratio: 1, blurScale: 0.25 }, balanced: { ratio: 1.5, blurScale: 0.5 }, high: { ratio: 2, blurScale: 0.5 } };

/** A shared backdrop and GPU compositor. Owns no DOM content or application event loop. */
export class GlassRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private maxTextureSize=1;
  private options: RendererOptions;
  private quality: Quality;
  private width = 1; private height = 1; private ratio = 1;
  private blurWidth = 1; private blurHeight = 1;
  private blurWeights=new Float32Array(7);
  private wideWidth=1;private wideHeight=1;private wideWeights=new Float32Array([.137022816,.129618031,.109719294,.083108539,.056331764,.034166942,.018544022]);
  private programs!: { copy: Program; blur: Program; glass: Program };
  private texture!: WebGLTexture;
  private vibrantTexture!:WebGLTexture;private vibrantSource:BackdropSource|null=null;private vibrantDirty=false;private vibrantWidth=1;private vibrantHeight=1;
  private vibrantColor:RGB|null=null;
  private reflectionTexture!:WebGLTexture;private reflectionSource:BackdropSource|null=null;private reflectionDirty=false;private reflectionReady=false;private reflectionWidth=1;private reflectionHeight=1;private reflectionRotation=0;
  private animations=new Set<GlassAnimation>();
  private shader:GlassShader=createGlassShader();private shaderValues=new Map<string,ShaderValue>();
  private physicsDefaults=createPhysics();
  private targets: Target[] = [];
  private vao: WebGLVertexArrayObject | null = null;
  private source: BackdropSource | null = null;
  private sourceWidth = 0; private sourceHeight = 0;
  private backdropDirty = false; private blurDirty = false;
  private surfaces = new Map<string, Surface>();
  private frame = 0; private lastTime = 0;
  private disposed = false; private lost = false;
  private listeners = new Set<(stats: Readonly<RenderStats>) => void>();
  private cleanup: (() => void)[] = [];
  private sampleCanvas: HTMLCanvasElement;
  private sample: Uint8ClampedArray | null = null;
  private shapes = new Float32Array(128); private radii = new Float32Array(32);
  private reveals = new Float32Array(32);
  private shapeIndices=new Int32Array(32);
  private shapeFromIndices=new Int32Array(32);private shapeBlends=new Float32Array(32);
  private shapeTexture!:WebGLTexture;private shapeAtlas:GlassShape[]=[];private shapeAtlasDirty=true;
  private timer: TimerExtension | null = null;
  private queries: WebGLQuery[] = [];
  private light: [number, number] = [-0.65, -0.76];
  private lightAngle=new Spring(Math.atan2(-.76,-.65),3,1);
  private edges:ScrollEdges={top:0,right:0,bottom:0,left:0,hard:false,color:null};
  private settings: Accessibility;
  private overrides: Partial<Accessibility>;
  private media: MediaQueryList[];
  private metrics: RenderStats = { frames: 0, cpuMs: 0, gpuMs: null, drawCalls: 0, uploads: 0, blurPasses: 0, surfaces: 0, groups: 0, pixelRatio: 1, textureBytes: 0,foregroundUploads:0,reflectionUploads:0 };

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.canvas = canvas; this.options = options; this.quality = options.quality ?? 'balanced';
    this.physicsDefaults=createPhysics(options.physics);
    if(options.shader){this.shader=createGlassShader({fragment:options.shader.fragment,blurFragment:options.shader.blurFragment,backdropFragment:options.shader.backdropFragment,uniforms:options.shader.uniforms});for(const[name,u]of Object.entries(this.shader.uniforms))this.shaderValues.set(name,u.value);}
    this.validateQuality(this.quality);
    if (options.maxPixelRatio !== undefined && (!Number.isFinite(options.maxPixelRatio) || options.maxPixelRatio <= 0)) throw new RangeError('maxPixelRatio must be positive');
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'default' });
    if (!gl) throw new Error('WebGL 2 is unavailable. Use the CSS fallback or a hardware-accelerated WebView.');
    this.gl = gl;
    this.sampleCanvas = document.createElement('canvas'); this.sampleCanvas.width = this.sampleCanvas.height = 48;
    this.media = ['(prefers-reduced-motion: reduce)', '(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)'].map(q => matchMedia(q));
    this.overrides = { ...options.accessibility };
    this.settings = { reducedMotion: false, reducedTransparency: false, increasedContrast: false };
    const accessibilityChanged = () => { this.readAccessibility(); this.invalidate(); };
    for (const q of this.media) { q.addEventListener('change', accessibilityChanged); this.cleanup.push(() => q.removeEventListener('change', accessibilityChanged)); }
    this.readAccessibility();
    const visibility = () => {for(const a of this.animations)a.suspend();if (document.hidden) {this.releaseInteractions();cancelAnimationFrame(this.frame); this.frame = 0; } else { this.lastTime = 0; this.invalidate(); } };
    document.addEventListener('visibilitychange', visibility); this.cleanup.push(() => document.removeEventListener('visibilitychange', visibility));
    const contextLost = (event: Event) => {
      event.preventDefault(); this.lost = true; cancelAnimationFrame(this.frame); this.frame = 0;
      for(const a of this.animations)a.suspend();
      this.canvas.dataset.glassContext = 'lost';
    };
    const restored = () => {
      this.lost = false; this.sourceWidth = this.sourceHeight = 0;
      this.initialize(); this.allocateTargets(); this.backdropDirty = !!this.source;
      this.vibrantDirty=!!this.vibrantSource;
      this.reflectionDirty=!!this.reflectionSource;this.lastTime=0;
      this.canvas.dataset.glassContext = 'ready'; this.invalidate();
    };
    canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('webglcontextrestored', restored);
    this.cleanup.push(() => { canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', restored); });
    try { this.initialize(); this.resize(canvas.clientWidth || 1, canvas.clientHeight || 1); }
    catch (error) { this.dispose(); throw error; }
    canvas.dataset.glassContext = 'ready';
  }
  private assertAlive() { if (this.disposed) throw new Error('GlassRenderer has been disposed'); }
  private validateQuality(quality: string): asserts quality is Quality { if (!(quality in profiles)) throw new TypeError('Unknown quality'); }
  private readAccessibility() {
    this.settings = {
      reducedMotion: this.overrides.reducedMotion ?? this.media[0].matches,
      reducedTransparency: this.overrides.reducedTransparency ?? this.media[1].matches,
      increasedContrast: this.overrides.increasedContrast ?? this.media[2].matches,
    };
  }
  get accessibility(): Readonly<Accessibility> { return { ...this.settings }; }
  get stats(): Readonly<RenderStats> { return { ...this.metrics }; }
  get size(): Readonly<{ width: number; height: number }> { return { width: this.width, height: this.height }; }
  get scrollEdges():Readonly<ScrollEdges>{return{...this.edges};}
  setScrollEdges(options:Partial<ScrollEdges>):void{
    this.assertAlive();const next={...this.edges,...options};
    for(const key of ['top','right','bottom','left']as const)if(!Number.isFinite(next[key])||next[key]<0)throw new RangeError('Invalid scroll edge extent');
    if(next.color&&(next.color.length!==3||next.color.some(n=>!Number.isFinite(n)||n<0||n>1)))throw new RangeError('Invalid scroll edge color');
    this.edges=next;this.invalidate();
  }
  subscribe(listener: (stats: Readonly<RenderStats>) => void): () => void { this.assertAlive(); this.listeners.add(listener); return () => this.listeners.delete(listener); }
  setAccessibility(settings: Partial<Accessibility>): void { this.assertAlive(); this.overrides = { ...this.overrides, ...settings }; this.readAccessibility(); this.invalidate(); }
  setQuality(quality: Quality): void { this.assertAlive(); this.validateQuality(quality); this.quality = quality; this.resize(this.width, this.height); }
  setLight(x: number, y: number,animate=true): void {
    this.assertAlive();const length=Math.hypot(x,y);if(!Number.isFinite(length)||length<.001)throw new RangeError('Light must be a nonzero finite direction');
    const angle=Math.atan2(y,x),delta=Math.atan2(Math.sin(angle-this.lightAngle.target),Math.cos(angle-this.lightAngle.target));
    this.lightAngle.target+=delta;if(!animate||this.settings.reducedMotion)this.lightAngle.snap();this.invalidate();
  }
  resize(width: number, height: number): void {
    this.assertAlive(); if (!Number.isFinite(width + height) || width <= 0 || height <= 0) throw new RangeError('Invalid viewport size');
    this.width = width; this.height = height;
    const maxTexture = this.maxTextureSize;
    this.ratio = Math.min(devicePixelRatio || 1, this.options.maxPixelRatio ?? profiles[this.quality].ratio, maxTexture / width, maxTexture / height);
    this.canvas.width = Math.max(1, Math.round(width * this.ratio)); this.canvas.height = Math.max(1, Math.round(height * this.ratio));
    const scale = profiles[this.quality].blurScale;
    this.blurWidth = Math.max(1, Math.round(width * scale)); this.blurHeight = Math.max(1, Math.round(height * scale));
    this.wideWidth=Math.max(1,Math.round(width*.25));this.wideHeight=Math.max(1,Math.round(height*.25));
    const sigma=6*scale;let total=0;for(let i=0;i<7;i++){const weight=Math.exp(-i*i/(2*sigma*sigma));this.blurWeights[i]=weight;total+=weight*(i?2:1);}for(let i=0;i<7;i++)this.blurWeights[i]/=total;
    if (!this.lost) this.allocateTargets();
    this.blurDirty = true; this.invalidate();
  }
  /** Source is stretched to the viewport; perform cover/contain cropping in your source canvas. */
  setBackdrop(source: BackdropSource): void {
    this.assertAlive(); this.source = source; this.backdropDirty = true; this.invalidate();
  }
  /** Full-viewport RGBA layer (e.g. blue active symbols) refracted only by vibrancy-enabled surfaces. */
  setVibrancySource(source:BackdropSource|null,options:{color?:RGB}={}):void{
    this.assertAlive();if(options.color&&(options.color.length!==3||options.color.some(n=>!Number.isFinite(n)||n<0||n>1)))throw new RangeError('Invalid vibrancy color');
    this.vibrantSource=source;this.vibrantColor=options.color??null;this.vibrantDirty=true;this.invalidate();
  }
  /** A separate equirectangular reflection environment. Null returns to reflected backdrop. */
  setReflectionSource(source:BackdropSource|null):void{this.assertAlive();this.reflectionSource=source;this.reflectionDirty=true;this.invalidate();}
  updateReflection():void{this.assertAlive();if(this.reflectionSource){this.reflectionDirty=true;this.invalidate();}}
  setReflectionRotation(radians:number):void{this.assertAlive();if(!Number.isFinite(radians))throw new RangeError('Reflection rotation must be finite');this.reflectionRotation=radians%(Math.PI*2);this.invalidate();}
  /** Run before spring integration and drawing, using the renderer's single scheduler. */
  addAnimation(callback:AnimationCallback,options:AnimationOptions={}):GlassAnimation{
    this.assertAlive();if(typeof callback!=='function')throw new TypeError('Animation callback required');
    const animation=new GlassAnimation(callback,()=>{if(!this.frame)this.lastTime=0;this.invalidate();},()=>this.animations.delete(animation),options.essential??false,options.paused??false);
    this.animations.add(animation);this.invalidate();return animation;
  }
  /** Call after modifying a source canvas. Does not upload unchanged pixels on animation frames. */
  updateBackdrop(): void { this.assertAlive(); if (this.source) { this.backdropDirty = true; this.invalidate(); } }
  /** Video uploads are scheduled by decoded frames rather than the display refresh rate. */
  bindVideo(video: HTMLVideoElement): () => void {
    this.assertAlive(); let stopped = false; let token = 0;
    const tick = () => {
      if (stopped || this.disposed) return;
      if (video.readyState >= 2) this.setBackdrop(video);
      token = video.requestVideoFrameCallback(tick);
    };
    if (!video.requestVideoFrameCallback) throw new Error('requestVideoFrameCallback is required; call updateBackdrop on decoded video frames in older hosts');
    token = video.requestVideoFrameCallback(tick);
    const stop = () => { stopped = true; video.cancelVideoFrameCallback(token); };
    this.cleanup.push(stop); return stop;
  }
  addSurface(options: SurfaceOptions): SurfaceHandle {
    this.assertAlive(); validateRect(options.rect);
    if (!options.id || this.surfaces.has(options.id)) throw new Error('Surface id must be nonempty and unique');
    const group = options.group ?? options.id;
    const peers = [...this.surfaces.values()].filter(s => s.group === group);
    const layer=options.layer??peers[0]?.layer??0;
    if(!Number.isFinite(layer))throw new RangeError('Layer must be finite');
    if(peers.length&&layer!==peers[0].layer)throw new Error('Merged surfaces must share a layer');
    if(options.shape)shapePixels(options.shape);
    if (peers.length >= 32) throw new RangeError('A group supports at most 32 surfaces');
    const vibrancy=options.vibrancy??peers[0]?.vibrancy??false;
    if(peers.length&&vibrancy!==peers[0].vibrancy)throw new Error('Merged surfaces must share foreground mode');
    const material = createMaterial(options.material ?? peers[0]?.material);
    if (peers.length && JSON.stringify(material) !== JSON.stringify(peers[0].material)) throw new Error('Merged surfaces must share the same material');
    const spacing = options.spacing ?? peers[0]?.spacing ?? 0;
    if (!Number.isFinite(spacing) || spacing < 0 || spacing > 100) throw new RangeError('Spacing must be in [0,100]');
    if (peers.length && spacing !== peers[0].spacing) throw new Error('Merged surfaces must share spacing');
    const physics=createPhysics(options.physics,this.physicsDefaults),spring=(value:number,key:keyof Pick<GlassPhysics,'geometry'|'material'|'press'|'reveal'|'offset'|'impulse'|'tone'|'shape'>)=>new Spring(value,physics[key].frequency,physics[key].damping);
    const motion = Object.fromEntries(rectKeys.map(k => [k, spring(options.rect[k],'geometry')])) as Motion;
    const reveal = spring(options.hidden || options.materialize && !this.settings.reducedMotion ? 0 : 1,'reveal'); reveal.target = options.hidden?0:1;
    const materialMotion = new Map<string,Spring>(materialKeys.map(k=>[k,spring(material[k],'material')]));
    material.tint.forEach((n,i)=>materialMotion.set(`tint${i}`,spring(n,'material')));
    const surface: Surface = { id: options.id, group, motion, press: spring(0,'press'), reveal, material, spacing, interactive: options.interactive ?? true, pointer: [options.rect.x + options.rect.width/2, options.rect.y + options.rect.height/2], tone: spring(0,'tone'), detail: 0,
      offsetX:spring(0,'offset'),offsetY:spring(0,'offset'),impulse:spring(0,'impulse'),impulseAge:0,pressed:false,elastic:options.elastic??true,
      materialMotion,variantMix:spring(material.variant==='clear'?1:0,'material'),waiters:new Set(),vibrancy,
      layer,shape:options.shape??null,shapeFrom:null,shapeMix:spring(1,'shape'),content:options.content??null,contentDirty:!!options.content,contentBytes:0,physics,deform:options.deform??null,
    };
    this.surfaces.set(options.id, surface); this.adaptSurface(surface, true); this.invalidate();
    return new SurfaceHandle(this, options.id);
  }
  getRect(id: string): Rect {
    const s = this.surface(id), rect = Object.fromEntries(rectKeys.map(k => [k, s.motion[k].value])) as unknown as Rect;
    // An underdamped shrink may overshoot a tiny positive target.
    rect.width = Math.max(0.01,rect.width); rect.height = Math.max(0.01,rect.height); rect.radius = Math.max(0,rect.radius);
    return rect;
  }
  getForeground(id: string): string {
    const s = this.surface(id), m = s.material;
    const dark = m.appearance==='auto'?s.tone.value:m.appearance==='dark'?1:0;
    const t = this.settings.increasedContrast ? +(dark>0.5) : Math.max(0,Math.min(1,dark));
    return `rgb(${Math.round(23+224*t)} ${Math.round(26+222*t)} ${Math.round(36+216*t)})`;
  }
  private springs(s: Surface): Spring[] { return [...Object.values(s.motion),s.press,s.reveal,s.tone,s.offsetX,s.offsetY,s.impulse,s.variantMix,s.shapeMix,...s.materialMotion.values()]; }
  private cancelWaiters(s: Surface) { for(const resolve of s.waiters)resolve({finished:false});s.waiters.clear(); }
  private currentMaterial(s: Surface): Readonly<GlassMaterial> {
    const numeric=Object.fromEntries(materialKeys.map(k=>[k,Math.max(materialRanges[k][0],Math.min(materialRanges[k][1],s.materialMotion.get(k)!.value))]));
    const tint=s.material.tint.map((_,i)=>Math.max(0,Math.min(1,s.materialMotion.get(`tint${i}`)!.value)))as unknown as RGB;
    return {...s.material,...numeric,tint};
  }
  private pose(s:Surface){
    const rect=this.getRect(s.id),press=this.settings.reducedMotion?0:Math.max(0,Math.min(2,s.press.value));
    const cfg=s.physics,reveal=Math.max(0,Math.min(1,s.reveal.value)),growth=cfg.revealScale+(1-cfg.revealScale)*reveal;
    const vx=this.settings.reducedMotion||!s.elastic?0:Math.min(cfg.maxStretch,Math.abs(s.motion.x.velocity)/cfg.velocityScale);
    const vy=this.settings.reducedMotion||!s.elastic?0:Math.min(cfg.maxStretch,Math.abs(s.motion.y.velocity)/cfg.velocityScale);
    const sx=growth*(1+press*cfg.pressScale[0]+vx-vy*cfg.crossCoupling),sy=growth*(1+press*cfg.pressScale[1]+vy-vx*cfg.crossCoupling);
    const width=rect.width*sx,height=rect.height*sy;
    let visualRect={x:rect.x+(rect.width-width)/2+s.offsetX.value,y:rect.y+(rect.height-height)/2+s.offsetY.value,width,height,radius:Math.min(rect.radius*Math.min(sx,sy),width/2,height/2)};
    if(s.deform&&!this.settings.reducedMotion){visualRect={...s.deform(Object.freeze({rect:Object.freeze({...rect}),visualRect:Object.freeze({...visualRect}),velocity:Object.freeze(this.velocity(s)),pressed:press,visibility:reveal,offset:Object.freeze([s.offsetX.value,s.offsetY.value])as readonly[number,number]}))};validateRect(visualRect);}
    return {rect,visualRect,visibility:reveal,pressed:press,energy:Math.abs(s.impulse.value)};
  }
  private velocity(s:Surface):Rect{return Object.fromEntries(rectKeys.map(k=>[k,s.motion[k].velocity]))as unknown as Rect;}
  getState(id: string): SurfaceState {const s=this.surface(id);return{...this.pose(s),velocity:this.velocity(s),moving:this.springs(s).some(spring=>!isResting(spring)),material:this.currentMaterial(s)};}
  getPhysics(id:string):Readonly<GlassPhysics>{return this.surface(id).physics;}
  configurePhysics(id:string,options:PhysicsOptions):void{
    this.assertAlive();const s=this.surface(id),cfg=createPhysics(options,s.physics);
    const channels={geometry:Object.values(s.motion),material:[...s.materialMotion.values(),s.variantMix],press:[s.press],reveal:[s.reveal],offset:[s.offsetX,s.offsetY],impulse:[s.impulse],tone:[s.tone],shape:[s.shapeMix]};
    for(const key of Object.keys(channels)as(keyof typeof channels)[])if(options[key])for(const spring of channels[key])configureSpring(spring,cfg[key]);
    s.physics=cfg;this.setInteraction(id,s.pressed);this.invalidate();
  }
  setDeformation(id:string,fn:DeformationFunction|null):void{this.assertAlive();if(fn!==null&&typeof fn!=='function')throw new TypeError('Deformation must be a function or null');this.surface(id).deform=fn;this.invalidate();}
  kick(id:string,velocity:Partial<Rect>):void{
    this.assertAlive();const s=this.surface(id);for(const key of rectKeys)if(velocity[key]!==undefined&&!Number.isFinite(velocity[key]))throw new RangeError('Velocity must be finite');
    if(!this.settings.reducedMotion)for(const key of rectKeys)s.motion[key].velocity+=velocity[key]??0;this.invalidate();
  }
  whenSettled(id: string): Promise<MotionResult> {
    this.assertAlive();const s=this.surface(id);
    if(this.springs(s).every(isResting))return Promise.resolve({finished:true});
    return new Promise(resolve=>{s.waiters.add(resolve);this.invalidate();});
  }
  animateSurface(id: string,rect: Partial<Rect>,options: MotionOptions = {}): Promise<MotionResult> {
    const s=this.surface(id);if(options.spring)this.configureMotion(id,options.spring);
    this.updateSurface(id,rect,!options.immediate);return this.whenSettled(id);
  }
  configureMotion(id:string,options:SpringOptions):void{this.assertAlive();const s=this.surface(id);const cfg=createPhysics({geometry:options},s.physics);for(const spring of Object.values(s.motion))configureSpring(spring,cfg.geometry);s.physics=cfg;this.invalidate();}
  setVisibility(id: string,visible: boolean,options: MotionOptions = {}): Promise<MotionResult> {
    this.assertAlive();const s=this.surface(id);this.cancelWaiters(s);configureSpring(s.reveal,options.spring);s.reveal.target=visible?1:0;
    if(!visible){s.press.target=0;s.offsetX.target=s.offsetY.target=0;s.pressed=false;}
    if(options.immediate||this.settings.reducedMotion)s.reveal.snap();this.invalidate();return this.whenSettled(id);
  }
  updateSurface(id: string, rect: Partial<Rect>, animate = true): void {
    this.assertAlive(); const s = this.surface(id), next = Object.fromEntries(rectKeys.map(k => [k, rect[k] ?? s.motion[k].target])) as unknown as Rect;
    validateRect(next);
    this.cancelWaiters(s);
    for (const k of rectKeys) { s.motion[k].target = next[k]; if (!animate || this.settings.reducedMotion) s.motion[k].snap(); }
    this.adaptSurface(s); this.invalidate();
  }
  /** Updates every member of the group, keeping the optical union consistent. */
  setMaterial(id: string, options: Partial<GlassMaterial>, animate = true): void {
    this.assertAlive(); const s = this.surface(id);
    const base = options.variant !== undefined && options.variant !== s.material.variant ? createMaterial({ variant: options.variant }) : s.material;
    const material = createMaterial({ ...base, ...options });
    for (const peer of this.surfaces.values()) if (peer.group === s.group) {
      this.cancelWaiters(peer);peer.material = material;peer.fixedTone = undefined;
      for(const k of materialKeys)peer.materialMotion.get(k)!.target=material[k];
      material.tint.forEach((n,i)=>peer.materialMotion.get(`tint${i}`)!.target=n);
      peer.variantMix.target=material.variant==='clear'?1:0;this.adaptSurface(peer);
      if(!animate||this.settings.reducedMotion)for(const spring of [...peer.materialMotion.values(),peer.variantMix,peer.tone])spring.snap();
    }
    this.invalidate();
  }
  setInteraction(id: string, pressed: boolean, x?: number, y?: number): void {
    this.assertAlive(); const s = this.surface(id); if (!s.interactive) return;
    if (x !== undefined && y !== undefined && Number.isFinite(x+y)) s.pointer = [x,y];
    if(pressed&&!s.pressed&&!this.settings.reducedMotion){s.impulse.snap(s.physics.impulseStrength);s.impulse.target=0;s.impulseAge=0;}
    s.pressed=pressed;s.press.target = pressed ? 1 : 0;
    const r=this.getRect(id),[ax,ay]=s.physics.attraction;s.offsetX.target=pressed?Math.max(-ax,Math.min(ax,(s.pointer[0]-r.x-r.width/2)/r.width*ax*2)):0;
    s.offsetY.target=pressed?Math.max(-ay,Math.min(ay,(s.pointer[1]-r.y-r.height/2)/r.height*ay*2)):0;
    this.invalidate();
  }
  releaseInteractions():void{if(this.disposed)return;for(const s of this.surfaces.values())if(s.pressed)this.setInteraction(s.id,false);}
  setShape(id:string,shape:GlassShape|null,options:MotionOptions={}):Promise<MotionResult>{
    this.assertAlive();if(shape)shapePixels(shape);const s=this.surface(id);this.cancelWaiters(s);
    if(options.immediate||this.settings.reducedMotion){s.shape=shape;s.shapeFrom=null;s.shapeMix.snap(1);s.shapeMix.target=1;}
    else{
      const r=this.getRect(id),round=()=>roundedShape(r.width,r.height,r.radius);
      s.shapeFrom=s.shapeMix.value<.999?blendShapes(s.shapeFrom??round(),s.shape??round(),s.shapeMix.value):s.shape;
      s.shape=shape;s.shapeMix.snap(0);s.shapeMix.target=1;configureSpring(s.shapeMix,options.spring);
    }
    this.invalidate();return this.whenSettled(id);
  }
  setContent(id:string,source:BackdropSource|null):void{this.assertAlive();const s=this.surface(id);s.content=source;s.contentDirty=true;this.invalidate();}
  contains(id:string,x:number,y:number):boolean{
    const state=this.surface(id);if(state.reveal.value<=.0001&&state.reveal.target===0)return false;
    const s=this.surface(id),r=this.pose(s).visualRect,radius=Math.min(r.radius,r.width/2,r.height/2),qx=Math.abs(x-r.x-r.width/2)-r.width/2+radius,qy=Math.abs(y-r.y-r.height/2)-r.height/2+radius;
    const ox=Math.max(qx,0),oy=Math.max(qy,0),power=this.currentMaterial(s).cornerPower;
    const len=power>2.001&&radius<Math.min(r.width,r.height)/2-.01&&Math.min(ox,oy)>0?Math.pow(Math.pow(ox,power)+Math.pow(oy,power),1/power):Math.hypot(ox,oy);
    const round=len+Math.min(Math.max(qx,qy),0)-radius;
    const d=(shape:GlassShape|null)=>shape?shapeDistance(shape,(x-r.x)/r.width,(y-r.y)/r.height,r.width,r.height):round,t=Math.max(0,Math.min(1,s.shapeMix.value));
    return (t<.9999?d(s.shapeFrom)*(1-t)+d(s.shape)*t:d(s.shape))<=0;
  }
  removeSurface(id: string): void { this.assertAlive();const s=this.surfaces.get(id);if(s){this.cancelWaiters(s);if(s.contentTexture)this.gl.deleteTexture(s.contentTexture);}this.surfaces.delete(id); this.invalidate(); }
  private surface(id: string): Surface { const s = this.surfaces.get(id); if (!s) throw new Error(`Unknown surface: ${id}`); return s; }
  invalidate(): void {
    if (!this.disposed && !this.lost && !this.frame && !document.hidden) this.frame = requestAnimationFrame(this.render);
  }
  /** Compile before replacing the live program. A failure leaves the previous shader intact. */
  setShader(shader:GlassShader|null):void{
    this.assertAlive();if(this.lost)throw new Error('Wait for WebGL context restoration before replacing the shader');
    const next=shader?createGlassShader({fragment:shader.fragment,blurFragment:shader.blurFragment,backdropFragment:shader.backdropFragment,uniforms:shader.uniforms}):createGlassShader();
    const programs=this.shaderPrograms(next),old=this.programs;this.programs=programs;this.shader=next;
    this.shaderValues.clear();for(const[name,u]of Object.entries(next.uniforms))this.shaderValues.set(name,u.value);
    for(const p of Object.values(old))this.gl.deleteProgram(p.handle);this.blurDirty=true;this.invalidate();
  }
  getShader():GlassShader{return this.shader;}
  setShaderUniform(name:string,value:ShaderValue):void{
    this.assertAlive();const uniform=this.shader.uniforms[name];if(!uniform)throw new Error(`Unknown shader uniform: ${name}`);
    validateShaderValue(uniform.type,value);this.shaderValues.set(name,typeof value==='number'?value:Object.freeze([...value])as ShaderValue);if(this.shader.blurFragment!==blurFragment)this.blurDirty=true;this.invalidate();
  }
  getShaderUniform(name:string):ShaderValue|undefined{return this.shaderValues.get(name);}
  private checkedProgram(fragment:string,shader:GlassShader):Program{
    const p=this.program(fragment),gl=this.gl,types={float:gl.FLOAT,vec2:gl.FLOAT_VEC2,vec3:gl.FLOAT_VEC3,vec4:gl.FLOAT_VEC4};
    try{for(let i=0;i<gl.getProgramParameter(p.handle,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(p.handle,i)!;const expected=shader.uniforms[u.name.replace(/\[0\]$/,'')];if(expected&&(u.size!==1||u.type!==types[expected.type]))throw new TypeError(`Uniform type mismatch: ${u.name}`);}}catch(e){gl.deleteProgram(p.handle);throw e;}return p;
  }
  private shaderPrograms(shader:GlassShader):{copy:Program;blur:Program;glass:Program}{
    const made:Program[]=[];try{const copy=this.checkedProgram(shader.backdropFragment,shader);made.push(copy);const blur=this.checkedProgram(shader.blurFragment,shader);made.push(blur);const glass=this.checkedProgram(shader.fragment,shader);return{copy,blur,glass};}catch(error){for(const p of made)this.gl.deleteProgram(p.handle);throw error;}
  }
  private customUniforms(p:Program):void{const gl=this.gl;for(const[name,value]of this.shaderValues){const location=this.uniform(p,name);if(typeof value==='number')gl.uniform1f(location,value);else if(value.length===2)gl.uniform2fv(location,value);else if(value.length===3)gl.uniform3fv(location,value);else gl.uniform4fv(location,value);}}
  configureLightMotion(options:SpringOptions):void{this.assertAlive();configureSpring(this.lightAngle,options);this.invalidate();}
  private program(fragment: string): Program {
    const gl = this.gl, handle = gl.createProgram()!;
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const info = gl.getShaderInfoLog(shader); gl.deleteShader(shader); gl.deleteProgram(handle); throw new Error(`Glass shader: ${info}`); }
      gl.attachShader(handle, shader); gl.deleteShader(shader);
    }
    gl.linkProgram(handle);
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) { const info = gl.getProgramInfoLog(handle); gl.deleteProgram(handle); throw new Error(`Glass program: ${info}`); }
    return { handle, uniforms: new Map() };
  }
  private uniform(p: Program, name: string) {
    if (!p.uniforms.has(name)) p.uniforms.set(name, this.gl.getUniformLocation(p.handle, name));
    return p.uniforms.get(name)!;
  }
  private makeTexture(): WebGLTexture {
    const gl = this.gl, texture = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }
  private initialize() {
    const gl = this.gl;
    this.maxTextureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE)as number;
    this.targets = []; this.queries = [];
    this.shapeAtlas=[];this.shapeAtlasDirty=true;
    this.shapeTexture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.shapeTexture);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    for(const s of this.surfaces.values()){s.contentTexture=undefined;s.contentDirty=!!s.content;}
    this.programs = this.shaderPrograms(this.shader);
    this.texture = this.makeTexture(); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([240,241,245,255]));
    this.vibrantTexture=this.makeTexture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));this.vibrantWidth=this.vibrantHeight=1;
    this.reflectionTexture=this.makeTexture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));this.reflectionWidth=this.reflectionHeight=1;
    this.reflectionReady=false;
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.timer = this.options.measureGpu ? gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null : null;
  }
  private allocateTargets() {
    const gl = this.gl;
    for (const t of this.targets) { gl.deleteTexture(t.texture); gl.deleteFramebuffer(t.framebuffer); }
    this.targets = [];
    for (let i = 0; i < 4; i++) {
      const texture = this.makeTexture();
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,i<2?this.blurWidth:this.wideWidth,i<2?this.blurHeight:this.wideHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      const framebuffer = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Unable to allocate glass blur framebuffer');
      this.targets.push({ texture, framebuffer });
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); this.blurDirty = true;
  }
  private bindTexture(texture: WebGLTexture, unit = 0) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D,texture); }
  private ensureStackTargets(){
    if(this.targets.length>4)return;
    const gl=this.gl;
    for(let i=4;i<10;i++){
      const texture=this.makeTexture(),framebuffer=gl.createFramebuffer()!;
      const w=i<6?this.canvas.width:i<8?this.blurWidth:this.wideWidth,h=i<6?this.canvas.height:i<8?this.blurHeight:this.wideHeight;
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Unable to allocate glass composition framebuffer');
      this.targets.push({texture,framebuffer});
    }
  }
  private uploadShapes(){
    const active=[...new Set([...this.surfaces.values()].flatMap(s=>[s.shape,s.shapeFrom]).filter((s):s is GlassShape=>!!s))];
    if(active.length!==this.shapeAtlas.length||active.some((s,i)=>s!==this.shapeAtlas[i])){this.shapeAtlas=active;this.shapeAtlasDirty=true;}
    const gl=this.gl;gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.shapeTexture);
    if(!this.shapeAtlasDirty)return;
    gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,shapeResolution,shapeResolution,Math.max(1,active.length),0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    active.forEach((s,i)=>gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,shapeResolution,shapeResolution,1,gl.RGBA,gl.UNSIGNED_BYTE,shapePixels(s)));
    this.shapeAtlasDirty=false;
  }
  private uploadContents(){
    const gl=this.gl;for(const s of this.surfaces.values()){
      if(!s.contentDirty)continue;
      if(!s.content){if(s.contentTexture)gl.deleteTexture(s.contentTexture);s.contentTexture=undefined;s.contentBytes=0;s.contentDirty=false;continue;}
      const size=s.content as HTMLVideoElement&HTMLImageElement&HTMLCanvasElement,w=size.videoWidth??size.naturalWidth??size.width,h=size.videoHeight??size.naturalHeight??size.height;
      if(!w||!h)continue;if(w>this.maxTextureSize||h>this.maxTextureSize)throw new RangeError('Surface content exceeds GPU texture size');
      s.contentTexture??=this.makeTexture();this.bindTexture(s.contentTexture,5);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,s.content);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      s.contentBytes=w*h*4;s.contentDirty=false;
    }
  }
  private draw() { this.gl.drawArrays(this.gl.TRIANGLES,0,3); this.metrics.drawCalls++; }
  private edgeUniforms(p:Program){const gl=this.gl,e=this.edges;gl.uniform4f(this.uniform(p,'scrollEdges'),e.top,e.right,e.bottom,e.left);gl.uniform2f(this.uniform(p,'viewportSize'),this.width,this.height);gl.uniform4f(this.uniform(p,'edgeColor'),...(e.color??[0,0,0]as const),e.color?1:0);gl.uniform1f(this.uniform(p,'edgeHard'),+e.hard);}
  private upload() {
    if (!this.source || !this.backdropDirty) return;
    const gl = this.gl, source = this.source;
    const size = source as unknown as { videoWidth?: number; videoHeight?: number; naturalWidth?: number; naturalHeight?: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number };
    const w = size.videoWidth ?? size.naturalWidth ?? size.displayWidth ?? size.width ?? 0;
    const h = size.videoHeight ?? size.naturalHeight ?? size.displayHeight ?? size.height ?? 0;
    if (!w || !h) return;
    this.bindTexture(this.texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    if (w !== this.sourceWidth || h !== this.sourceHeight) {
      const max = this.maxTextureSize;
      if (w > max || h > max) throw new RangeError(`Backdrop exceeds GPU texture limit (${max}px); downsample it first`);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      this.sourceWidth = w; this.sourceHeight = h;
    } else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    this.backdropDirty = false; this.blurDirty = true; this.metrics.uploads++;
    try {
      const ctx = this.sampleCanvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(source as CanvasImageSource,0,0,48,48); this.sample = ctx.getImageData(0,0,48,48).data;
    } catch { this.sample = null; }
    for (const s of this.surfaces.values()) this.adaptSurface(s);
  }
  private adaptSurface(s: Surface, snap = false) {
    if(s.material.appearance!=='auto')s.tone.target=s.material.appearance==='dark'?1:0;
    if (!this.sample) {if(snap)s.tone.snap();return;}
    let sum = 0, squares = 0, count = 0;
    for (let iy = 0; iy < 5; iy++) for (let ix = 0; ix < 5; ix++) {
      const x = Math.max(0,Math.min(47,Math.floor((s.motion.x.value + s.motion.width.value * (ix+0.5)/5) / this.width * 48)));
      const y = Math.max(0,Math.min(47,Math.floor((s.motion.y.value + s.motion.height.value * (iy+0.5)/5) / this.height * 48)));
      const i = (y*48+x)*4, p = this.sample;
      const l = (p[i]*0.2126+p[i+1]*0.7152+p[i+2]*0.0722)/255;
      sum += l; squares += l*l; count++;
    }
    const avg = sum/count; s.detail = Math.min(1,Math.sqrt(Math.max(0,squares/count-avg*avg))*4);
    const next = avg < 0.35 ? 1 : avg > 0.5 ? 0 : s.tone.target; // hysteresis avoids flicker
    const large = s.motion.width.target * s.motion.height.target > 70000;
    if (large && s.fixedTone === undefined) s.fixedTone = next;
    if(s.material.appearance==='auto')s.tone.target = large ? s.fixedTone! : next;
    if (snap) s.tone.snap();
  }
  private uploadVibrancy(){
    if(!this.vibrantDirty)return;const gl=this.gl;this.bindTexture(this.vibrantTexture,2);
    if(!this.vibrantSource){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));this.vibrantWidth=this.vibrantHeight=1;this.vibrantDirty=false;return;}
    const source=this.vibrantSource,size=source as HTMLVideoElement&HTMLImageElement&HTMLCanvasElement,w=size.videoWidth??size.naturalWidth??size.width,h=size.videoHeight??size.naturalHeight??size.height;if(!w||!h)return;
    if(w>this.maxTextureSize||h>this.maxTextureSize)throw new RangeError('Vibrancy source exceeds GPU texture size');
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    if(w!==this.vibrantWidth||h!==this.vibrantHeight){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);this.vibrantWidth=w;this.vibrantHeight=h;}else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);this.vibrantDirty=false;this.metrics.foregroundUploads++;
  }
  private uploadReflection(){
    if(!this.reflectionDirty)return;const gl=this.gl;this.bindTexture(this.reflectionTexture,6);
    if(!this.reflectionSource){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));this.reflectionWidth=this.reflectionHeight=1;this.reflectionDirty=false;this.reflectionReady=false;return;}
    const source=this.reflectionSource,s=source as HTMLVideoElement&HTMLImageElement&HTMLCanvasElement,w=s.videoWidth??s.naturalWidth??s.width,h=s.videoHeight??s.naturalHeight??s.height;if(!w||!h)return;
    if(w>this.maxTextureSize||h>this.maxTextureSize)throw new RangeError('Reflection environment exceeds GPU texture size');
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    if(w!==this.reflectionWidth||h!==this.reflectionHeight)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);this.reflectionWidth=w;this.reflectionHeight=h;this.reflectionDirty=false;this.reflectionReady=true;this.metrics.reflectionUploads++;
  }
  private blur(source=this.texture,offset=0) {
    if (!offset&&!this.blurDirty) return;
    const gl = this.gl, p = this.programs.blur;
    gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST); gl.useProgram(p.handle);this.customUniforms(p);
    gl.uniform1i(this.uniform(p,'source'),0);
    for(let i=0;i<4;i++){
      const width=i<2?this.blurWidth:this.wideWidth,height=i<2?this.blurHeight:this.wideHeight;
      gl.viewport(0,0,width,height);gl.bindFramebuffer(gl.FRAMEBUFFER,this.targets[i+offset].framebuffer);
      this.bindTexture(i===0?source:this.targets[i+offset-1].texture);
      gl.uniform1fv(this.uniform(p,'kernel[0]'),i<2?this.blurWeights:this.wideWeights);
      gl.uniform2f(this.uniform(p,'direction'),i%2===0?1/width:0,i%2===1?1/height:0);
      this.draw();this.metrics.blurPasses++;
    }
    if(!offset)this.blurDirty = false;
  }
  private pollQueries() {
    if (!this.timer || !this.queries.length) return;
    const gl = this.gl;
    if (gl.getParameter(this.timer.GPU_DISJOINT_EXT)) { for (const q of this.queries) gl.deleteQuery(q); this.queries = []; return; }
    while (this.queries.length && gl.getQueryParameter(this.queries[0],gl.QUERY_RESULT_AVAILABLE)) {
      const q = this.queries.shift()!; this.metrics.gpuMs = gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6; gl.deleteQuery(q);
    }
  }
  private render = (now: number) => {
    this.frame = 0; if (this.disposed || this.lost) return;
    const start = performance.now(), gl = this.gl;
    const elapsed=this.lastTime?Math.max(0,(now-this.lastTime)/1000):0,dt=this.lastTime?Math.min(elapsed,0.1):1/60;this.lastTime=now;
    for(const a of [...this.animations]){
      if(this.settings.reducedMotion&&!a.essential){a.suspend();continue;}
      try{a.tick(elapsed,this);}catch(error){a.cancel();const e=error instanceof Error?error:new Error(String(error));if(this.options.onError)this.options.onError(e);else console.error(e);}
    }
    if(this.disposed||this.lost)return;
    if(this.settings.reducedMotion)this.lightAngle.snap();
    let moving = this.lightAngle.step(dt);this.light=[Math.cos(this.lightAngle.value),Math.sin(this.lightAngle.value)];
    for (const s of this.surfaces.values()) {
      for (const spring of this.springs(s)) {
        if (this.settings.reducedMotion) spring.snap(); else moving = spring.step(dt) || moving;
      }
      if(!isResting(s.impulse))s.impulseAge+=dt;
      if (moving) this.adaptSurface(s);
    }
    try {
      this.metrics.drawCalls = 0; this.pollQueries();
      const query = this.timer && this.queries.length < 4 ? gl.createQuery() : null;
      if (query) gl.beginQuery(this.timer!.TIME_ELAPSED_EXT,query);
      gl.bindVertexArray(this.vao); this.upload();this.uploadVibrancy();this.uploadReflection();this.uploadShapes();this.uploadContents();this.blur();
      const groups = new Map<string,Surface[]>();
      for (const s of [...this.surfaces.values()].sort((a,b)=>a.layer-b.layer)) {
        if (s.material.variant === 'identity' || s.reveal.value<=0.0001&&s.reveal.target===0) continue;
        const list = groups.get(s.group) ?? []; list.push(s); groups.set(s.group,list);
      }
      // Only overlapping optical bounds create a new backdrop dependency. Disjoint
      // controls share a pass and the original cached blur, even with many controls.
      const entries:{list:Surface[];bounds:{x:number;y:number;right:number;bottom:number};depth:number}[]=[];
      for(const list of groups.values()){
        const rects=list.map(s=>this.pose(s).visualRect),pad=4+list[0].spacing*.25;
        const bounds={x:Math.min(...rects.map(r=>r.x))-pad,y:Math.min(...rects.map(r=>r.y))-pad,right:Math.max(...rects.map(r=>r.x+r.width))+pad,bottom:Math.max(...rects.map(r=>r.y+r.height))+pad};
        let depth=0;for(const prior of entries)if(bounds.x<prior.bounds.right&&bounds.right>prior.bounds.x&&bounds.y<prior.bounds.bottom&&bounds.bottom>prior.bounds.y)depth=Math.max(depth,prior.depth+1);
        entries.push({list,bounds,depth});
      }
      const stacked=entries.some(e=>e.depth>0);if(stacked)this.ensureStackTargets();
      const scene=stacked?this.targets[4].framebuffer:null;
      const copyBackdrop=()=>{const p=this.programs.copy;gl.useProgram(p.handle);this.customUniforms(p);this.bindTexture(this.texture);this.bindTexture(this.targets[1].texture,1);gl.uniform1i(this.uniform(p,'source'),0);gl.uniform1i(this.uniform(p,'blurred'),1);this.edgeUniforms(p);this.draw();};
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      if(stacked){gl.bindFramebuffer(gl.FRAMEBUFFER,scene);copyBackdrop();}
      else if(this.options.drawBackdrop!==false)copyBackdrop();
      const p=this.programs.glass;
      for(let depth=0;depth<=Math.max(0,...entries.map(e=>e.depth));depth++){
        if(depth>0){
          // Snapshot the completed rear layers. Never sample the render attachment.
          gl.disable(gl.SCISSOR_TEST);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,scene);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.targets[5].framebuffer);
          gl.blitFramebuffer(0,0,this.canvas.width,this.canvas.height,0,0,this.canvas.width,this.canvas.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);
          this.blur(this.targets[5].texture,6);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER,scene);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.SCISSOR_TEST);gl.useProgram(p.handle);
        this.bindTexture(depth?this.targets[5].texture:this.texture,0);this.bindTexture(this.targets[depth?7:1].texture,1);this.bindTexture(this.vibrantTexture,2);this.bindTexture(this.targets[depth?9:3].texture,3);
        this.bindTexture(this.vibrantTexture,5);
        this.bindTexture(this.reflectionTexture,6);gl.uniform1i(this.uniform(p,'environmentMap'),6);gl.uniform1f(this.uniform(p,'hasEnvironment'),this.reflectionReady?1:0);gl.uniform1f(this.uniform(p,'environmentRotation'),this.reflectionRotation);
        this.customUniforms(p);
        gl.uniform1i(this.uniform(p,'backdrop'),0);gl.uniform1i(this.uniform(p,'blurred'),1);gl.uniform1i(this.uniform(p,'vibrantForeground'),2);gl.uniform1i(this.uniform(p,'scatteredWide'),3);gl.uniform1i(this.uniform(p,'shapeMaps'),4);gl.uniform1i(this.uniform(p,'surfaceContent'),5);
        gl.uniform2f(this.uniform(p,'resolution'),this.canvas.width,this.canvas.height);gl.uniform1f(this.uniform(p,'pixelRatio'),this.ratio);gl.uniform2fv(this.uniform(p,'light'),this.light);this.edgeUniforms(p);
        gl.uniform4f(this.uniform(p,'vibrancyColor'),...(this.vibrantColor??[0,0,0] as const),this.vibrantColor?1:0);
        // Scroll edges have already been composited into a rear-layer snapshot.
        if(depth)gl.uniform4f(this.uniform(p,'scrollEdges'),0,0,0,0);
        for(const entry of entries)if(entry.depth===depth){
          gl.uniform1f(this.uniform(p,'contentOnly'),0);this.drawGroup(p,entry.list);
          for(const s of entry.list)if(s.contentTexture){this.bindTexture(s.contentTexture,5);gl.uniform1f(this.uniform(p,'contentOnly'),1);this.drawGroup(p,[s]);}gl.uniform1f(this.uniform(p,'contentOnly'),0);
          if(stacked&&this.options.drawBackdrop===false){
            gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.drawGroup(p,entry.list);for(const s of entry.list)if(s.contentTexture){this.bindTexture(s.contentTexture,5);gl.uniform1f(this.uniform(p,'contentOnly'),1);this.drawGroup(p,[s]);}gl.uniform1f(this.uniform(p,'contentOnly'),0);gl.bindFramebuffer(gl.FRAMEBUFFER,scene);
          }
        }
      }
      gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND);
      if(stacked&&this.options.drawBackdrop!==false){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,scene);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);gl.blitFramebuffer(0,0,this.canvas.width,this.canvas.height,0,0,this.canvas.width,this.canvas.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);}
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      if (query) { gl.endQuery(this.timer!.TIME_ELAPSED_EXT); this.queries.push(query); }
      this.metrics.frames++; this.metrics.cpuMs = performance.now()-start;
      this.metrics.groups = groups.size; this.metrics.surfaces = this.surfaces.size; this.metrics.pixelRatio = this.ratio;
      this.metrics.textureBytes = (this.sourceWidth*this.sourceHeight*4/3 + this.vibrantWidth*this.vibrantHeight+2*this.blurWidth*this.blurHeight+2*this.wideWidth*this.wideHeight + this.canvas.width*this.canvas.height+(this.targets.length>4?2*this.canvas.width*this.canvas.height+2*this.blurWidth*this.blurHeight+2*this.wideWidth*this.wideHeight:0)+shapeResolution**2*Math.max(1,this.shapeAtlas.length))*4;
      for(const s of this.surfaces.values())this.metrics.textureBytes+=s.contentBytes;
      this.metrics.textureBytes+=this.reflectionWidth*this.reflectionHeight*4;
      for (const listener of this.listeners) listener(this.stats);
      for(const s of this.surfaces.values())if(this.springs(s).every(isResting)){for(const resolve of s.waiters)resolve({finished:true});s.waiters.clear();}
      if (moving || [...this.animations].some(a=>a.running&&(!this.settings.reducedMotion||a.essential)) || [...this.surfaces.values()].some(s => this.springs(s).some(spring=>!isResting(spring)))) this.invalidate();
    } catch (error) { this.options.onError?.(error instanceof Error ? error : new Error(String(error))); if (!this.options.onError) console.error(error); }
  };
  private drawGroup(p: Program, list: Surface[]) {
    const gl = this.gl, first = list[0], m = this.currentMaterial(first);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, press = 0, pointer = first.pointer, energy=0,age=0;
    for (let i = 0; i < list.length; i++) {
      const s = list[i], state=this.pose(s),r=state.visualRect;
      const w=r.width,h=r.height,cx=r.x+w/2,cy=r.y+h/2;
      this.shapes.set([cx,cy,w/2,h/2],i*4); this.radii[i] = Math.min(r.radius,w/2,h/2);
      this.reveals[i]=state.visibility;
      this.shapeIndices[i]=s.shape?this.shapeAtlas.indexOf(s.shape):-1;
      this.shapeFromIndices[i]=s.shapeFrom?this.shapeAtlas.indexOf(s.shapeFrom):-1;this.shapeBlends[i]=s.shapeMix.value;
      minX = Math.min(minX,cx-w/2); minY = Math.min(minY,cy-h/2); maxX = Math.max(maxX,cx+w/2); maxY = Math.max(maxY,cy+h/2);
      if (s.press.value >= press) { press = s.press.value; pointer = s.pointer; }
      if(state.energy>energy){energy=state.energy;age=s.impulseAge;pointer=s.pointer;}
    }
    const pad = 40+first.spacing, x = Math.max(0,Math.floor((minX-pad)*this.ratio)), y = Math.max(0,Math.floor((this.height-maxY-pad)*this.ratio));
    const right = Math.min(this.canvas.width,Math.ceil((maxX+pad)*this.ratio)), top = Math.min(this.canvas.height,Math.ceil((this.height-minY+pad)*this.ratio));
    if (right <= x || top <= y) return;
    gl.scissor(x,y,right-x,top-y);
    gl.uniform4fv(this.uniform(p,'shapes[0]'),this.shapes,0,list.length*4); gl.uniform1fv(this.uniform(p,'radii[0]'),this.radii,0,list.length);
    gl.uniform1fv(this.uniform(p,'reveals[0]'),this.reveals,0,list.length);
    gl.uniform1iv(this.uniform(p,'shapeIndices[0]'),this.shapeIndices,0,list.length);
    gl.uniform1iv(this.uniform(p,'shapeFromIndices[0]'),this.shapeFromIndices,0,list.length);gl.uniform1fv(this.uniform(p,'shapeBlends[0]'),this.shapeBlends,0,list.length);
    gl.uniform1i(this.uniform(p,'count'),list.length); gl.uniform1f(this.uniform(p,'spacing'),first.spacing);
    gl.uniform2f(this.uniform(p,'lensCenter'),(minX+maxX)/2,(minY+maxY)/2);gl.uniform1f(this.uniform(p,'magnification'),m.magnification);gl.uniform1f(this.uniform(p,'useVibrancy'),first.vibrancy&&this.vibrantSource?1:0);
    gl.uniform4f(this.uniform(p,'optics'),m.thickness,m.refraction,this.quality==='low'?0:m.dispersion,m.frost);
    gl.uniform3f(this.uniform(p,'physical'),m.ior,m.reflection,m.cornerPower);
    gl.uniform1f(this.uniform(p,'edgeWidth'),m.edgeWidth);gl.uniform1f(this.uniform(p,'bevelStrength'),m.bevel);gl.uniform1f(this.uniform(p,'edgeContrast'),m.edgeContrast);gl.uniform1f(this.uniform(p,'edgeLimit'),Math.min(...list.map(s=>Math.min(s.motion.width.value,s.motion.height.value)*.225)));
    gl.uniform4f(this.uniform(p,'finish'),m.saturation,m.highlight,m.shadow*(0.7+first.detail*0.6),m.dimming);
    gl.uniform4f(this.uniform(p,'tint'),...m.tint,m.tintOpacity);
    gl.uniform4f(this.uniform(p,'mode'),first.variantMix.value,first.tone.value,+this.settings.reducedTransparency,+this.settings.increasedContrast);
    gl.uniform4f(this.uniform(p,'touch'),pointer[0],pointer[1],Math.max(0,press),energy);
    gl.uniform1f(this.uniform(p,'interactionTime'),age);
    this.draw();
  }
  dispose(): void {
    if (this.disposed) return; this.disposed = true; cancelAnimationFrame(this.frame);
    for(const a of [...this.animations])a.cancel();this.animations.clear();
    for (const fn of this.cleanup) fn();this.listeners.clear();for(const s of this.surfaces.values()){this.cancelWaiters(s);if(s.contentTexture)this.gl.deleteTexture(s.contentTexture);}this.surfaces.clear();
    const gl = this.gl;
    if (!this.lost) {
      for (const t of this.targets) { gl.deleteTexture(t.texture); gl.deleteFramebuffer(t.framebuffer); }
      if (this.programs) for (const p of Object.values(this.programs)) gl.deleteProgram(p.handle);
      for (const q of this.queries) gl.deleteQuery(q);
      gl.deleteTexture(this.texture);gl.deleteTexture(this.vibrantTexture);gl.deleteTexture(this.reflectionTexture);gl.deleteTexture(this.shapeTexture);gl.deleteVertexArray(this.vao);
    }
    this.source = null;this.vibrantSource=null;this.reflectionSource=null;this.sample = null; this.canvas.dataset.glassContext = 'disposed';
  }
}

export class SurfaceHandle {
  constructor(private renderer: GlassRenderer, readonly id: string) {}
  get rect(): Rect { return this.renderer.getRect(this.id); }
  get foreground(): string { return this.renderer.getForeground(this.id); }
  get state(): SurfaceState { return this.renderer.getState(this.id); }
  get physics():Readonly<GlassPhysics>{return this.renderer.getPhysics(this.id);}
  configurePhysics(options:PhysicsOptions):this{this.renderer.configurePhysics(this.id,options);return this;}
  deform(fn:DeformationFunction|null):this{this.renderer.setDeformation(this.id,fn);return this;}
  kick(velocity:Partial<Rect>):this{this.renderer.kick(this.id,velocity);return this;}
  move(rect: Partial<Rect>, animate = true): this { this.renderer.updateSurface(this.id,rect,animate); return this; }
  motion(options:SpringOptions):this{this.renderer.configureMotion(this.id,options);return this;}
  animateTo(rect: Partial<Rect>,options: MotionOptions = {}): Promise<MotionResult> {return this.renderer.animateSurface(this.id,rect,options);}
  material(options: Partial<GlassMaterial>,animate = true): this { this.renderer.setMaterial(this.id,options,animate); return this; }
  shape(shape:GlassShape|null,options?:MotionOptions):Promise<MotionResult>{return this.renderer.setShape(this.id,shape,options);}
  content(source:BackdropSource|null):this{this.renderer.setContent(this.id,source);return this;}
  contains(x:number,y:number):boolean{return this.renderer.contains(this.id,x,y);}
  show(options?: MotionOptions): Promise<MotionResult> {return this.renderer.setVisibility(this.id,true,options);}
  hide(options?: MotionOptions): Promise<MotionResult> {return this.renderer.setVisibility(this.id,false,options);}
  settled(): Promise<MotionResult> {return this.renderer.whenSettled(this.id);}
  async dismiss(options?: MotionOptions): Promise<MotionResult> {const result=await this.hide(options);if(result.finished)this.remove();return result;}
  interact(pressed: boolean, x?: number, y?: number): this { this.renderer.setInteraction(this.id,pressed,x,y); return this; }
  remove(): void { this.renderer.removeSurface(this.id); }
}
