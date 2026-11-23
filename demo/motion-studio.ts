import {GlassRenderer,createGlassShape,bindDrag,glassToggle,glassSlider,glassTabs,glassPopover,glassSheet,glassSearch,bindScrollBehavior,bindLiquidSelection,bindEnvironmentLight,type Rect,type SurfaceOptions} from '../src';
import './motion-studio.css';
type Scenario='touch'|'layers'|'shape'|'morph'|'fusion'|'materialize'|'controls'|'navigation'|'scroll'|'search'|'sheet';
type Step=<T>(promise:Promise<T>)=>Promise<T>;
interface Experiment{play:(step:Step,wait:(ms:number)=>Promise<void>)=>Promise<void>;dispose:()=>void}
const labels:Record<Scenario,[string,string]>={touch:['Touch & light','Hold and drag the button anywhere. Nothing restarts during your gesture.'],layers:['Glass over glass','Drag the front lens across the rear panel. Its material and lettering are refracted together.'],shape:['Free contours','Drag the drop; choose a different contour. The same material follows curves and holes.'],morph:['Button → menu','Open the menu. Move between its rows; the highlight follows continuously.'],fusion:['Merge & split','Drag either surface toward the other to merge their optical boundaries.'],materialize:['Appear & dissolve','The material arrives through its optics.'],controls:['Live controls','Glass moves to the part you are interacting with.'],navigation:['Navigation lens','Hold and drag across the icons. Color, refraction and selection move together.'],scroll:['Scroll & adapt','Navigation recedes. The material follows its backdrop.'],search:['Search morph','A search control unfolds from its icon.'],sheet:['Sheet transition','A button becomes a sheet, then an anchored surface.']};

export function mountMotionStudio(before:HTMLElement){
  const section=document.createElement('section');section.id='motion-studio';section.className='motion-studio';
  section.innerHTML=`<div class="motion-heading"><div><div class="eyebrow">MOTION IS PART OF THE MATERIAL</div><h2>The part you can feel.</h2><p>Drag, overlap, change the contour. Every effect uses the public material API.</p></div><button class="motion-play" id="motion-play" aria-pressed="false"><span>▶</span> Watch all interactions</button></div><div class="motion-layout"><nav class="motion-scenarios" aria-label="Motion experiments">${Object.entries(labels).map(([id,[title]],i)=>`<button data-motion="${id}" aria-pressed="${i===0}"><span>${String(i+1).padStart(2,'0')}</span>${title}<b>↗</b></button>`).join('')}</nav><div class="motion-stage" id="motion-stage"><canvas id="motion-canvas" aria-hidden="true"></canvas><div class="motion-stage-label"><span class="live-dot"></span><span id="motion-title">Touch & light</span><button id="motion-replay" aria-label="Replay current interaction">↻ Replay</button></div><div class="motion-objects"></div><div class="motion-pointer" aria-hidden="true"></div><div class="motion-description" id="motion-description"></div><div class="motion-stage-footer"><span id="motion-step">INTERACTIVE · PRESS AND HOLD THE SURFACE</span><span id="motion-rendering">WEBGL 2 / ON DEMAND</span></div></div></div><div class="motion-foot"><span>INTERRUPTIBLE SPRINGS · GEOMETRY + CONTENT IN SYNC · NO ANIMATION LOOP AT REST</span><a href="https://developer.apple.com/videos/play/wwdc2025/323/" target="_blank" rel="noreferrer">Based on observed Liquid Glass behaviors ↗</a></div>`;
  before.before(section);
  const board=section.querySelector<HTMLElement>('.motion-stage')!,canvas=section.querySelector<HTMLCanvasElement>('canvas')!,objects=section.querySelector<HTMLElement>('.motion-objects')!,pointer=section.querySelector<HTMLElement>('.motion-pointer')!;
  const renderer=new GlassRenderer(canvas,{quality:'balanced',measureGpu:true});
  const environment=bindEnvironmentLight(renderer,board,{strength:.6});
  let selected:Scenario='touch',experiment:Experiment|undefined,epoch=0,running=false,disposed=false,firstResize=true;
  const source=document.createElement('canvas');
  const caption=(text:string)=>{section.querySelector('#motion-step')!.textContent=text;};
  const finger=(x:number,y:number,down=false)=>{Object.assign(pointer.style,{left:`${x}px`,top:`${y}px`,opacity:down?'1':'0',scale:down?'.8':'1.1'});};
  function paint(offset=0){
    const w=board.clientWidth,h=board.clientHeight,scale=Math.min(devicePixelRatio,1.25);source.width=Math.round(w*scale);source.height=Math.round(h*scale);const c=source.getContext('2d')!;c.scale(scale,scale);
    const dark=Math.min(1,offset/360),mix=(a:number,b:number)=>Math.round(a+(b-a)*dark);
    const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,`rgb(${mix(199,26)},${mix(220,37)},${mix(234,62)})`);g.addColorStop(.55,`rgb(${mix(242,68)},${mix(224,55)},${mix(210,91)})`);g.addColorStop(1,`rgb(${mix(213,30)},${mix(190,47)},${mix(214,75)})`);c.fillStyle=g;c.fillRect(0,0,w,h);
    const mask=document.createElement('canvas');mask.width=source.width;mask.height=source.height;const m=mask.getContext('2d')!;m.scale(scale,scale);
    for(const context of [c,m]){context.fillStyle=context===m?'white':dark>.5?'#edf1f5':'#31435c';context.font=`400 ${Math.min(w*.11,88)}px Georgia,serif`;context.letterSpacing='-3px';context.fillText('Light, in',w*.09,h*.35-offset*.25);context.fillText('motion.',w*.09,h*.35+Math.min(w*.115,92)-offset*.25);context.letterSpacing='0px';}
    renderer.setVibrancySource(mask,{color:[.05,.45,1]});
    if(selected==='scroll'){c.font='15px Georgia,serif';c.fillStyle=dark>.5?'#ffffff70':'#34415880';for(let i=0;i<14;i++)c.fillText(i%2?'Light, geometry, and movement remain connected.':'The interface makes room for what matters.',w*.1,h*.65+i*44-offset);}
    renderer.setBackdrop(source);
  }
  const rect=(x:number,y:number,width:number,height:number,radius=height/2):Rect=>({x,y,width,height,radius});
  const drop=createGlassShape({path:'M 51 3 C 62 26 91 42 93 65 C 96 89 76 97 53 97 C 25 97 5 85 8 61 C 11 39 39 26 51 3 Z'});
  const pebble=createGlassShape({path:'M 14 22 C 28 2 52 10 65 18 C 83 21 98 34 94 54 C 100 81 78 96 55 91 C 31 98 4 85 8 62 C 2 44 4 33 14 22 Z'});
  const ring=createGlassShape({path:'M 50 5 A 45 45 0 1 1 49.99 5 Z M 50 30 A 20 20 0 1 1 49.99 30 Z',fillRule:'evenodd'});
  const cx=()=>board.clientWidth/2,cy=()=>board.clientHeight*.57;
  function actor(id:string,label:string,r:Rect,options:Partial<SurfaceOptions>={}){
    const element=document.createElement('button');element.type='button';element.className='motion-actor';element.textContent=label;objects.append(element);
    const surface=renderer.addSurface({id:`studio-${id}`,rect:r,...options});
    const unsubscribe=renderer.subscribe(()=>{const state=surface.state,v=state.visualRect;Object.assign(element.style,{left:`${v.x}px`,top:`${v.y}px`,width:`${v.width}px`,height:`${v.height}px`,borderRadius:`${v.radius}px`,color:surface.foreground,opacity:String(state.visibility),visibility:state.visibility<.001?'hidden':'visible'});});
    const down=(e:PointerEvent)=>{stop();const b=board.getBoundingClientRect();surface.interact(true,e.clientX-b.left,e.clientY-b.top);};const up=()=>surface.interact(false);
    element.addEventListener('pointerdown',down);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
    return{element,surface,dispose:()=>{unsubscribe();window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);surface.remove();element.remove();}};
  }
  function mount(scenario:Scenario):Experiment{
    objects.innerHTML='';board.dataset.scene=scenario;pointer.style.opacity='0';renderer.setVibrancySource(null);renderer.setScrollEdges({top:0,bottom:0,left:0,right:0});paint();
    if(scenario==='touch'){
      const a=actor('touch','Hold & move',rect(cx()-82,cy()-29,164,58,29),{vibrancy:true,material:{variant:'clear',appearance:'light',frost:.03,refraction:18}});a.element.classList.add('motion-touch-actor');const drag=bindDrag(renderer,a.element,{surface:a.surface,onStart:()=>stop()});
      return{dispose:()=>{drag.dispose();a.dispose();},play:async(step,wait)=>{caption('TOUCH · THE SURFACE LIFTS, FLEXES, AND ILLUMINATES');finger(cx()+44,cy(),true);a.surface.interact(true,cx()+44,cy());await wait(650);a.surface.interact(false);finger(cx()+44,cy());await step(a.surface.settled());caption('MATERIAL · OPTICAL PARAMETERS CHANGE CONTINUOUSLY');a.surface.material({tint:[.35,.53,1],tintOpacity:.45,frost:.2,refraction:22});await step(a.surface.settled());a.surface.material({tint:[1,1,1],tintOpacity:0,frost:.03,refraction:18});await step(a.surface.settled());}};
    }
    if(scenario==='layers'){
      const w=Math.min(330,board.clientWidth-90),h=174,ink=document.createElement('canvas');ink.width=w*2;ink.height=h*2;const c=ink.getContext('2d')!;c.scale(2,2);c.fillStyle='#223444';c.font='500 22px system-ui';c.fillText('Made of light.',24,48);c.font='14px system-ui';c.fillText('A real surface behind another.',24,79);c.fillStyle='#167bf5';c.beginPath();c.roundRect(24,105,w-48,40,20);c.fill();c.fillStyle='white';c.font='500 14px system-ui';c.fillText('Content belongs to this layer',40,131);
      const rear=actor('rear','Rear glass panel',rect(cx()-w/2,cy()-h/2,w,h,28),{content:ink,layer:0,elastic:false,material:{frost:.55,tint:[.8,.91,1],tintOpacity:.18}});rear.element.style.fontSize='0';rear.element.style.pointerEvents='none';
      const front=actor('front','Drag front glass',rect(cx()+12,cy()-33,128,80,40),{layer:1,material:{variant:'clear',appearance:'light',frost:0,refraction:24,magnification:1.13}});front.element.classList.add('motion-layer-lens');front.element.style.fontSize='0';const drag=bindDrag(renderer,front.element,{surface:front.surface,onStart:stop});
      return{dispose:()=>{drag.dispose();front.dispose();rear.dispose();},play:async(step,wait)=>{caption('COMPOSITION · MATERIAL + CONTENT → NEXT OPTICAL LAYER');for(const x of [cx()-w/2+12,cx()+w/2-110,cx()-50]){await step(front.surface.animateTo({x,y:cy()-20}));await wait(300);}}};
    }
    if(scenario==='shape'){
      const a=actor('contour','Drag free glass contour',rect(board.clientWidth*.34-86,board.clientHeight*.46-86,172,172,60),{shape:drop,vibrancy:true,material:{variant:'clear',appearance:'light',frost:.02,refraction:24,magnification:1.08}});a.element.style.fontSize='0';const drag=bindDrag(renderer,a.element,{surface:a.surface,onStart:stop});
      const choices=document.createElement('div');choices.className='motion-contours';objects.append(choices);const entries=[['Drop',drop],['Pebble',pebble],['Ring',ring],['Rounded',null]]as const;
      entries.forEach(([label,shape],i)=>{const b=document.createElement('button');b.textContent=label;b.type='button';b.setAttribute('aria-pressed',String(i===0));b.addEventListener('click',()=>{stop();void a.surface.shape(shape);choices.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));});choices.append(b);});
      return{dispose:()=>{drag.dispose();a.dispose();choices.remove();},play:async(step,wait)=>{caption('CONTOUR · AN SVG PATH, WITH REAL OPTICS ALONG ITS BOUNDARY');for(const shape of [pebble,ring,drop]){await step(a.surface.shape(shape));await wait(450);}}};
    }
    if(scenario==='morph'){
      const anchor=document.createElement('button');anchor.className='motion-anchor';anchor.textContent='•••';anchor.setAttribute('aria-label','Open studio menu');Object.assign(anchor.style,{left:`${board.clientWidth-74}px`,top:`${board.clientHeight*.26}px`,width:'46px',height:'46px'});objects.append(anchor);
      const popover=glassPopover(renderer,anchor,[{label:'Add to collection'},{label:'Share this moment'},{label:'Edit appearance'},{label:'Remove',separator:true}],{id:'studio-popover',parent:objects,width:264});
      return{dispose:()=>{popover.dispose();anchor.remove();},play:async(step,wait)=>{caption('MATCHED GEOMETRY · BUTTON → MENU');await step(popover.open());await wait(800);caption('INTERRUPTIBLE · MENU → ORIGINAL BUTTON');await step(popover.close());}};
    }
    if(scenario==='fusion'){
      const actors=[-1,0,1].map((n,i)=>actor(`fusion-${i}`,['✦','◌','＋'][i],rect(cx()-34+n*122,cy()-34,68,68),{group:'studio-fusion',spacing:44}));
      const drags=actors.map(a=>bindDrag(renderer,a.element,{surface:a.surface,onStart:stop}));
      return{dispose:()=>{drags.forEach(d=>d.dispose());actors.forEach(a=>a.dispose());},play:async(step,wait)=>{caption('MERGE · INTERNAL EDGES DISAPPEAR INTO A SHARED SURFACE');await step(Promise.all(actors.map((a,i)=>a.surface.animateTo({x:cx()-34+(i-1)*53}))));await wait(650);caption('SPLIT · THE OPTICAL BOUNDARY PULLS APART');await step(Promise.all(actors.map((a,i)=>a.surface.animateTo({x:cx()-34+(i-1)*122,y:cy()-34+(i===1?-26:0)}))));await wait(250);await step(Promise.all(actors.map(a=>a.surface.animateTo({y:cy()-34}))));}};
    }
    if(scenario==='materialize'){
      const width=Math.min(132,(board.clientWidth-70)/3),actors=[0,1,2].map((i)=>actor(`appear-${i}`,['Clarity','Fluidity','Continuity'][i],rect(cx()+(i-1)*(width+12)-width/2,cy()-30,width,60),{group:'studio-appear',spacing:20}));
      return{dispose:()=>actors.forEach(a=>a.dispose()),play:async(step,wait)=>{await step(Promise.all(actors.map(a=>a.surface.hide({immediate:true}))));caption('MATERIALIZE · LENSING, LIGHT, AND CONTENT ARRIVE TOGETHER');const pending=[];for(const a of actors){pending.push(a.surface.show());await wait(120);}await step(Promise.all(pending));await wait(600);caption('DISSOLVE · EACH MEMBER CAN LEAVE A SHARED GROUP');for(const a of [...actors].reverse()){void a.surface.hide();await wait(120);}await step(Promise.all(actors.map(a=>a.surface.settled())));}};
    }
    if(scenario==='controls'){
      const box=document.createElement('div');box.className='motion-controls-box';objects.append(box);
      const tabs=glassTabs(renderer,box,['Today','Saved','All'],{id:'studio-tabs',label:'Studio navigation'}),toggle=glassToggle(renderer,box,'Airplane mode',false,{id:'studio-toggle'}),slider=glassSlider(renderer,box,'Volume',35,{id:'studio-slider'});
      return{dispose:()=>{tabs.dispose();toggle.dispose();slider.dispose();box.remove();},play:async(step,wait)=>{caption('SEGMENTED PICKER · THE LIQUID LENS TRAVELS BETWEEN VALUES');tabs.select(2);await step(tabs.surface.settled());tabs.select(1);await step(tabs.surface.settled());caption('SWITCH · THE THUMB MOVES, STRETCHES, AND SETTLES');toggle.surface.interact(true);toggle.setChecked(true);await wait(450);toggle.surface.interact(false);await step(toggle.surface.settled());caption('SLIDER · THE VALUE REMAINS VISIBLE THROUGH THE ACTIVE LENS');slider.surface.material({frost:.08,refraction:18});slider.surface.interact(true);slider.setValue(86);await step(slider.surface.settled());slider.setValue(24);await wait(450);slider.surface.interact(false);slider.surface.material({frost:.65,refraction:3});await step(slider.surface.settled());}};
    }
    if(scenario==='navigation'){
      const width=Math.min(440,board.clientWidth-36),height=76,left=cx()-width/2,top=cy()-height/2;
      const rail=document.createElement('div');rail.className='motion-navigation';Object.assign(rail.style,{left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`});objects.append(rail);
      const names=['Profile','Calls','Messages','Settings'],buttons=names.map(name=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',name);button.textContent=name;rail.append(button);return button;});
      const foreground=document.createElement('canvas');foreground.width=source.width;foreground.height=source.height;
      const ink=document.createElement('canvas');ink.width=Math.round(width*2);ink.height=height*2;const inkContext=ink.getContext('2d')!;inkContext.scale(2,2);
      const bg=source.getContext('2d')!,fg=foreground.getContext('2d')!,ratio=source.width/board.clientWidth;
      fg.scale(ratio,ratio);
      bg.fillStyle='#101318';bg.fillRect(0,0,board.clientWidth,board.clientHeight);bg.fillStyle='#edf0f5';bg.font='600 24px system-ui';bg.fillText('Messages',left+12,110);
      for(let i=0;i<4;i++){const y=146+i*53;bg.fillStyle=['#536d8a','#947e93','#5e8c85','#8b8067'][i];bg.beginPath();bg.arc(left+27,y,18,0,Math.PI*2);bg.fill();bg.fillStyle='#d3dae4';bg.font='500 14px system-ui';bg.fillText(['Anna','Design team','Alex','Family'][i],left+58,y-4);bg.fillStyle='#7b8798';bg.font='12px system-ui';bg.fillText('A conversation worth keeping',left+58,y+14);}
      const drawIcon=(c:CanvasRenderingContext2D,x:number,y:number,type:number,color:string)=>{c.save();c.translate(x,y);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=2.6;c.lineCap='round';c.lineJoin='round';
        if(type===0){c.beginPath();c.arc(0,0,18,0,Math.PI*2);c.fill();c.fillStyle='#263443';c.beginPath();c.arc(0,-5,5,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(0,8,10,6,0,0,Math.PI*2);c.fill();}
        if(type===1){c.rotate(-.6);c.lineWidth=9;c.beginPath();c.moveTo(-9,-11);c.bezierCurveTo(-15,9,3,18,12,10);c.stroke();c.lineWidth=4;c.beginPath();c.moveTo(-11,-12);c.lineTo(-5,-8);c.moveTo(8,12);c.lineTo(12,5);c.stroke();}
        if(type===2){c.beginPath();c.ellipse(-3,-1,17,13,0,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(-13,6);c.lineTo(-18,17);c.lineTo(-1,9);c.fill();c.strokeStyle='#25303d';c.lineWidth=2;c.beginPath();c.arc(5,4,16,-.3,1.8);c.stroke();}
        if(type===3){c.lineWidth=3;for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.moveTo(Math.cos(a)*14,Math.sin(a)*14);c.lineTo(Math.cos(a)*20,Math.sin(a)*20);c.stroke();}c.beginPath();c.arc(0,0,14,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,8,0,Math.PI*2);c.stroke();}c.restore();};
      for(let i=0;i<4;i++){
        const x=(i+.5)*width/4,y=height/2;drawIcon(inkContext,x,y,i,'#f7f8fb');drawIcon(fg,left+x,top+y,i,'white');
        if(i>=2){const c=inkContext;c.fillStyle='#ff3d4e';c.beginPath();c.roundRect(x+8,y-30,i===2?30:22,27,14);c.fill();c.fillStyle='white';c.font='500 15px system-ui';c.textAlign='center';c.fillText(i===2?'1K':'!',x+(i===2?23:19),y-11);
          fg.save();fg.globalCompositeOperation='destination-out';fg.beginPath();fg.roundRect(left+x+8,top+y-30,i===2?30:22,27,14);fg.fill();fg.restore();
        }
      }
      const railSurface=renderer.addSurface({id:'studio-navigation-rail',rect:rect(left,top,width,height,38),elastic:false,layer:0,content:ink,material:{appearance:'dark',frost:.6,tint:[.12,.15,.19],tintOpacity:.25,shadow:.08}});
      renderer.setBackdrop(source);renderer.setVibrancySource(foreground,{color:[.19,.54,1]});
      const selection=bindLiquidSelection(renderer,rail,{id:'studio-navigation',items:buttons,initialIndex:2});
      return{dispose:()=>{selection.dispose();railSurface.remove();rail.remove();renderer.setVibrancySource(null);},play:async(step,wait)=>{
        caption('REFERENCE STUDY · THE LENS REFRACTS ICONS AND BADGES, TOO');
        // Synthetic pointer capture is unavailable without a physical pointer; drive the same surface API during playback.
        const h=selection.surface;h.material({frost:.025,refraction:15,magnification:1.16,tintOpacity:0});h.interact(true,left+width*.85,top+height/2);finger(left+width*.85,top+height/2,true);
        await step(h.animateTo({x:left+width*.85-50,y:top-8,width:100,height:84,radius:42}));await wait(400);
        for(const part of [.2,.6,.35,.85]){finger(left+width*part,top+height/2,true);await step(h.animateTo({x:left+width*part-50}));await wait(130);}
        finger(0,0);h.interact(false);selection.select(3);await step(h.settled());await wait(350);selection.select(1);await step(h.settled());
      }};
    }
    if(scenario==='scroll'){
      const scroll=document.createElement('div');scroll.className='motion-scroller';const spacer=document.createElement('div');spacer.style.height='1800px';scroll.append(spacer);objects.append(scroll);
      const width=Math.min(330,board.clientWidth-50),expanded=rect(cx()-width/2,board.clientHeight-100,width,62),collapsed=rect(board.clientWidth-92,board.clientHeight-88,66,50);
      const a=actor('scroll','Library     ◇     Collections',expanded);
      const behavior=bindScrollBehavior(renderer,scroll,{surface:a.surface,expanded,collapsed,onScroll:offset=>{paint(offset);a.element.textContent=offset>80?'◈':'Library     ◇     Collections';}});
      return{dispose:()=>{behavior.dispose();a.dispose();scroll.remove();},play:async(step,wait)=>{caption('SCROLL DOWN · NAVIGATION MINIMIZES AS CONTENT MOVES UNDER IT');scroll.scrollTo({top:420,behavior:renderer.accessibility.reducedMotion?'instant':'smooth'});await wait(1100);await step(a.surface.settled());caption('SCROLL UP · NAVIGATION RETURNS AND THE MATERIAL ADAPTS');scroll.scrollTo({top:0,behavior:renderer.accessibility.reducedMotion?'instant':'smooth'});await wait(1100);await step(a.surface.settled());}};
    }
    if(scenario==='search'){
      const box=document.createElement('div');box.className='motion-search-box';objects.append(box);const search=glassSearch(renderer,box,{id:'studio-search',placeholder:'Search your library',width:360});
      return{dispose:()=>{search.dispose();box.remove();},play:async(step,wait)=>{caption('SEARCH · THE ICON GROWS INTO AN INPUT WITHOUT A CUT');await step(search.expand());search.input.value='Liquid Glass';search.input.dispatchEvent(new Event('input',{bubbles:true}));await wait(850);caption('DISMISS · THE SAME SURFACE RETURNS TO ITS SOURCE');await step(search.collapse());}};
    }
    const anchor=document.createElement('button');anchor.className='motion-anchor motion-sheet-anchor';anchor.textContent='Show details';Object.assign(anchor.style,{left:`${cx()-90}px`,top:`${board.clientHeight-90}px`,width:'180px',height:'54px'});objects.append(anchor);
    const content=document.createElement('div');content.setAttribute('aria-label','Material details');content.innerHTML='<h3>One continuous surface.</h3><p>From a control to a presentation. The material grows thicker as the sheet expands.</p><button type="button" class="motion-detent">Expand sheet</button><button type="button" class="motion-sheet-close">Done</button>';
    const sheet=glassSheet(renderer,anchor,content,{id:'studio-sheet',parent:objects,height:270});content.querySelector('.motion-detent')!.addEventListener('click',()=>void sheet.setDetent('large'));content.querySelector('.motion-sheet-close')!.addEventListener('click',()=>void sheet.close());
    return{dispose:()=>{sheet.dispose();anchor.remove();},play:async(step,wait)=>{caption('PRESENT · THE BUTTON BECOMES A FLOATING SHEET');await step(sheet.open());await wait(600);caption('EXPAND · GLASS BECOMES THICKER AND ANCHORS TO THE CANVAS');await step(sheet.setDetent('large'));await wait(650);caption('RETURN · THE PRESENTATION COLLAPSES INTO ITS SOURCE');await step(sheet.close());}};
  }
  function select(id:Scenario){
    experiment?.dispose();selected=id;section.querySelectorAll<HTMLElement>('[data-motion]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.motion===id)));section.querySelector('#motion-title')!.textContent=labels[id][0];section.querySelector('#motion-description')!.textContent=labels[id][1];experiment=mount(id);caption('INTERACTIVE · TRY IT YOURSELF OR REPLAY');
  }
  function stop(){epoch++;running=false;renderer.releaseInteractions();section.querySelector('#motion-play')!.setAttribute('aria-pressed','false');section.querySelector('#motion-play')!.innerHTML='<span>▶</span> Watch all interactions';pointer.style.opacity='0';}
  async function play(all=false){
    stop();const ticket=epoch;running=true;section.querySelector('#motion-play')!.setAttribute('aria-pressed','true');section.querySelector('#motion-play')!.innerHTML='<span>Ⅱ</span> Stop playback';
    const check=()=>{if(ticket!==epoch||disposed)throw new Error('cancelled');};
    const step:Step=async promise=>{const result=await promise;check();return result;};const wait=async(ms:number)=>{await new Promise(r=>setTimeout(r,ms));check();};
    try{for(const id of all?Object.keys(labels)as Scenario[]:[selected]){check();select(id);await wait(180);await experiment!.play(step,wait);await wait(300);}if(ticket===epoch){running=false;section.querySelector('#motion-play')!.setAttribute('aria-pressed','false');section.querySelector('#motion-play')!.innerHTML='<span>▶</span> Watch all interactions';caption('SETTLED · NO RENDER LOOP UNTIL THE NEXT INTERACTION');}}catch(error){if(ticket===epoch)stop();if((error as Error).message!=='cancelled')throw error;}
  }
  section.querySelector('#motion-play')!.addEventListener('click',()=>running?stop():void play(true));section.querySelector('#motion-replay')!.addEventListener('click',()=>void play());
  section.querySelectorAll<HTMLElement>('[data-motion]').forEach(button=>button.addEventListener('click',()=>{stop();select(button.dataset.motion as Scenario);}));
  renderer.subscribe(stats=>{section.querySelector('#motion-rendering')!.textContent=`${stats.cpuMs.toFixed(2)} ms CPU${stats.gpuMs===null?'':` / ${stats.gpuMs.toFixed(2)} ms GPU`}`;});
  renderer.resize(board.clientWidth,board.clientHeight);select('touch');
  const resize=new ResizeObserver(()=>{if(firstResize){firstResize=false;return;}stop();renderer.resize(board.clientWidth,board.clientHeight);select(selected);});resize.observe(board);
  let introduced=false;const visible=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&running)stop();},{threshold:.35});visible.observe(board);
  Object.assign(window,{motionStudio:{renderer,play:(all=false)=>{introduced=true;return play(all);},stop:()=>{introduced=true;stop();},select:(id:Scenario)=>{introduced=true;stop();select(id);},get scenario(){return selected;},get playing(){return running;},dispose:()=>{disposed=true;stop();visible.disconnect();resize.disconnect();environment.dispose();experiment?.dispose();renderer.dispose();}}});
}
