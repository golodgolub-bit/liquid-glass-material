import{test,expect}from'@playwright/test';
test('effect identities retain momentum and survive an interrupted exit',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;t.surface.remove();
    const effects=new lib.GlassEffectContainer(t.renderer,{namespace:'toolbar',spacing:24});
    const a={id:'a',rect:{x:20,y:50,width:80,height:50,radius:25}};
    await effects.reconcile([a],{animate:false});const handle=effects.get('a')!;
    void effects.reconcile([{...a,rect:{...a.rect,x:160}}]);await new Promise(r=>setTimeout(r,75));
    const before=handle.state.velocity.x;void effects.reconcile([{...a,rect:{...a.rect,x:80}}]);const after=handle.state.velocity.x;
    const exiting=effects.reconcile([]);await new Promise(r=>setTimeout(r,30));await effects.reconcile([a]);await exiting;
    const same=effects.get('a')===handle,size=effects.size,rect=handle.rect;effects.dispose();await t.capture();return{same,size,rect,before,after,surfaces:t.renderer.stats.surfaces};
  });expect(result.same).toBe(true);expect(result.size).toBe(1);expect(result.before).not.toBe(0);expect(result.after).toBe(result.before);expect(result.rect.x).toBeCloseTo(20,1);expect(result.surfaces).toBe(0);
});
test('namespaces isolate IDs, unions validate atomically, matched geometry differs from materialize',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;t.surface.remove();
    const a=new lib.GlassEffectContainer(t.renderer,{namespace:'a',spacing:30}),b=new lib.GlassEffectContainer(t.renderer,{namespace:'b'}),rect={x:20,y:50,width:70,height:40,radius:20};
    await a.reconcile([{id:'one',rect}],{animate:false});await b.reconcile([{id:'one',rect:{...rect,y:130}}],{animate:false});
    void a.reconcile([{id:'one',rect},{id:'two',rect:{...rect,x:110}}]);const matched=a.get('two')!.rect.x;
    void a.reconcile([{id:'one',rect},{id:'two',rect:{...rect,x:110}},{id:'three',transition:'materialize',rect:{...rect,x:210}}]);const materialize=a.get('three')!.rect.x;
    let rejected=false;try{await a.reconcile([{id:'one',rect},{id:'one',rect}]);}catch{rejected=true;}
    a.material({variant:'clear'},false);const frost=a.get('one')!.state.material.frost;
    const count=a.size,isolated=a.get('one')!.id!==b.get('one')!.id;
    a.dispose();b.dispose();return{matched,materialize,rejected,count,isolated,frost};
  });expect(result.matched).toBe(20);expect(result.materialize).toBe(210);expect(result.rejected).toBe(true);expect(result.count).toBe(3);expect(result.isolated).toBe(true);expect(result.frost).toBe(.08);
});
test('spectral indices and Beer-Lambert absorption reach real GPU pixels',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;
    t.surface.material({variant:'clear',ior:1.5168,outsideIor:1,abbeNumber:64.17},false);
    t.renderer.setShader(lib.createGlassShader({shade:'return vec3(spectralIndex(656.2725),spectralIndex(587.5618),spectralIndex(486.1327))/2.0;'}));
    let pixels=await t.capture(),i=(120*320+160)*4;const indices=pixels.slice(i,i+3),expected=lib.spectralIndices(1.5168,64.17).map(n=>Math.round(n/2*255));
    const source=document.createElement('canvas');source.width=320;source.height=240;const c=source.getContext('2d')!;c.fillStyle='white';c.fillRect(0,0,320,240);t.renderer.setBackdrop(source);t.renderer.setShader(null);
    t.surface.material({variant:'clear',ior:1,outsideIor:1,abbeNumber:0,frost:0,dispersion:0,thickness:20,highlight:0,shadow:0,reflection:0,saturation:1,absorption:lib.absorptionFromTransmittance([.5,.75,1],20)},false);
    pixels=await t.capture();return{indices,expected,absorbed:pixels.slice(i,i+3)};
  });result.indices.forEach((n:number,i:number)=>expect(Math.abs(n-result.expected[i])).toBeLessThanOrEqual(1));result.absorbed.forEach((n:number,i:number)=>expect(Math.abs(n-[128,191,255][i])).toBeLessThanOrEqual(1));
});
test('identity preserves local foreground ink without applying a material',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass,ink=document.createElement('canvas');ink.width=ink.height=20;const c=ink.getContext('2d')!;c.fillStyle='#0000ff';c.fillRect(0,0,20,20);
    t.surface.material({variant:'identity'},false);t.surface.content(ink);const p=await t.capture(),i=(120*320+160)*4;return p.slice(i,i+3);
  });expect(result).toEqual([0,0,255]);
});
test('Abbe interpolation grows dispersion from zero instead of crossing a singular index',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass;t.surface.material({abbeNumber:0},false);const samples:number[]=[];const stop=t.renderer.subscribe(()=>samples.push(t.surface.state.material.abbeNumber));
    await t.surface.animateMaterial({abbeNumber:58});stop();const enabled=samples.filter(n=>n>0);return{first:enabled[0],last:enabled.at(-1),valid:enabled.every(n=>n>=5&&Number.isFinite(n))};
  });expect(result.valid).toBe(true);expect(result.first).toBeGreaterThan(58);expect(result.last).toBeCloseTo(58,0);
});
