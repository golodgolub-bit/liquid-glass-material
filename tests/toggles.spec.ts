import{test,expect}from'@playwright/test';
test('switch draws a dense resting thumb above its real track and becomes refractive on hold',async({page})=>{
  await page.goto('/examples/controls/');await page.waitForFunction(()=>(window as any).glassControls?.renderer.idle);
  const resting=await page.evaluate(async()=>{
    const g=(window as any).glassControls,s=g.preview.surface,r=s.state.visualRect;
    const pixel=await new Promise<number[]>(resolve=>{const stop=g.renderer.subscribe(()=>{stop();const gl=g.renderer.canvas.getContext('webgl2'),p=new Uint8Array(4),d=g.renderer.stats.pixelRatio;gl.readPixels(Math.floor((r.x+r.width/2)*d),Math.floor(gl.drawingBufferHeight-(r.y+r.height/2)*d),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);resolve([...p]);});g.renderer.invalidate();});
    return{pixel,state:s.state,track:g.preview.trackSurface.rect};
  });expect(resting.pixel.slice(0,3).every(v=>v>240)).toBe(true);expect(resting.state.contentOpacity).toBe(1);expect(resting.track.width/resting.track.height).toBeCloseTo(64/28,2);
  const thumb=await page.getByRole('switch',{name:'Preview connection'}).locator('.lg-toggle-thumb').boundingBox();await page.mouse.move(thumb!.x+thumb!.width/2,thumb!.y+thumb!.height/2);await page.mouse.down();
  await expect.poll(()=>page.evaluate(()=>(window as any).glassControls.preview.surface.state.contentOpacity)).toBeLessThan(.08);
  const active=await page.evaluate(()=>{const g=(window as any).glassControls,s=g.preview.surface.state;return{state:s,trackOpacity:getComputedStyle(g.preview.track).backgroundColor,error:g.renderer.canvas.getContext('webgl2').getError()};});
  expect(active.state.visualRect.width).toBeGreaterThan(resting.state.rect.width*1.4);expect(active.state.material.magnification).toBeCloseTo(.8,1);expect(active.trackOpacity).toBe('rgba(0, 0, 0, 0)');expect(active.error).toBe(0);await page.mouse.up();
});
test('switch tap, keyboard and programmatic updates have distinct single-commit semantics',async({page})=>{
  await page.goto('/examples/controls/');await page.evaluate(()=>{const g=(window as any).glassControls;g.events=0;g.preview.element.addEventListener('change',()=>g.events++);});
  const toggle=page.getByRole('switch',{name:'Preview connection'});await toggle.click();await expect(toggle).not.toBeChecked();expect(await page.evaluate(()=>(window as any).glassControls.events)).toBe(1);
  await toggle.focus();await page.keyboard.press('Space');await expect(toggle).toBeChecked();expect(await page.evaluate(()=>(window as any).glassControls.events)).toBe(2);
  await page.evaluate(()=>(window as any).glassControls.preview.setChecked(false));await expect(toggle).not.toBeChecked();expect(await page.evaluate(()=>(window as any).glassControls.events)).toBe(2);
  // Spring completion precedes asynchronous compositor/readability completion.
  await page.evaluate(async()=>{await (window as any).glassControls.preview.surface.settled();});
  await expect.poll(()=>page.evaluate(()=>(window as any).glassControls.renderer.idle),{timeout:15000}).toBe(true);
  const frames=await page.evaluate(()=>(window as any).glassControls.renderer.stats.frames);await page.waitForTimeout(200);
  expect(await page.evaluate(()=>(window as any).glassControls.renderer.stats.frames)).toBe(frames);
});
test('captured dragging survives capture failure and cancellation restores the committed state',async({page})=>{
  await page.goto('/examples/controls/');await page.evaluate(()=>{const g=(window as any).glassControls;g.events=0;g.preview.element.setPointerCapture=()=>{throw new Error('Host capture unavailable');};g.preview.element.addEventListener('change',()=>g.events++);g.preview.element.addEventListener('pointerdown',(e:PointerEvent)=>g.pointerId=e.pointerId);});
  const toggle=page.getByRole('switch',{name:'Preview connection'}),r=await toggle.locator('.lg-toggle-track').boundingBox();
  await page.mouse.move(r!.x+r!.width*.75,r!.y+r!.height/2);await page.mouse.down();await page.mouse.move(r!.x-60,r!.y+r!.height/2,{steps:8});await page.mouse.up();await expect(toggle).not.toBeChecked();
  expect(await page.evaluate(()=>(window as any).glassControls.events)).toBe(1);
  await page.mouse.move(r!.x+15,r!.y+r!.height/2);await page.mouse.down();await page.mouse.move(r!.x+r!.width+40,r!.y+r!.height/2,{steps:8});
  await page.evaluate(()=>{const g=(window as any).glassControls;window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:g.pointerId}));});await page.mouse.up();
  await expect(toggle).not.toBeChecked();expect(await page.evaluate(()=>(window as any).glassControls.events)).toBe(1);
  await expect.poll(()=>page.evaluate(()=>(window as any).glassControls.preview.surface.state.contentOpacity)).toBeCloseTo(1,2);
});
test('switch respects RTL, disabled state and reduced-transparency policy',async({page})=>{
  await page.goto('/examples/controls/');const toggle=page.getByRole('switch',{name:'Preview connection'});await page.getByRole('checkbox',{name:'Right to left'}).check();
  await expect.poll(()=>page.evaluate(()=>{const p=(window as any).glassControls.preview;return p.surface.rect.x-p.trackSurface.rect.x;})).toBeLessThan(10);
  await toggle.focus();await page.keyboard.press('ArrowRight');await expect(toggle).not.toBeChecked();await page.keyboard.press('ArrowLeft');await expect(toggle).toBeChecked();
  await page.getByRole('button',{name:'Disable preview',exact:true}).click();await expect(toggle).toBeDisabled();await page.evaluate(()=>(window as any).glassControls.preview.element.click());await expect(toggle).toBeChecked();
  await page.getByRole('button',{name:'Enable preview',exact:true}).click();await page.evaluate(()=>(window as any).glassControls.renderer.setAccessibility({reducedTransparency:true}));
  const r=await toggle.boundingBox();await page.mouse.move(r!.x+r!.width/2,r!.y+r!.height/2);await page.mouse.down();await expect.poll(()=>page.evaluate(()=>(window as any).glassControls.preview.surface.state.contentOpacity)).toBeCloseTo(1,2);await page.mouse.up();
});
test('basic motion is interruptible, stays in the panel and snaps under Reduced Motion',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/examples/controls/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const initial=await page.evaluate(()=>(window as any).glassControls.motion.surface.rect.x);await page.getByRole('button',{name:'Move the glass',exact:true}).click();await page.waitForTimeout(80);await page.getByRole('button',{name:'Move the glass',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).glassControls.motion.surface.rect.x)).toBeCloseTo(initial,0);
  await page.getByRole('button',{name:'Reshape it',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).glassControls.motion.surface.rect.height)).toBeCloseTo(90,0);
  await page.getByRole('checkbox',{name:'Reduced Motion'}).check();await page.getByRole('button',{name:'Hide the glass',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).glassControls.motion.surface.state.visibility)).toBe(0);
  await page.getByRole('button',{name:'Show the glass',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).glassControls.motion.surface.state.visibility)).toBe(1);
});
test('content opacity changes composited pixels independently of material and validates bounds',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass;t.surface.remove();const c=t.source.getContext('2d');c.fillStyle='black';c.fillRect(0,0,320,240);t.renderer.updateBackdrop();
    const content=document.createElement('canvas');content.width=content.height=4;const ink=content.getContext('2d')!;ink.fillStyle='white';ink.fillRect(0,0,4,4);
    const s=t.renderer.addSurface({id:'opacity',rect:{x:60,y:60,width:200,height:120,radius:20},material:{variant:'identity'},contrast:false,content}),at=(p:number[])=>p[(120*320+160)*4];
    const white=at(await t.capture());s.contentOpacity(0,false);const black=at(await t.capture());s.contentOpacity(.4,false);const gray=at(await t.capture());let rejected=false;try{s.contentOpacity(-.1);}catch{rejected=true;}
    const state=s.state;s.contentOpacity(1,false);const uploads=t.renderer.stats.contentUploads;
    ink.fillStyle='#400000';ink.fillRect(0,0,4,4);s.content(content);const streamed=at(await t.capture());
    content.width=2;content.height=8;ink.fillStyle='#800000';ink.fillRect(0,0,2,8);s.content(content);const resized=at(await t.capture());
    return{white,black,gray,streamed,resized,uploads:t.renderer.stats.contentUploads-uploads,rejected,opacity:state.contentOpacity,visibility:state.visibility,error:t.renderer.canvas.getContext('webgl2').getError()};
  });expect(result.white).toBe(255);expect(result.black).toBe(0);expect(result.gray).toBeCloseTo(102,0);expect(result.streamed).toBe(64);expect(result.resized).toBe(128);expect(result.uploads).toBe(2);expect(result.opacity).toBe(.4);expect(result.visibility).toBe(1);expect(result.rejected).toBe(true);expect(result.error).toBe(0);
});
test('minification compresses transmitted content without changing the glass silhouette',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass,c=t.source.getContext('2d');c.fillStyle='black';c.fillRect(0,0,320,240);c.fillStyle='white';c.fillRect(140,0,40,240);t.renderer.updateBackdrop();
    t.surface.material({variant:'clear',frost:0,refraction:0,reflection:0,highlight:0,dispersion:0,saturation:1,magnification:1},false);const at=(p:number[],x:number)=>p[(120*320+x)*4],base=at(await t.capture(),174),rect=t.surface.rect;
    t.surface.material({magnification:.5},false);const p=await t.capture();return{base,compressed:at(p,174),center:at(p,160),rect,after:t.surface.rect};
  });expect(result.base).toBeGreaterThan(250);expect(result.compressed).toBeLessThan(5);expect(result.center).toBeGreaterThan(250);expect(result.after).toEqual(result.rect);
});
test('slider keeps native range semantics while its thumb reveals the composited rail',async({page})=>{
  await page.goto('/examples/controls/');const input=page.getByRole('slider',{name:'Volume'});await input.focus();await page.keyboard.press('ArrowRight');await expect(input).toHaveValue('56');
  await page.evaluate(()=>(window as any).glassControls.slider.setPressed(true));await expect.poll(()=>page.evaluate(()=>(window as any).glassControls.slider.surface.state.contentOpacity)).toBeLessThan(.08);
  const result=await page.evaluate(()=>{const g=(window as any).glassControls;return{width:g.slider.surface.rect.width,height:g.slider.surface.rect.height,error:g.renderer.canvas.getContext('webgl2').getError()};});expect(result.width/result.height).toBeCloseTo(1.5,1);expect(result.error).toBe(0);
  await page.evaluate(()=>{const s=(window as any).glassControls.slider;s.setPressed(false);s.input.disabled=true;});await expect(input).toBeDisabled();
  await expect.poll(()=>page.evaluate(()=>(window as any).glassControls.slider.surface.state.contentOpacity)).toBeCloseTo(.5,1);
});
test('a switch supports a dark scene and leaves no frames or surfaces after disposal',async({page})=>{
  await page.goto('/tests/harness.html');await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;t.surface.remove();t.renderer.setAccessibility({reducedMotion:true});const c=t.source.getContext('2d');c.fillStyle='#101318';c.fillRect(0,0,320,240);t.renderer.updateBackdrop();
    const host=document.createElement('div');host.style.cssText='position:absolute;left:35px;top:80px;width:250px;color:white';document.body.append(host);
    const s=lib.glassToggle(t.renderer,host,'Dark switch',true,{onOffLabels:true});(window as any).darkSwitch={control:s,host};
  });
  const toggle=page.getByRole('switch',{name:'Dark switch'});await toggle.click();await expect(toggle).not.toBeChecked();
  await expect.poll(()=>page.evaluate(()=>(window as any).testGlass.renderer.idle)).toBe(true);
  const result=await page.evaluate(async()=>{const t=(window as any).testGlass,s=(window as any).darkSwitch;const errors=t.renderer.canvas.getContext('webgl2').getError();s.control.dispose();s.host.remove();await new Promise(r=>setTimeout(r,150));const a=t.renderer.stats;await new Promise(r=>setTimeout(r,200));const b=t.renderer.stats;return{surfaces:b.surfaces,frames:b.frames-a.frames,errors};});
  expect(result).toEqual({surfaces:0,frames:0,errors:0});
});
