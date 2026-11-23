import {test,expect} from '@playwright/test';

test('a real grab follows the pointer and releases outside the lens',async({page})=>{
  await page.goto('/');await page.locator('#lens').scrollIntoViewIfNeeded();
  const lens=page.locator('#lens'),b=(await lens.boundingBox())!;
  const before=await page.evaluate(()=>(window as any).glassLab.lens.rect);
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2+105,b.y+b.height/2+58,{steps:8});
  await expect.poll(()=>page.evaluate(()=>(window as any).glassLab.lens.rect.x)).toBeGreaterThan(before.x+95);
  await page.mouse.up();await expect.poll(()=>page.evaluate(()=>(window as any).glassLab.lens.state.pressed)).toBe(0);
  const after=await page.evaluate(()=>(window as any).glassLab.lens.rect);
  expect(after.x-before.x).toBeCloseTo(105,0);expect(after.y-before.y).toBeCloseTo(58,0);
  expect(await page.evaluate(()=>getSelection()?.toString())).toBe('');
});

test('forwarded input survives rejected pointer capture and uses the release coordinates',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const path='/src/index.ts',{bindDrag}=await import(path),t=(window as any).testGlass;
    const button=document.querySelector('button')!;button.setPointerCapture=()=>{throw new DOMException('Host input cannot capture','NotFoundError');};
    const binding=bindDrag(t.renderer,button,{surface:t.surface});const before=t.surface.rect;
    button.dispatchEvent(new PointerEvent('pointerdown',{button:0,isPrimary:true,pointerId:17,clientX:100,clientY:90,bubbles:true}));
    window.dispatchEvent(new PointerEvent('pointermove',{pointerId:17,clientX:125,clientY:105}));
    window.dispatchEvent(new PointerEvent('pointerup',{pointerId:17,clientX:140,clientY:120}));
    await t.surface.settled();const after=t.surface.rect,pressed=t.surface.state.pressed;binding.dispose();return{before,after,pressed};
  });
  expect(result.after.x-result.before.x).toBe(40);expect(result.after.y-result.before.y).toBe(30);expect(result.pressed).toBe(0);
});

test('fine checkerboard scatters into a smooth field instead of an aliased lattice',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const t=(window as any).testGlass,c=t.source.getContext('2d');
    for(let y=0;y<240;y++)for(let x=0;x<320;x++){c.fillStyle=(x+y)%2?'#fff':'#000';c.fillRect(x,y,1,1);}
    t.renderer.updateBackdrop();t.surface.material({variant:'clear',appearance:'light',frost:1,refraction:0,dispersion:0,reflection:0,highlight:0,shadow:0,saturation:1},false);
    const pixels=await t.capture(),values=[];for(let y=95;y<145;y++)for(let x=110;x<210;x++)values.push(pixels[(y*320+x)*4]);
    return{mean:values.reduce((a,b)=>a+b,0)/values.length,range:Math.max(...values)-Math.min(...values)};
  });
  expect(result.mean).toBeGreaterThan(120);expect(result.mean).toBeLessThan(136);expect(result.range).toBeLessThan(4);
});

test('a thin white line scatters into one smooth peak without repeated stripes',async({page})=>{
  await page.goto('/tests/harness.html');
  const values:number[]=await page.evaluate(async()=>{
    const t=(window as any).testGlass,c=t.source.getContext('2d');c.fillStyle='black';c.fillRect(0,0,320,240);c.fillStyle='white';c.fillRect(160,0,2,240);
    t.renderer.updateBackdrop();t.surface.material({variant:'clear',appearance:'light',frost:1,refraction:0,dispersion:0,reflection:0,highlight:0,shadow:0,saturation:1},false);
    const p=await t.capture();return Array.from({length:51},(_,i)=>p[(120*320+135+i)*4]);
  });
  const peak=values.indexOf(Math.max(...values));expect(peak).toBeGreaterThan(22);expect(peak).toBeLessThan(29);
  for(let i=1;i<peak;i++)expect(values[i]).toBeGreaterThanOrEqual(values[i-1]-1);
  for(let i=peak+1;i<values.length;i++)expect(values[i]).toBeLessThanOrEqual(values[i-1]+1);
});

test('image capture crops to the viewport and keeps the crop correct after resizing',async({page})=>{
  await page.goto('/tests/harness.html');
  const result=await page.evaluate(async()=>{
    const path='/src/index.ts',{bindMediaBackdrop}=await import(path),t=(window as any).testGlass;
    const image=new Image();image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240"><path fill="red" d="M0 0h160v240H0z"/><path fill="lime" d="M160 0h320v240H160z"/><path fill="blue" d="M480 0h160v240H480z"/></svg>');await image.decode();
    const binding=bindMediaBackdrop(t.renderer,image,{fit:'cover',maxPixelRatio:1});
    const read=(x:number)=>Array.from(binding.canvas.getContext('2d')!.getImageData(x,100,1,1).data);
    const first=[read(5),read(315)];t.renderer.resize(640,240);binding.refresh();const resized=[read(5),read(635)];binding.dispose();return{first,resized};
  });
  expect(result.first).toEqual([[0,255,0,255],[0,255,0,255]]);expect(result.resized).toEqual([[255,0,0,255],[0,0,255,255]]);
});

test('the playground accepts a local image and releases it when returning to a built-in scene',async({page})=>{
  await page.goto('/');
  await page.locator('#media-file').setInputFiles({name:'crop-check.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240"><rect width="640" height="240" fill="#22aa66"/></svg>')});
  await expect(page.locator('#scene-label span')).toHaveText('crop-check.svg');
  await expect(page.locator('.stage-error')).toBeHidden();
  await page.getByRole('button',{name:'First light',exact:true}).click();await expect(page.locator('#scene-label span')).toHaveText('First light');
  await expect(page.locator('.stage-error')).toBeHidden();
});
