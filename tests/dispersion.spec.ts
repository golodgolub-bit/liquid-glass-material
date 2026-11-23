import{test,expect}from'@playwright/test';
test('optical study switches wavelength models and supports real drag/reset',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/examples/dispersion/');
  await page.waitForFunction(()=>!!(window as any).glassDispersion);const first=page.getByRole('button',{name:'Drag Clear lens'}),r=await first.boundingBox();
  await page.mouse.move(r!.x+r!.width/2,r!.y+r!.height/2);await page.mouse.down();await page.mouse.move(r!.x+r!.width/2,r!.y+r!.height/2+45,{steps:8});await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>(window as any).glassDispersion.surfaces[0].rect.y)).toBeGreaterThan(120);
  await page.getByRole('button',{name:'Reset positions'}).click();await expect.poll(()=>page.evaluate(()=>(window as any).glassDispersion.surfaces[0].rect.y)).toBeCloseTo(91,0);
  await page.locator('#model').selectOption('cauchy');await expect.poll(()=>page.evaluate(()=>(window as any).glassDispersion.surfaces[1].state.baseMaterial.abbeNumber)).toBeCloseTo(58,0);
  await page.locator('#model').selectOption('none');await expect(page.locator('#amount')).toBeDisabled();
  await expect.poll(()=>page.evaluate(()=>(window as any).glassDispersion.surfaces[1].state.baseMaterial.abbeNumber)).toBe(0);
  expect(await page.evaluate(()=>(window as any).glassDispersion.renderer.canvas.getContext('webgl2').getError())).toBe(0);expect(errors).toEqual([]);
});
test('optical study keeps its controls within a narrow viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/examples/dispersion/');await page.waitForFunction(()=>!!(window as any).glassDispersion);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const lens=page.getByRole('button',{name:'Drag Regular lens'});await lens.focus();const y=await page.evaluate(()=>(window as any).glassDispersion.surfaces[1].rect.y);await page.keyboard.press('ArrowDown');
  await expect.poll(()=>page.evaluate(()=>(window as any).glassDispersion.surfaces[1].rect.y)).toBeGreaterThan(y+8);
});
