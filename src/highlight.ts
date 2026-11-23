import type{GlassRenderer,SurfaceHandle}from'./renderer.js';
import type{GlassMaterial}from'./material.js';
import{capturePointer,type PointerInput}from'./pointer.js';
export interface HighlightOptions{id:string;items:readonly HTMLElement[];layer?:number;material?:Partial<GlassMaterial>}
export interface LiquidHighlight{surface:SurfaceHandle;select:(index:number)=>void;refresh:()=>void;dispose:()=>void}
/** A single moving material boundary for menu rows, hover, keyboard focus and held selection. */
export function bindLiquidHighlight(renderer:GlassRenderer,element:HTMLElement,options:HighlightOptions):LiquidHighlight{
  if(!options.items.length)throw new RangeError('Highlight needs items');
  let index=-1,dragging=false,suppressClick=false,last='';
  const surface=renderer.addSurface({id:options.id,rect:{x:0,y:0,width:1,height:1,radius:12},layer:options.layer??1,hidden:true,elastic:false,material:{variant:'clear',frost:0,refraction:2,thickness:6,shadow:0,highlight:.15,tint:[.7,.75,.8],tintOpacity:.16,...options.material}});
  surface.motion({frequency:6,damping:.9});
  const refresh=()=>{
    if(index<0)return;const b=options.items[index].getBoundingClientRect(),c=renderer.canvas.getBoundingClientRect(),sx=renderer.size.width/c.width,sy=renderer.size.height/c.height;
    const rect={x:(b.left-c.left)*sx,y:(b.top-c.top)*sy,width:b.width*sx,height:b.height*sy,radius:12},key=Object.values(rect).join(',');
    if(key!==last){last=key;surface.move(rect);}
  };
  const select=(next:number)=>{if(!Number.isInteger(next)||next< -1||next>=options.items.length)throw new RangeError('Invalid highlighted item');if(next===index){refresh();return;}index=next;
    options.items.forEach((item,i)=>item.toggleAttribute('data-lg-highlighted',i===index));
    if(index<0){void surface.hide();return;}refresh();void surface.show();
  };
  const find=(target:EventTarget|null)=>options.items.findIndex(item=>item.contains(target as Node));
  const at=(e:PointerInput)=>find(document.elementFromPoint(e.clientX,e.clientY));
  const hover=(e:PointerEvent)=>{if(!dragging)select(find(e.target));},leave=()=>{if(!dragging)select(-1);},focus=(e:FocusEvent)=>select(find(e.target));
  const stop=capturePointer(element,{start:e=>{if(at(e)<0)return false;dragging=true;select(at(e));surface.interact(true);},move:e=>select(at(e)),end:e=>{const next=at(e);dragging=false;surface.interact(false);select(next);if(next>=0){options.items[next].click();suppressClick=true;requestAnimationFrame(()=>{suppressClick=false;});}},cancel:()=>{dragging=false;surface.interact(false);select(-1);}});
  const click=(e:MouseEvent)=>{if(suppressClick&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();}};
  element.addEventListener('pointerover',hover);element.addEventListener('pointerleave',leave);element.addEventListener('focusin',focus);element.addEventListener('click',click,true);
  return{surface,select,refresh,dispose:()=>{stop();element.removeEventListener('pointerover',hover);element.removeEventListener('pointerleave',leave);element.removeEventListener('focusin',focus);element.removeEventListener('click',click,true);options.items.forEach(item=>item.removeAttribute('data-lg-highlighted'));surface.remove();}};
}
