import type{GlassRenderer}from'./renderer.js';
export interface EnvironmentLight{requestDeviceOrientation:()=>Promise<boolean>;dispose:()=>void}
/** Pointer-driven specular light; device orientation is enabled only by an explicit caller action. */
export function bindEnvironmentLight(renderer:GlassRenderer,element:HTMLElement,options:{strength?:number}={}):EnvironmentLight{
  const strength=options.strength??.8;if(!Number.isFinite(strength)||strength<0||strength>2)throw new RangeError('Invalid light strength');
  let disposed=false,orientation=false;
  const move=(event:PointerEvent)=>{if(disposed||renderer.accessibility.reducedMotion)return;const r=element.getBoundingClientRect(),x=(event.clientX-r.left)/r.width-.5,y=(event.clientY-r.top)/r.height-.5;renderer.setLight(-.65+x*strength,-.76+y*strength);};
  const tilt=(event:DeviceOrientationEvent)=>{if(disposed||renderer.accessibility.reducedMotion||event.beta===null||event.gamma===null)return;renderer.setLight(-.65+Math.max(-1,Math.min(1,event.gamma/45))*strength,-.76+Math.max(-1,Math.min(1,event.beta/90))*strength);};
  element.addEventListener('pointermove',move,{passive:true});
  return{requestDeviceOrientation:async()=>{
    if(disposed||typeof DeviceOrientationEvent==='undefined')return false;
    const type=DeviceOrientationEvent as typeof DeviceOrientationEvent&{requestPermission?:()=>Promise<string>};
    if(type.requestPermission&&await type.requestPermission()!=='granted')return false;
    if(!orientation&&!disposed){window.addEventListener('deviceorientation',tilt);orientation=true;}return!disposed;
  },dispose:()=>{if(disposed)return;disposed=true;element.removeEventListener('pointermove',move);window.removeEventListener('deviceorientation',tilt);}};
}
