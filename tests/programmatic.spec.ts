import{test,expect}from'@playwright/test';

test('a permanent program pauses, resumes without a time jump, cancels and leaves no idle loop',async({page})=>{
  await page.goto('/tests/harness.html');
  const r=await page.evaluate(async()=>{
    const t=(window as any).testGlass,samples:{time:number;delta:number}[]=[];
    const a=t.renderer.addAnimation((f:{time:number;delta:number})=>{samples.push({time:f.time,delta:f.delta});t.renderer.setReflectionRotation(f.time);});
    await new Promise(r=>setTimeout(r,180));a.pause();await new Promise(r=>setTimeout(r,100));const count=samples.length,paused=a.elapsed,frames=t.renderer.stats.frames;await new Promise(r=>setTimeout(r,150));const idle=t.renderer.stats.frames-frames;
    a.resume();await new Promise(r=>setTimeout(r,120));const resumed=samples[count],after=a.elapsed;a.cancel();a.resume();await new Promise(r=>setTimeout(r,80));const end=t.renderer.stats.frames;await new Promise(r=>setTimeout(r,120));return{count,paused,after,resumed,idle,endIdle:t.renderer.stats.frames-end,running:a.running,uploads:t.renderer.stats.uploads};
  });
  expect(r.count).toBeGreaterThan(3);expect(r.idle).toBe(0);expect(r.endIdle).toBe(0);expect(r.resumed.delta).toBe(0);expect(r.resumed.time).toBeCloseTo(r.paused,5);expect(r.after-r.paused).toBeLessThan(.22);expect(r.running).toBe(false);expect(r.uploads).toBe(1);
});

test('Reduced Motion suspends decorative programs while finite essential callbacks can run',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/tests/harness.html');
  const r=await page.evaluate(async()=>{
    const t=(window as any).testGlass;let normal=0,essential=0;const a=t.renderer.addAnimation(()=>{normal++;});t.renderer.addAnimation(()=>{essential++;if(essential===3)return false;},{essential:true});
    await new Promise(r=>setTimeout(r,180));const stoppedNormal=normal,frames=t.renderer.stats.frames;await new Promise(r=>setTimeout(r,100));const idle=t.renderer.stats.frames-frames;t.renderer.setAccessibility({reducedMotion:false});await new Promise(r=>setTimeout(r,100));a.cancel();return{stoppedNormal,essential,idle,normal};
  });
  expect(r.stoppedNormal).toBe(0);expect(r.essential).toBe(3);expect(r.idle).toBe(0);expect(r.normal).toBeGreaterThan(1);
});

test('an independent reflection map rotates without uploads and restores after context loss',async({page})=>{
  await page.goto('/tests/harness.html');
  const first=await page.evaluate(async()=>{
    const t=(window as any).testGlass,map=document.createElement('canvas');map.width=16;map.height=8;const c=map.getContext('2d')!;c.fillStyle='red';c.fillRect(0,0,10,8);c.fillStyle='blue';c.fillRect(10,0,6,8);
    t.surface.material({variant:'clear',frost:0,edgeWidth:4,ior:2.5,reflection:1,highlight:0,shadow:0,saturation:1,refraction:0},false);t.renderer.setReflectionSource(map);const a=await t.capture(),uploads=t.renderer.stats.reflectionUploads;t.renderer.setReflectionRotation(Math.PI/2);const b=await t.capture();(window as any).reflectionBefore=b;
    const pixel=(p:number[])=>p.slice((120*320+160)*4,(120*320+160)*4+3);return{a:pixel(a),b:pixel(b),uploads,after:t.renderer.stats.reflectionUploads};
  });
  expect(first.a[0]-first.b[0]).toBeGreaterThan(25);expect(first.b[2]-first.a[2]).toBeGreaterThan(25);expect(first.after).toBe(first.uploads);
  await page.evaluate(()=>{const ext=document.querySelector('canvas')!.getContext('webgl2')!.getExtension('WEBGL_lose_context');(window as any).reflectionRestore=ext;ext!.loseContext();});await expect(page.locator('canvas')).toHaveAttribute('data-glass-context','lost');await page.evaluate(()=>(window as any).reflectionRestore.restoreContext());await expect(page.locator('canvas')).toHaveAttribute('data-glass-context','ready');
  const delta=await page.evaluate(async()=>{const after=await(window as any).testGlass.capture(),before=(window as any).reflectionBefore;return after.reduce((s:number,n:number,i:number)=>s+Math.abs(n-before[i]),0)/after.length;});expect(delta).toBeLessThan(.1);
});

test('thin glass keeps a flat interior instead of a bright medial ridge',async({page})=>{
  await page.goto('/tests/harness.html');
  const r=await page.evaluate(async()=>{
    const t=(window as any).testGlass,c=t.source.getContext('2d')!;c.fillStyle='rgb(120,130,140)';c.fillRect(0,0,320,240);t.renderer.updateBackdrop();t.surface.move({x:80,y:80,width:160,height:40,radius:20},false);t.surface.material({variant:'clear',frost:0,saturation:1,highlight:1,reflection:0,shadow:0,edgeWidth:4,thickness:40},false);const p=await t.capture();let max=0;for(let y=86;y<=114;y++)for(let x=110;x<=210;x++){const i=(y*320+x)*4;max=Math.max(max,Math.abs(p[i]-120),Math.abs(p[i+1]-130),Math.abs(p[i+2]-140));}return{max};
  });expect(r.max).toBeLessThanOrEqual(2);
});

test('the documented programmatic example runs real controls and respects pause',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/examples/programmatic/');await page.getByRole('button',{name:'Start motion'}).click();await expect(page.getByRole('button',{name:'Pause motion'})).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.evaluate(()=>(window as any).programmaticGlass.animation.elapsed)).toBeGreaterThan(.1);await page.getByRole('button',{name:'Pause motion'}).click();
  await page.locator('#edge').fill('2');expect(await page.evaluate(()=>(window as any).programmaticGlass.lens.state.material.edgeWidth)).toBe(2);expect(await page.locator('#bevel').inputValue()).toBe('0');await page.getByRole('button',{name:'Environment: off'}).click();await expect(page.getByRole('button',{name:'Environment: on'})).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});

test('unembossed glass still bends rays and a raised bevel remains independently programmable',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass,c=t.source.getContext('2d');c.fillStyle='rgb(120,130,140)';c.fillRect(0,0,320,240);t.renderer.updateBackdrop();
    t.surface.material({variant:'clear',frost:0,saturation:1,highlight:2,shadow:0,reflection:0},false);const flat=await t.capture();let uniform=0;
    for(let y=76;y<164;y++)for(let x=116;x<204;x++){const i=(y*320+x)*4;uniform=Math.max(uniform,Math.abs(flat[i]-120),Math.abs(flat[i+1]-130),Math.abs(flat[i+2]-140));}
    const defaultBevel=t.surface.state.material.bevel;
    for(let y=0;y<240;y++){c.fillStyle=y%12<6?'white':'black';c.fillRect(0,y,320,1);}t.renderer.updateBackdrop();t.surface.material({highlight:0,refraction:40},false);const bent=await t.capture();t.surface.material({refraction:0},false);const straight=await t.capture();let changed=0;
    for(let y=71;y<88;y++)for(let x=116;x<204;x++){const i=(y*320+x)*4;if(Math.abs(bent[i]-straight[i])>40)changed++;}
    t.surface.material({refraction:40,bevel:1,highlight:2},false);const raised=await t.capture();let bevelDifference=0;for(let i=0;i<raised.length;i+=4)bevelDifference+=Math.abs(raised[i]-bent[i]);
    return{uniform,defaultBevel,changed,bevelDifference};
  });
  expect(result.defaultBevel).toBe(0);expect(result.uniform).toBeLessThanOrEqual(2);expect(result.changed).toBeGreaterThan(100);expect(result.bevelDifference).toBeGreaterThan(500);
});
