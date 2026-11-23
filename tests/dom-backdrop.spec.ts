import{expect,test}from'@playwright/test';
test('native HTML backdrop updates pixels and stops uploading at rest',async({page})=>{
  await page.goto('/examples/dom/');
  const supported=await page.evaluate(()=>Boolean((window as any).domGlass));
  test.skip(!supported,'This browser lacks native HTML-in-Canvas');
  await expect.poll(()=>page.evaluate(()=>(window as any).domGlass.renderer.stats.uploads)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Clicked 0 times'}).click();await expect(page.getByRole('button',{name:'Clicked 1 times'})).toBeVisible();
  const before=await page.evaluate(()=>(window as any).domGlass.binding.paints);
  await page.evaluate(()=>{(window as any).domGlass.content.style.background='#3377cc';});
  await expect.poll(()=>page.evaluate(()=>(window as any).domGlass.binding.paints)).toBeGreaterThan(before);
  const pixel=await page.evaluate(()=>Array.from((window as any).domGlass.source.getContext('2d').getImageData(5,5,1,1).data));
  expect(pixel[0]).toBeCloseTo(51,0);expect(pixel[1]).toBeCloseTo(119,0);expect(pixel[2]).toBeCloseTo(204,0);
  await page.waitForTimeout(1200);const idle=await page.evaluate(()=>(window as any).domGlass.renderer.stats.uploads);await page.waitForTimeout(250);
  expect(await page.evaluate(()=>(window as any).domGlass.renderer.stats.uploads)).toBe(idle);
  await page.evaluate(()=>(window as any).domGlass.dispose());
});
