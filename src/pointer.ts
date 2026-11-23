export interface PointerInput {clientX:number;clientY:number;pointerId:number;timeStamp:number;event:PointerEvent|MouseEvent}
export interface PointerSession {start:(point:PointerInput)=>void|boolean;move:(point:PointerInput)=>void;end:(point:PointerInput)=>void;cancel:()=>void}
/** Window listeners keep a grab alive outside the element and in embedded hosts without pointer capture. */
export function capturePointer(element:HTMLElement,handlers:PointerSession):()=>void{
  let active:number|'mouse'|undefined;
  const previous={touchAction:element.style.touchAction,userSelect:element.style.userSelect};
  element.style.touchAction='none';element.style.userSelect='none';
  const sample=(event:PointerEvent|MouseEvent):PointerInput=>({clientX:event.clientX,clientY:event.clientY,pointerId:'pointerId'in event?event.pointerId:-1,timeStamp:event.timeStamp,event});
  const cancel=()=>{if(active===undefined)return;active=undefined;handlers.cancel();};
  const down=(event:PointerEvent)=>{
    if(active!==undefined||event.button!==0||event.isPrimary===false)return;
    if(handlers.start(sample(event))===false)return;
    event.preventDefault();active=event.pointerId;
    // Some WebViews expose setPointerCapture but reject capture for forwarded input.
    try{element.setPointerCapture(event.pointerId);}catch{/* Window routing below is the fallback. */}
  };
  const move=(event:PointerEvent)=>{if(active===event.pointerId){event.preventDefault();handlers.move(sample(event));}};
  const up=(event:PointerEvent)=>{if(active!==event.pointerId)return;active=undefined;handlers.end(sample(event));try{if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);}catch{/* Host capture was unavailable. */}};
  const lost=(event:PointerEvent)=>{if(active===event.pointerId)cancel();};
  const mouseDown=(event:MouseEvent)=>{if(active!==undefined||event.button!==0)return;if(handlers.start(sample(event))===false)return;event.preventDefault();active='mouse';};
  const mouseMove=(event:MouseEvent)=>{if(active==='mouse'){event.preventDefault();handlers.move(sample(event));}};
  const mouseUp=(event:MouseEvent)=>{if(active!=='mouse')return;active=undefined;handlers.end(sample(event));};
  const nativeDrag=(event:DragEvent)=>event.preventDefault();
  element.addEventListener('pointerdown',down);element.addEventListener('mousedown',mouseDown);element.addEventListener('dragstart',nativeDrag);
  window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',lost,true);element.addEventListener('lostpointercapture',lost);
  window.addEventListener('mousemove',mouseMove,{capture:true,passive:false});window.addEventListener('mouseup',mouseUp,true);window.addEventListener('blur',cancel);
  return()=>{cancel();Object.assign(element.style,previous);element.removeEventListener('pointerdown',down);element.removeEventListener('mousedown',mouseDown);element.removeEventListener('dragstart',nativeDrag);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',lost,true);element.removeEventListener('lostpointercapture',lost);window.removeEventListener('mousemove',mouseMove,true);window.removeEventListener('mouseup',mouseUp,true);window.removeEventListener('blur',cancel);};
}
