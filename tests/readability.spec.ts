import{test,expect}from'@playwright/test';
test('fixed optical fixture renders every shared reference rectangle',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/examples/reference/');
  await page.waitForFunction(()=>!!(window as any).glassReference);const fixture=await page.evaluate(async()=>{const f=(window as any).glassReference;await f.ready;return{count:f.surfaces.length,width:f.renderer.size.width,height:f.renderer.size.height,probes:f.renderer.stats.contrastCopies,error:f.renderer.canvas.getContext('webgl2').getError()};});
  expect(errors).toEqual([]);expect(fixture).toEqual({count:5,width:960,height:640,probes:0,error:0});
});
test('readability study responds to rear content, resizing and independent edge controls',async({page})=>{
  await page.goto('/examples/readability/');
  await page.waitForFunction(()=>(window as any).glassReadability?.front.state.contrast.source==='composited');
  await expect(page.locator('#rear-result')).toContainText('dark ink');
  await page.getByRole('button',{name:'Switch rear content'}).click();
  await expect(page.locator('#rear-result')).toContainText('light ink');
  await page.getByRole('button',{name:'Expand the surface'}).click();
  await page.waitForFunction(()=>(window as any).glassReadability.panel.rect.width>700);
  const enabled=await page.evaluate(()=>{const s=(window as any).glassReadability.panel.state;return s.material.thickness>s.baseMaterial.thickness;});expect(enabled).toBe(true);
  await page.getByRole('checkbox',{name:'Adapt material to size'}).uncheck();
  const fixed=await page.evaluate(()=>{const s=(window as any).glassReadability.panel.state;return s.material.thickness===s.baseMaterial.thickness;});expect(fixed).toBe(true);
  await page.locator('#width').fill('4');await page.locator('#width').dispatchEvent('input');
  expect(await page.evaluate(()=>(window as any).glassReadability.panel.state.material.specularWidth)).toBe(4);
});
test('foreground reads composited rear content instead of the original black backdrop',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;t.surface.remove();
    const source=t.source.getContext('2d');source.fillStyle='black';source.fillRect(0,0,320,240);t.renderer.updateBackdrop();
    const ink=document.createElement('canvas');ink.width=ink.height=32;const c=ink.getContext('2d')!;c.fillStyle='white';c.fillRect(0,0,32,32);
    t.renderer.addSurface({id:'rear',layer:0,rect:{x:30,y:30,width:260,height:180,radius:24},material:{variant:'identity'},content:ink,contrast:false,sizeAdaptation:false});
    const front=t.renderer.addSurface({id:'front',layer:1,rect:{x:80,y:70,width:160,height:100,radius:30},sizeAdaptation:false});
    const state=await front.contrastReady(),p=await t.capture(),i=(120*320+160)*4,bg=p.slice(i,i+3).map((v:number)=>v/255),fg=front.foreground.match(/\d+/g)!.map(Number).map((v:number)=>v/255);
    return{state,bg,foreground:front.foreground,ratio:lib.contrastRatio(bg,fg),error:t.renderer.canvas.getContext('webgl2').getError()};
  });expect(result.state?.source).toBe('composited');expect(result.foreground).toBe('rgb(23 26 36)');expect(result.ratio).toBeGreaterThan(4.5);expect(result.bg[0]).toBeGreaterThan(.8);expect(result.error).toBe(0);
});
test('default Clear and the bright-background preset keep readable ink without a Regular scrim',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;t.surface.remove();const c=t.source.getContext('2d');c.fillStyle='white';c.fillRect(0,0,320,240);t.renderer.updateBackdrop();
    const s=t.renderer.addSurface({id:'clear',rect:{x:80,y:70,width:160,height:100,radius:30},material:{variant:'clear'},sizeAdaptation:false});
    const clear=await s.contrastReady();s.material(lib.materials.clearDimmed,false);const dimmed=await s.contrastReady();
    return{clear,dimmed,foreground:s.foreground,dimming:s.state.material.dimming};
  });expect(result.clear?.foreground).toBe('dark');expect(result.clear?.ratio).toBeGreaterThan(15);expect(result.clear?.protection).toBe(0);expect(result.dimmed?.ratio).toBeGreaterThan(4.5);expect(result.dimming).toBe(.35);
});
test('Regular protects text over split black/white input and the asynchronous sampler sleeps at rest',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;t.surface.remove();const c=t.source.getContext('2d');c.fillStyle='black';c.fillRect(0,0,160,240);c.fillStyle='white';c.fillRect(160,0,160,240);t.renderer.updateBackdrop();
    const s=t.renderer.addSurface({id:'contrast',rect:{x:80,y:70,width:160,height:100,radius:30},material:{frost:0,refraction:0,highlight:0,reflection:0,ambientSpill:0},sizeAdaptation:false});
    const ready=await s.contrastReady();await s.settled();await new Promise(r=>setTimeout(r,180));const pixels=await t.capture(),fg=s.foreground.match(/\d+/g)!.map(Number).map((v:number)=>v/255);
    const ratios=[110,200].map(x=>{const i=(120*320+x)*4;return lib.contrastRatio(pixels.slice(i,i+3).map((v:number)=>v/255),fg);});
    await new Promise(r=>setTimeout(r,200));const a=t.renderer.stats;await new Promise(r=>setTimeout(r,250));const b=t.renderer.stats;
    const gl=t.renderer.canvas.getContext('webgl2');return{ready,ratios,protection:s.state.contrast.protection,idle:b.frames-a.frames,readbacks:b.contrastReadbacks-a.contrastReadbacks,pack:gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING),error:gl.getError()};
  });expect(result.ratios.every((v:number)=>v>=4.5)).toBe(true);expect(result.protection).toBeGreaterThan(.1);expect(result.ready?.source).toBe('composited');expect(result.idle).toBe(0);expect(result.readbacks).toBe(0);expect(result.pack).toBeNull();expect(result.error).toBe(0);
});
test('edge illumination remains programmable at bevel zero',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass,c=t.source.getContext('2d');c.fillStyle='#505050';c.fillRect(0,0,320,240);t.renderer.updateBackdrop();t.renderer.setLight(1,0,false);
    t.surface.material({variant:'clear',appearance:'light',frost:0,refraction:0,dispersion:0,reflection:0,highlight:1,shadow:0,bevel:0,specularIntensity:0},false);
    const sample=(p:number[],x:number)=>p[(120*320+x)*4],base=await t.capture();t.surface.material({specularIntensity:1,specularWidth:1.4},false);const narrow=await t.capture();t.surface.material({specularWidth:5},false);const wide=await t.capture();
    return{bevel:t.surface.state.material.bevel,edge:sample(narrow,238)-sample(base,238),width:sample(wide,233)-sample(narrow,233),interior:Math.abs(sample(wide,160)-sample(base,160))};
  });expect(result.bevel).toBe(0);expect(result.edge).toBeGreaterThan(20);expect(result.width).toBeGreaterThan(15);expect(result.interior).toBeLessThan(2);
});
test('size adaptation follows intermediate geometry and can be disabled without losing base material',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass,s=t.renderer.addSurface({id:'panel',rect:{x:10,y:10,width:100,height:48,radius:24},contrast:false});
    const small=s.state;s.move({width:300,height:210},false);const large=s.state;s.sizeAdaptation(false);const fixed=s.state;
    const ready=s.contrastReady();s.remove();return{small:small.material,large:large.material,base:large.baseMaterial,fixed:fixed.material,disabled:await ready};
  });expect(result.large.thickness).toBeGreaterThan(result.small.thickness);expect(result.large.scatterRadius).toBeGreaterThan(result.small.scatterRadius);expect(result.large.shadowRadius).toBeGreaterThan(result.small.shadowRadius);expect(result.large.frost).toBeGreaterThan(result.small.frost);expect(result.base.thickness).toBe(18);expect(result.fixed.thickness).toBe(18);expect(result.disabled).toBeNull();
});
test('pending contrast work is cancelled on removal and resumes after context restoration',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass,s=t.renderer.addSurface({id:'pending',rect:{x:60,y:60,width:180,height:110,radius:30}}),pending=s.contrastReady();s.remove();const cancelled=await pending;
    const hidden=t.renderer.addSurface({id:'hidden',rect:{x:60,y:60,width:180,height:110,radius:30}}),hiddenPending=hidden.contrastReady();hidden.hide({immediate:true});if(await hiddenPending!==null)throw new Error('Hidden surface retained contrast work');hidden.remove();
    const active=t.renderer.addSurface({id:'restored',rect:{x:60,y:60,width:180,height:110,radius:30}});await active.contrastReady();
    const gl=t.renderer.canvas.getContext('webgl2'),extension=gl.getExtension('WEBGL_lose_context');if(!extension)return{cancelled,restored:true};
    await new Promise<void>(resolve=>{t.renderer.canvas.addEventListener('webglcontextrestored',()=>resolve(),{once:true});extension.loseContext();setTimeout(()=>extension.restoreContext(),100);});
    const state=await active.contrastReady();return{cancelled,restored:state?.source==='composited',error:gl.getError()};
  });expect(result.cancelled).toBeNull();expect(result.restored).toBe(true);expect(result.error??0).toBe(0);
});
test('a pending old probe cannot satisfy a readiness request for changed rear content',async({page})=>{
  await page.goto('/tests/harness.html');const state=await page.evaluate(async()=>{
    const t=(window as any).testGlass;t.surface.remove();const ink=document.createElement('canvas');ink.width=ink.height=32;const c=ink.getContext('2d')!;c.fillStyle='black';c.fillRect(0,0,32,32);
    const rear=t.renderer.addSurface({id:'revision-rear',rect:{x:20,y:20,width:280,height:200,radius:10},material:{variant:'identity'},content:ink,contrast:false});
    const front=t.renderer.addSurface({id:'revision-front',layer:1,rect:{x:70,y:65,width:180,height:110,radius:30},material:{variant:'clear'}});
    await new Promise<void>(resolve=>{const stop=t.renderer.subscribe(()=>{stop();resolve();});});
    c.fillStyle='white';c.fillRect(0,0,32,32);rear.content(ink);return await front.contrastReady();
  });expect(state?.source).toBe('composited');expect(state?.foreground).toBe('dark');expect(state?.ratio).toBeGreaterThan(15);
});
