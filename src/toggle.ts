import{bindElement}from'./dom.js';
import{createMaterial,type GlassMaterial,type RGB}from'./material.js';
import{createPhysics}from'./physics.js';
import{capturePointer,type PointerInput}from'./pointer.js';
import type{GlassRenderer,SurfaceHandle}from'./renderer.js';
import type{SpringOptions}from'./motion.js';
import type{Control,ControlOptions}from'./components.js';
export type ToggleOptions=ControlOptions&{
  disabled?:boolean;onChange?:(checked:boolean)=>void;
  accentColor?:RGB;offColor?:RGB;thumbColor?:RGB;
  activeMaterial?:Partial<GlassMaterial>;activeContentOpacity?:number;
  trackingSpring?:SpringOptions;releaseSpring?:SpringOptions;
  /** Display position-independent on/off marks in addition to color. */
  onOffLabels?:boolean;
};
export interface ToggleControl extends Control<HTMLButtonElement>{
  readonly checked:boolean;readonly disabled:boolean;readonly track:HTMLElement;readonly thumb:HTMLElement;readonly trackSurface:SurfaceHandle;
  /** Programmatic updates do not emit change. */
  setChecked:(checked:boolean,animate?:boolean)=>void;setDisabled:(disabled:boolean)=>void;setPressed:(pressed:boolean)=>void;
}
let sequence=0;
const rgb=(color:RGB)=>color.map(v=>Math.round(v*255));
/** An opaque resting thumb becomes a refractive lens during captured interaction. */
export function glassToggle(renderer:GlassRenderer,parent:HTMLElement,label:string,initial=false,options:ToggleOptions={}):ToggleControl{
  const accent=options.accentColor??[.18,.76,.31],off=options.offColor??[.48,.49,.53],white=options.thumbColor??[.98,.985,.995];
  // Validate before appending DOM or allocating renderer surfaces.
  for(const color of[accent,off,white])createMaterial({tint:color});
  const restingOpacity=options.contentOpacity??1,activeOpacity=options.activeContentOpacity??.04;
  if([restingOpacity,activeOpacity].some(v=>!Number.isFinite(v)||v<0||v>1))throw new RangeError('Toggle content opacity must be in [0,1]');
  const resting=createMaterial({variant:'clear',appearance:'light',frost:.22,refraction:3,highlight:.42,shadow:.16,shadowRadius:1.8,shadowOffset:.8,reflection:.15,edgeContrast:.08,...options.material});
  const active=createMaterial({...resting,frost:.04,magnification:.8,saturation:1,refraction:14,edgeWidth:7,highlight:.8,shadow:.12,shadowRadius:2.8,shadowOffset:1.2,reflection:.35,...options.activeMaterial});
  const physics=createPhysics({...options.physics,geometry:{frequency:4.2,damping:.92,...options.physics?.geometry},material:{frequency:5,damping:1,...options.physics?.material},press:{frequency:5,damping:.95,...options.physics?.press},pressScale:options.physics?.pressScale??[.46,.38],attraction:options.physics?.attraction??[0,0],velocityScale:options.physics?.velocityScale??600,maxStretch:options.physics?.maxStretch??.1});
  const tracking=createPhysics({geometry:options.trackingSpring??{frequency:14,damping:1}}).geometry,release=createPhysics({geometry:options.releaseSpring??physics.geometry}).geometry;
  const id=options.id??`glass-toggle-${++sequence}`,element=document.createElement('button');element.type='button';element.className='lg-toggle';element.role='switch';element.setAttribute('aria-label',label);element.disabled=options.disabled??false;
  const text=document.createElement('span');text.className='lg-toggle-label';text.textContent=label;
  const track=document.createElement('span'),thumb=document.createElement('span');track.className='lg-toggle-track';thumb.className='lg-toggle-thumb';track.setAttribute('aria-hidden','true');track.append(thumb);element.append(text,track);parent.append(element);
  let checked=!!initial,held=false,dragged=false,disposed=false,startX=0,startProgress=0,rtl=false,paintKey='',width=64,height=28,inset=2,travel=24;
  const colorSource=document.createElement('canvas'),cap=document.createElement('canvas');cap.width=cap.height=4;const capContext=cap.getContext('2d')!;capContext.fillStyle=`rgb(${rgb(white).join(' ')})`;capContext.fillRect(0,0,4,4);
  const geometry=()=>{width=track.offsetWidth;height=track.offsetHeight;inset=Math.max(0,(height-thumb.offsetHeight)/2);travel=Math.max(1,width-thumb.offsetWidth-inset*2);rtl=getComputedStyle(element).direction==='rtl';};geometry();
  const place=(progress:number)=>{thumb.style.left=`${inset+(rtl?1-progress:progress)*travel}px`;};place(checked?1:0);
  const trackBinding=bindElement(renderer,track,{id:`${id}/track`,layer:options.layer??0,material:{variant:'identity'},content:colorSource,contrast:false,sizeAdaptation:false,elastic:false,radius:height/2,interactive:false,physics:{pressScale:[0,0],attraction:[0,0],impulseStrength:0}});
  const binding=bindElement(renderer,thumb,{...options,id,layer:(options.layer??0)+1,radius:options.radius??thumb.offsetHeight/2,physics,material:resting,content:options.content??cap,contentOpacity:restingOpacity,contrast:options.contrast??false,sizeAdaptation:options.sizeAdaptation??false});
  const surface=binding.surface;
  const progress=()=>{const trackRect=trackBinding.surface.rect,r=surface.rect,scale=trackRect.width/width,p=(r.x-trackRect.x-inset*scale)/(travel*scale);return Math.max(0,Math.min(1,rtl?1-p:p));};
  const paint=()=>{
    const p=progress(),disabled=element.disabled,marks=!!options.onOffLabels||renderer.accessibility.increasedContrast;
    const key=`${Math.round(p*255)} ${disabled} ${marks} ${width} ${height}`;if(key===paintKey)return;paintKey=key;
    const w=Math.max(1,Math.round(width*2)),h=Math.max(1,Math.round(height*2));if(colorSource.width!==w||colorSource.height!==h){colorSource.width=w;colorSource.height=h;}
    const c=colorSource.getContext('2d')!;c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,width,height);
    const color=off.map((v,i)=>v*(1-p)+accent[i]*p)as unknown as RGB,alpha=(.26+.74*p)*(disabled?.45:1);
    c.fillStyle=`rgb(${rgb(color).join(' ')} / ${alpha})`;c.beginPath();c.roundRect(0,0,width,height,height/2);c.fill();
    if(marks){const onX=rtl?width-12:12,offX=rtl?12:width-12;c.lineWidth=1.3;c.strokeStyle=`rgb(255 255 255 / ${p})`;c.beginPath();c.moveTo(onX,height/2-4);c.lineTo(onX,height/2+4);c.stroke();c.strokeStyle=`rgb(70 75 85 / ${.7*(1-p)})`;c.beginPath();c.arc(offX,height/2,3.5,0,Math.PI*2);c.stroke();}
    trackBinding.surface.content(colorSource);
  };
  const materialState=(pressed:boolean)=>{const solid=renderer.accessibility.reducedTransparency;surface.material(pressed?active:resting).contentOpacity(element.disabled?restingOpacity*.5:pressed?solid?1:activeOpacity:restingOpacity);element.classList.toggle('lg-active',pressed);};
  const position=(value:number,animate=true)=>{place(value);binding.refresh(animate);paint();};
  const restore=()=>{held=false;dragged=false;surface.motion(release).interact(false);materialState(false);position(checked?1:0);};
  const setChecked=(next:boolean,animate=true)=>{if(disposed)return;if(held)restore();checked=!!next;element.setAttribute('aria-checked',String(checked));surface.motion(release);position(checked?1:0,animate);};
  const commit=(next:boolean)=>{const changed=checked!==next;setChecked(next);if(changed){element.dispatchEvent(new Event('change',{bubbles:true}));options.onChange?.(checked);}};
  const point=(e:PointerInput)=>{const r=renderer.canvas.getBoundingClientRect();return[(e.clientX-r.left)*renderer.size.width/r.width,(e.clientY-r.top)*renderer.size.height/r.height]as const;};
  const follow=(e:PointerInput)=>{
    if(!held)return;const delta=e.clientX-startX;if(Math.abs(delta)>3)dragged=true;
    if(dragged){const screenTravel=travel*track.getBoundingClientRect().width/width,p=Math.max(0,Math.min(1,startProgress+delta/screenTravel*(rtl?-1:1)));position(p);}
    surface.interact(true,...point(e));
  };
  const stopPointer=capturePointer(element,{
    start:e=>{if(element.disabled||disposed)return false;geometry();held=true;dragged=false;startX=e.clientX;startProgress=progress();element.classList.add('lg-pointer-focus');element.focus({preventScroll:true});surface.motion(tracking).interact(true,...point(e));materialState(true);},
    move:follow,end:e=>{if(!held)return;follow(e);const next=dragged?(rtl?parseFloat(thumb.style.left)<inset+travel/2:parseFloat(thumb.style.left)>inset+travel/2):!checked;held=false;dragged=false;surface.motion(release).interact(false);materialState(false);commit(next);},cancel:()=>{if(held)restore();}
  });
  const click=(e:MouseEvent)=>{if(!element.disabled&&e.detail===0)commit(!checked);};
  const keydown=(e:KeyboardEvent)=>{
    if(element.disabled)return;element.classList.remove('lg-pointer-focus');
    if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();commit(e.key==='Home'?false:e.key==='End'?true:e.key==='ArrowRight'?!rtl:rtl);return;}
    if((e.key===' '||e.key==='Enter')&&!e.repeat){surface.interact(true);materialState(true);}
  };
  const blur=()=>{element.classList.remove('lg-pointer-focus');keyup();};
  const keyup=()=>{if(!held){surface.interact(false);materialState(false);}};
  const setDisabled=(value:boolean)=>{element.disabled=value;};
  const setPressed=(pressed:boolean)=>{if(element.disabled)return;surface.interact(pressed);materialState(pressed);};
  const disabledChanged=new MutationObserver(()=>{if(element.disabled&&held)restore();materialState(false);paintKey='';paint();});disabledChanged.observe(element,{attributes:true,attributeFilter:['disabled']});
  const refresh=(animate=false)=>{if(disposed)return;geometry();trackBinding.refresh(animate);const scaleY=renderer.size.height/renderer.canvas.getBoundingClientRect().height,viewHeight=track.getBoundingClientRect().height*scaleY;trackBinding.surface.move({radius:viewHeight/2},animate);position(checked?1:0,animate);if(options.radius===undefined)surface.move({radius:thumb.offsetHeight/height*viewHeight/2},animate);};
  const sizeObserver=new ResizeObserver(()=>refresh());sizeObserver.observe(track);sizeObserver.observe(thumb);
  const unsubscribe=renderer.subscribe(()=>{if(!disposed){paint();if(renderer.accessibility.reducedTransparency&&held&&surface.state.contentOpacity<1)surface.contentOpacity(1);}});
  element.addEventListener('click',click);element.addEventListener('keydown',keydown);element.addEventListener('keyup',keyup);element.addEventListener('blur',blur);
  setChecked(checked,false);materialState(false);paint();
  return{element,surface,track,thumb,trackSurface:trackBinding.surface,get checked(){return checked;},get disabled(){return element.disabled;},setChecked,setDisabled,setPressed,refresh,dispose:()=>{
    if(disposed)return;stopPointer();disposed=true;sizeObserver.disconnect();disabledChanged.disconnect();unsubscribe();element.removeEventListener('click',click);element.removeEventListener('keydown',keydown);element.removeEventListener('keyup',keyup);element.removeEventListener('blur',blur);binding.dispose();trackBinding.dispose();element.remove();
  }};
}
