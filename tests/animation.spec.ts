import{test,expect}from'@playwright/test';

test('animation preserves intermediate geometry, retargets continuously, and settles',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass;t.surface.material({variant:'regular'},false);
    const samples:number[]=[];const stop=t.renderer.subscribe(()=>samples.push(t.surface.rect.x));
    const first=t.surface.animateTo({x:140},{spring:{frequency:3,damping:.8}});
    await new Promise(r=>setTimeout(r,180));const before=t.surface.rect.x;
    const second=t.surface.animateTo({x:100});const after=t.surface.rect.x;
    const cancelled=await first;const finished=await second;stop();
    return{samples,before,after,cancelled,finished,final:t.surface.rect.x};
  });
  expect(result.cancelled.finished).toBe(false);expect(result.finished.finished).toBe(true);expect(result.after).toBe(result.before);
  expect(result.samples.some(n=>n>81&&n<139)).toBe(true);expect(result.final).toBe(100);
});
test('material properties animate and DOM foreground follows the same optical pose',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass;const binding=t.bind();binding.surface.material({frost:.9},false);
    const samples:number[]=[];const stop=t.renderer.subscribe(()=>samples.push(binding.surface.state.material.frost));
    binding.surface.material({frost:.1,refraction:25});await binding.surface.settled();
    binding.surface.interact(true,90,35);await binding.surface.settled();
    const state=binding.surface.state,rect=document.querySelector('button')!.getBoundingClientRect();
    const poseError=Math.max(Math.abs(state.visualRect.width-rect.width),Math.abs(state.visualRect.x-rect.left));
    binding.surface.interact(false);await binding.surface.settled();stop();binding.dispose();
    return{samples,poseError,pressedWidth:state.visualRect.width};
  });
  expect(result.samples.some(n=>n>.12&&n<.88)).toBe(true);expect(result.samples.at(-1)).toBeCloseTo(.1,3);
  expect(result.pressedWidth).toBeGreaterThan(83);expect(result.poseError).toBeLessThan(1);
});
test('a hidden member does not erase visible members of its union and dismiss removes it',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass;
    const a=t.renderer.addSurface({id:'a',group:'group',spacing:30,rect:{x:20,y:120,width:60,height:60,radius:30}});
    const b=t.renderer.addSurface({id:'b',group:'group',spacing:30,rect:{x:95,y:120,width:60,height:60,radius:30}});
    await a.hide();await t.capture();const hidden=a.state.visibility,visible=b.state.visibility,groups=t.renderer.stats.groups;
    const result=await a.dismiss();let removed=false;try{a.state;}catch{removed=true;}b.remove();return{hidden,visible,groups,result,removed};
  });
  expect(result.hidden).toBe(0);expect(result.visible).toBe(1);expect(result.groups).toBeGreaterThan(0);expect(result.result.finished).toBe(true);expect(result.removed).toBe(true);
});
test('menu opens from its source, accepts interruption, and restores keyboard focus',async({page})=>{
  await page.goto('/tests/harness.html');
  await page.evaluate(async()=>{
    const module='/src/index.ts';const{glassPopover}=await import(module);const t=(window as any).testGlass;
    (window as any).popover=glassPopover(t.renderer,document.querySelector('button')!,[{label:'First action'},{label:'Second action'}],{id:'test-menu',parent:document.body});
  });
  await page.locator('#button').click();await expect(page.getByRole('menuitem',{name:'First action'})).toBeVisible();
  await expect(page.getByRole('menuitem',{name:'First action'})).toBeFocused({timeout:10000});
  await page.keyboard.press('ArrowDown');await expect(page.getByRole('menuitem',{name:'Second action'})).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.getByRole('menu')).toBeHidden({timeout:10000});await expect(page.locator('#button')).toBeFocused();
  const continuity=await page.evaluate(async()=>{const p=(window as any).popover;const first=p.open();await new Promise(r=>setTimeout(r,130));const before=p.surface.rect.width;const closing=p.close();const after=p.surface.rect.width;const result=await first;await closing;p.dispose();return{before,after,result};});
  expect(continuity.after).toBe(continuity.before);expect(continuity.result.finished).toBe(false);
});
test('every motion scene mounts, runs with reduced motion, and cleans up its surfaces',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await expect(page.locator('#motion-canvas')).toHaveAttribute('data-glass-context','ready');
  for(const scenario of ['touch','layers','shape','morph','fusion','materialize','controls','navigation','scroll','search','sheet']){
    await page.evaluate(s=>(window as any).motionStudio.select(s),scenario);
    await expect(page.locator(`[data-motion="${scenario}"]`)).toHaveAttribute('aria-pressed','true');
    expect(await page.evaluate(()=>(window as any).motionStudio.renderer.stats.surfaces)).toBeLessThan(8);
  }
  await page.evaluate(()=>(window as any).motionStudio.select('controls'));
  await page.getByRole('switch',{name:'Airplane mode'}).click();await expect(page.getByRole('switch',{name:'Airplane mode'})).toBeChecked();
  await page.evaluate(()=>(window as any).motionStudio.select('search'));
  await page.getByRole('button',{name:'Expand search'}).click();await expect(page.getByRole('searchbox',{name:'Search your library'})).toBeFocused();
  await page.getByRole('searchbox',{name:'Search your library'}).fill('glass');await page.keyboard.press('Escape');
  await expect(page.getByRole('searchbox',{name:'Search your library'})).toBeHidden();expect(errors).toEqual([]);
});
test('a vibrant foreground is refracted inside the lens and does not affect the exterior',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass,foreground=document.createElement('canvas');foreground.width=320;foreground.height=240;
    const ctx=foreground.getContext('2d')!;ctx.fillStyle='rgb(0,128,255)';ctx.fillRect(140,100,40,40);
    const before=await t.capture();t.renderer.setVibrancySource(foreground);
    const surface=t.renderer.addSurface({id:'vibrant',vibrancy:true,rect:{x:80,y:70,width:160,height:100,radius:35},material:{variant:'clear',frost:0,refraction:15,magnification:1.3,shadow:0,highlight:0}});
    const pixels=await t.capture();surface.remove();
    return{inside:pixels.slice((120*320+160)*4,(120*320+160)*4+3),before:before.slice((180*320+20)*4,(180*320+20)*4+3),outside:pixels.slice((180*320+20)*4,(180*320+20)*4+3)};
  });
  expect(result.inside[0]).toBeLessThan(5);expect(result.inside[1]).toBeCloseTo(128,0);expect(result.inside[2]).toBeGreaterThan(250);expect(result.outside).toEqual(result.before);
});
test('navigation lens lifts during a real pointer drag and snaps to its selected icon',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{(window as any).motionStudio.select('navigation');});
  const calls=page.getByRole('button',{name:'Calls',exact:true}),settings=page.getByRole('button',{name:'Settings',exact:true});
  const from=await calls.boundingBox(),to=await settings.boundingBox();expect(from).not.toBeNull();expect(to).not.toBeNull();
  const base=await page.evaluate(()=>(window as any).motionStudio.renderer.getState('studio-navigation').rect.height);
  await page.mouse.move(from!.x+from!.width/2,from!.y+from!.height/2);await page.mouse.down();await page.mouse.move(to!.x+to!.width/2,to!.y+to!.height/2,{steps:10});
  await expect.poll(()=>page.evaluate(()=>(window as any).motionStudio.renderer.getState('studio-navigation').rect.height)).toBeGreaterThan(base*1.4);
  await page.mouse.up();await expect(settings).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.evaluate(()=>(window as any).motionStudio.renderer.getState('studio-navigation').rect.height)).toBeCloseTo(base,0);
});
