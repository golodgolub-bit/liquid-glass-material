import{test,expect}from'@playwright/test';
test('custom shader uniforms change real pixels, reject bad programs and reset without changing the backdrop',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;
    t.surface.material({variant:'clear',shadow:0},false);
    t.renderer.setShader(lib.createGlassShader({uniforms:{uGlass_color:{type:'vec3',value:[1,0,0]}},shade:'return uGlass_color;'}));
    const pixel=(p:number[])=>p.slice((120*320+160)*4,(120*320+160)*4+3),red=pixel(await t.capture());t.renderer.setShaderUniform('uGlass_color',[0,0,1]);const blue=pixel(await t.capture());
    let rejected=false;try{t.renderer.setShader(lib.createGlassShader({shade:'invalid GLSL here'}));}catch{rejected=true;}const after=pixel(await t.capture());
    let invalidValue=false;try{t.renderer.setShaderUniform('uGlass_color',[1,2]);}catch{invalidValue=true;}
    t.renderer.setShader(null);const restored=pixel(await t.capture());return{red,blue,after,rejected,invalidValue,restored,uploads:t.renderer.stats.uploads};
  });expect(result.red).toEqual([255,0,0]);expect(result.blue).toEqual([0,0,255]);expect(result.after).toEqual(result.blue);expect(result.rejected&&result.invalidValue).toBe(true);expect(result.restored).not.toEqual(result.blue);expect(result.uploads).toBe(1);
});
test('CPU screen-space optics predicts actual GPU normal and ray displacement',async({page})=>{
  await page.goto('/tests/harness.html');const pairs=await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;t.surface.material({variant:'clear'},false);
    t.renderer.setShader(lib.createGlassShader({uniforms:{uGlass_depth:{type:'float',value:0}},shade:'GlassOpticalSample ray=defaultGlassOptics(GlassOpticalInput(uGlass_depth,12.0,18.0,17.0,1.48,vec2(1,0),1.0));return vec3(ray.normal.x*.5+.5,ray.normal.z,ray.displacement.x/20.0+.5);'}));
    const pairs=[];for(const depth of[0,1,3,6,12,20]){t.renderer.setShaderUniform('uGlass_depth',depth);const data=await t.capture(),i=(120*320+160)*4,probe=lib.sampleGlassOptics({depth,width:12,thickness:18,refraction:17,ior:1.48,gradient:[1,0]});pairs.push({actual:data.slice(i,i+3),expected:[probe.normal[0]*.5+.5,probe.normal[2],probe.displacement[0]/20+.5].map(n=>Math.round(n*255))});}return pairs;
  });for(const pair of pairs)pair.actual.forEach((n:number,i:number)=>expect(Math.abs(n-pair.expected[i])).toBeLessThanOrEqual(1));
});
test('the two-interface slab tracer agrees between CPU and GPU',async({page})=>{
  await page.goto('/tests/harness.html');const pairs=await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;t.surface.material({variant:'clear'},false);
    t.renderer.setShader(lib.createGlassShader({declarations:lib.slabOpticsGLSL,uniforms:{uGlass_tilt:{type:'float',value:0},uGlass_exit:{type:'float',value:0}},shade:'vec3 n=normalize(vec3(uGlass_tilt,0,1));SlabRay ray=traceSlab(vec3(0,0,-1),n,vec3(uGlass_exit,0,1),1.48,1.0,10.0,4.0);return vec3(ray.offset.x/40.0+.5,ray.transmission,ray.tir);'}));
    const pairs=[];for(const[tilt,exit]of[[0,0],[.3,0],[1,0],[2,0],[.3,.2],[0,1]]){t.renderer.setShaderUniform('uGlass_tilt',tilt);t.renderer.setShaderUniform('uGlass_exit',exit);const pixels=await t.capture(),i=(120*320+160)*4,cpu=lib.traceSlabRay({entryNormal:[tilt,0,1],exitNormal:[exit,0,1],thickness:10,backdropDistance:4});pairs.push({actual:pixels.slice(i,i+3),expected:[(cpu.offset?.[0]??0)/40+.5,cpu.transmittance[0],+cpu.totalInternalReflection].map(n=>Math.round(Math.max(0,Math.min(1,n))*255))});}return pairs;
  });for(const pair of pairs)pair.actual.forEach((n:number,i:number)=>expect(Math.abs(n-pair.expected[i])).toBeLessThanOrEqual(1));
});
test('deformation drives rendering and hit tests, velocity is accessible and Reduced Motion bypasses custom deformation',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass;t.surface.material({variant:'clear'},false);t.surface.configurePhysics({geometry:{frequency:2,damping:1},pressScale:[0,0],attraction:[0,0]});
    const before=t.surface.state;t.surface.deform(({visualRect}:any)=>({...visualRect,x:visualRect.x+50}));const moved=t.surface.state,hit=t.surface.contains(260,120),miss=t.surface.contains(90,120);
    t.surface.kick({x:800});const velocity=t.surface.state.velocity.x;await new Promise(r=>setTimeout(r,80));const shifted=t.surface.rect.x;
    t.renderer.setAccessibility({reducedMotion:true});await new Promise(r=>setTimeout(r,80));const reduced=t.surface.state;return{before:before.visualRect.x,moved:moved.visualRect.x,hit,miss,velocity,shifted,reduced:reduced.visualRect.x,base:reduced.rect.x};
  });expect(result.moved-result.before).toBe(50);expect(result.hit).toBe(true);expect(result.miss).toBe(false);expect(result.velocity).toBe(800);expect(result.shifted).toBeGreaterThan(80);expect(result.reduced).toBe(result.base);
});
test('custom shader and latest uniform values survive a lost GPU context',async({page})=>{
  await page.goto('/tests/harness.html');await page.evaluate(async()=>{const lib=await import('../src/index'),t=(window as any).testGlass;t.surface.material({variant:'clear'},false);t.renderer.setShader(lib.createGlassShader({uniforms:{uGlass_color:{type:'vec3',value:[1,0,0]}},shade:'return uGlass_color;'}));t.renderer.setShaderUniform('uGlass_color',[.1,.8,.3]);await t.capture();const ext=document.querySelector('canvas')!.getContext('webgl2')!.getExtension('WEBGL_lose_context');(window as any).restoreShader=ext;ext!.loseContext();});
  await expect(page.locator('canvas')).toHaveAttribute('data-glass-context','lost');await page.evaluate(()=>(window as any).restoreShader.restoreContext());await expect(page.locator('canvas')).toHaveAttribute('data-glass-context','ready');
  const color=await page.evaluate(async()=>{const t=(window as any).testGlass,p=await t.capture(),i=(120*320+160)*4;return p.slice(i,i+3);});color.forEach((n:number,i:number)=>expect(Math.abs(n-[26,204,77][i])).toBeLessThanOrEqual(1));
});

test('custom scattering passes update cached blur when a managed uniform changes',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const lib=await import('../src/index'),t=(window as any).testGlass;t.surface.material({variant:'clear',frost:1,reflection:0,highlight:0,shadow:0,saturation:1},false);
    t.renderer.setShader(lib.createGlassShader({uniforms:{uGlass_color:{type:'vec3',value:[1,0,0]}},blurFragment:'#version 300 es\nprecision highp float;uniform vec3 uGlass_color;out vec4 color;void main(){color=vec4(uGlass_color,1);}'}));
    const pixel=(p:number[])=>p.slice((120*320+160)*4,(120*320+160)*4+3),red=pixel(await t.capture()),before=t.renderer.stats.blurPasses;t.renderer.setShaderUniform('uGlass_color',[0,0,1]);const blue=pixel(await t.capture());return{red,blue,before,after:t.renderer.stats.blurPasses,uploads:t.renderer.stats.uploads};
  });expect(result.red).toEqual([255,0,0]);expect(result.blue).toEqual([0,0,255]);expect(result.after-result.before).toBe(4);expect(result.uploads).toBe(1);
});

test('underdamped programmable material stays inside optical bounds and a hidden surface cannot be hit',async({page})=>{
  await page.goto('/tests/harness.html');const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass;t.surface.material({variant:'clear',thickness:90,ior:2.4},false);t.surface.configurePhysics({material:{frequency:3,damping:.1}});t.surface.material({thickness:0,ior:1});
    const samples:{thickness:number;ior:number}[]=[];const stop=t.renderer.subscribe(()=>{const m=t.surface.state.material;samples.push({thickness:m.thickness,ior:m.ior});});await new Promise(r=>setTimeout(r,350));stop();
    t.surface.material({thickness:0,ior:1},false);await t.surface.hide({immediate:true});return{samples,hit:t.surface.contains(160,120),frames:t.renderer.stats.frames};
  });expect(result.samples.length).toBeGreaterThan(5);for(const s of result.samples){expect(s.thickness).toBeGreaterThanOrEqual(0);expect(s.ior).toBeGreaterThanOrEqual(1);expect(s.ior).toBeLessThanOrEqual(2.5);}expect(result.hit).toBe(false);
});

test('developer workbench runs the slab model and keeps its live shader when edited GLSL fails',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/examples/workbench/');await expect(page.locator('#status')).toHaveAttribute('data-error','false');
  await page.locator('#model').selectOption('slab');await expect(page.locator('#mode-note')).toContainText('Две границы');await page.locator('#gain').fill('1.5');expect(await page.evaluate(()=>(window as any).glassWorkbench.renderer.getShaderUniform('uGlass_gain'))).toBe(1.5);
  await page.locator('summary').click();await page.locator('#code').fill('not valid GLSL');await page.getByRole('button',{name:'Применить GLSL',exact:true}).click();await expect(page.locator('#status')).toHaveAttribute('data-error','true');await expect(page.locator('canvas')).toHaveAttribute('data-glass-context','ready');
  await page.getByRole('button',{name:'Восстановить стандартный шейдер',exact:true}).click();await expect(page.locator('#status')).toHaveAttribute('data-error','false');await page.locator('#mass').fill('2');expect(await page.evaluate(()=>(window as any).glassWorkbench.lens.physics.geometry.frequency)).toBeLessThan(3);expect(errors).toEqual([]);
});
