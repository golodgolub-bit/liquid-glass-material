import{test,expect}from'@playwright/test';

test('a front lens refracts the real content of a rear material layer',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass,ink=document.createElement('canvas');ink.width=180;ink.height=110;
    const c=ink.getContext('2d')!;c.fillStyle='#00ff00';c.fillRect(60,0,30,110);
    const material={variant:'clear',frost:0,refraction:0,magnification:1,highlight:0,shadow:0,reflection:0,ior:1,dispersion:0,saturation:1};
    t.renderer.addSurface({id:'rear',rect:{x:60,y:55,width:180,height:110,radius:15},content:ink,material});
    const bare=await t.capture();
    t.renderer.addSurface({id:'front',layer:1,rect:{x:100,y:60,width:120,height:100,radius:20},material:{...material,magnification:1.5}});
    const refracted=await t.capture(),p=(data:number[],x:number,y:number)=>data.slice((y*320+x)*4,(y*320+x)*4+3);
    return{before:p(bare,118,110),after:p(refracted,118,110),outside:p(bare,20,200),outsideAfter:p(refracted,20,200),error:document.querySelector('canvas')!.getContext('webgl2')!.getError()};
  });
  expect(result.before).not.toEqual(result.after);expect(result.after[0]).toBeLessThan(5);expect(result.after[1]).toBeGreaterThan(245);expect(result.after[2]).toBeLessThan(5);expect(result.outsideAfter).toEqual(result.outside);expect(result.error).toBe(0);
});

test('an SVG ring has an optically empty hole and uses its contour for hit testing',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const module='/src/index.ts',{createGlassShape}=await import(module),t=(window as any).testGlass;
    const baseline=await t.capture(),ring=createGlassShape({path:'M 50 5 A 45 45 0 1 1 49.99 5 Z M 50 30 A 20 20 0 1 1 49.99 30 Z',fillRule:'evenodd'});
    const surface=t.renderer.addSurface({id:'ring',shape:ring,rect:{x:80,y:50,width:160,height:160,radius:0},material:{variant:'clear',frost:0,tint:[1,0,0],tintOpacity:1,shadow:0,highlight:0}}),pixels=await t.capture();
    const p=(data:number[],x:number,y:number)=>data.slice((y*320+x)*4,(y*320+x)*4+3);
    return{hole:p(pixels,160,130),baseline:p(baseline,160,130),ink:p(pixels,104,130),inside:surface.contains(104,130),empty:surface.contains(160,130),outside:surface.contains(81,51),error:document.querySelector('canvas')!.getContext('webgl2')!.getError()};
  });
  expect(result.hole).toEqual(result.baseline);expect(result.ink[0]).toBeGreaterThan(result.ink[1]+80);expect(result.inside).toBe(true);expect(result.empty).toBe(false);expect(result.outside).toBe(false);expect(result.error).toBe(0);
});

test('shape morph can be interrupted, preserves its boundary, and sleeps after settling',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const module='/src/index.ts',{createGlassShape}=await import(module),t=(window as any).testGlass;
    t.surface.material({variant:'clear'},false);const shape=createGlassShape({path:'M 50 4 C 65 30 95 44 94 65 C 94 91 74 96 50 96 C 25 96 6 88 6 64 C 7 44 36 28 50 4 Z'});
    const first=t.surface.shape(shape,{spring:{frequency:2,damping:1}});await new Promise(r=>setTimeout(r,140));
    const before=await t.capture();const second=t.surface.shape(null,{spring:{frequency:4,damping:1}});const after=await t.capture();const cancelled=await first;const finished=await second;
    const delta=before.reduce((sum:number,n:number,i:number)=>sum+Math.abs(n-after[i]),0)/before.length;
    const frames=t.renderer.stats.frames;await new Promise(r=>setTimeout(r,200));return{cancelled,finished,delta,idle:t.renderer.stats.frames-frames};
  });
  expect(result.cancelled.finished).toBe(false);expect(result.finished.finished).toBe(true);expect(result.delta).toBeLessThan(6);expect(result.idle).toBe(0);
});

test('studio button remains grabbed while moving, leaving the hit box, and releasing',async({page})=>{
  await page.goto('/');await page.locator('[data-motion="touch"]').click();
  const button=page.getByRole('button',{name:'Hold & move',exact:true});await button.scrollIntoViewIfNeeded();const from=await button.boundingBox();expect(from).not.toBeNull();
  await page.mouse.move(from!.x+from!.width/2,from!.y+from!.height/2);await page.mouse.down();await page.waitForTimeout(220);await page.mouse.move(from!.x+from!.width/2+110,from!.y+from!.height/2-55,{steps:12});
  await expect.poll(()=>button.boundingBox().then(b=>b!.x-from!.x)).toBeGreaterThan(100);
  expect(await page.evaluate(()=>(window as any).motionStudio.renderer.getState('studio-touch').pressed)).toBeGreaterThan(.8);
  await page.mouse.up();await expect.poll(()=>page.evaluate(()=>(window as any).motionStudio.renderer.getState('studio-touch').pressed)).toBeLessThan(.01);
  expect(await page.evaluate(()=>(window as any).motionStudio.playing)).toBe(false);
});

test('navigation uses real rear glass; hover highlight moves between menu items',async({page})=>{
  await page.goto('/');await page.locator('[data-motion="navigation"]').click();
  expect(await page.evaluate(()=>(window as any).motionStudio.renderer.getState('studio-navigation-rail').rect.width)).toBeGreaterThan(250);
  await page.locator('[data-motion="morph"]').click();await page.getByRole('button',{name:'Open studio menu'}).click();
  const first=page.getByRole('menuitem',{name:'Add to collection'}),last=page.getByRole('menuitem',{name:'Edit appearance'});await expect(first).toBeFocused({timeout:10000});await last.hover();
  await expect(last).toHaveAttribute('data-lg-highlighted','');await expect(first).not.toHaveAttribute('data-lg-highlighted','');
  await page.keyboard.press('Escape');await expect(page.getByRole('menu')).toBeHidden({timeout:10000});
});

test('stacked contours and local content survive context restoration',async({page})=>{
  await page.goto('/tests/harness.html');
  await page.evaluate(async()=>{
    const module='/src/index.ts',{createGlassShape}=await import(module),t=(window as any).testGlass;
    const ink=document.createElement('canvas');ink.width=ink.height=100;const c=ink.getContext('2d')!;c.fillStyle='#08e';c.fillRect(10,20,80,40);
    const rear=t.renderer.addSurface({id:'rear-content',rect:{x:40,y:40,width:180,height:140,radius:20},content:ink});
    const front=t.renderer.addSurface({id:'front-path',layer:1,rect:{x:100,y:60,width:120,height:140,radius:20},shape:createGlassShape({path:'M 50 5 L 95 50 L 50 95 L 5 50 Z'}),material:{variant:'clear',frost:.05}});
    (window as any).restoreSurfaces=[rear,front];await Promise.all([rear.contrastReady(),front.contrastReady()]);await Promise.all([rear.settled(),front.settled()]);
    (window as any).previous=await t.capture();(window as any).restoreExtension=document.querySelector('canvas')!.getContext('webgl2')!.getExtension('WEBGL_lose_context');(window as any).restoreExtension.loseContext();
  });
  await expect(page.locator('canvas')).toHaveAttribute('data-glass-context','lost');await page.evaluate(()=>(window as any).restoreExtension.restoreContext());await expect(page.locator('canvas')).toHaveAttribute('data-glass-context','ready');
  const delta=await page.evaluate(async()=>{await Promise.all((window as any).restoreSurfaces.map((s:any)=>s.contrastReady()));await Promise.all((window as any).restoreSurfaces.map((s:any)=>s.settled()));const t=(window as any).testGlass,after=await t.capture(),before=(window as any).previous;return after.reduce((sum:number,n:number,i:number)=>sum+Math.abs(n-before[i]),0)/after.length;});expect(delta).toBeLessThan(.1);
});

test('an overlay renderer composites glass layers but leaves the exterior transparent',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const module='/src/index.ts',{GlassRenderer}=await import(module),t=(window as any).testGlass;t.renderer.dispose();
    const canvas=document.querySelector('canvas')!,renderer=new GlassRenderer(canvas,{maxPixelRatio:1,drawBackdrop:false});renderer.resize(320,240);renderer.setBackdrop(t.source);
    renderer.addSurface({id:'back',rect:{x:50,y:50,width:180,height:120,radius:15},material:{tint:[1,0,0],tintOpacity:.9}});
    renderer.addSurface({id:'front',layer:1,rect:{x:80,y:70,width:160,height:100,radius:15},material:{variant:'clear',frost:0,refraction:0,ior:1,reflection:0,highlight:0,shadow:0,saturation:1}});
    return await new Promise(resolve=>{const stop=renderer.subscribe(()=>{stop();const copy=document.createElement('canvas');copy.width=320;copy.height=240;const c=copy.getContext('2d')!;c.drawImage(canvas,0,0);const p=c.getImageData(0,0,320,240).data;resolve({outside:p[(220*320+20)*4+3],inside:[...p.slice((120*320+150)*4,(120*320+150)*4+4)],error:canvas.getContext('webgl2')!.getError()});renderer.dispose();});renderer.invalidate();});
  })as{outside:number;inside:number[];error:number};
  expect(result.outside).toBe(0);expect(result.inside[3]).toBe(255);expect(result.inside[0]).toBeGreaterThan(result.inside[1]+80);expect(result.error).toBe(0);
});
