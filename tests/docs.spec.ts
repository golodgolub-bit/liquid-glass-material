import{test,expect}from'@playwright/test';
test('documentation pages link to the complete API and a runnable text/reflection example',async({page})=>{
  await page.goto('/docs/');await expect(page.getByRole('heading',{name:'Liquid Glass Material — Developer Guide',exact:true})).toBeVisible();
  for(const name of['api','programmability','ray-optics','apple-audit','text-under-glass','animations','reflections','integration','architecture','troubleshooting']){
    const response=await page.request.get(`/docs/${name}.html`);expect(response.ok()).toBe(true);expect(await response.text()).not.toContain('href="undefined"');
  }
  await page.goto('/docs/api.html');await expect(page.getByRole('heading',{name:'GlassMaterial',exact:true})).toBeVisible();
  const malformed=await page.locator('table').evaluateAll(tables=>tables.flatMap(t=>{const width=t.querySelectorAll('thead th').length;return[...t.querySelectorAll('tbody tr')].filter(row=>row.querySelectorAll('td').length!==width).map(row=>row.textContent);}));expect(malformed).toEqual([]);
  await page.locator('#filter').fill('light and reflections');await expect(page.locator('#pages a:visible')).toHaveCount(1);await page.locator('#pages a:visible').click();await expect(page.getByRole('heading',{name:'Light and reflections',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Live example',exact:true}).click();await expect(page.getByRole('heading',{name:'One material. Your behavior.',exact:true})).toBeVisible();
});
test('documentation remains readable on a narrow viewport',async({page})=>{
  await page.setViewportSize({width:360,height:800});await page.goto('/docs/text-under-glass.html');await expect(page.getByRole('heading',{name:'Text and icons under glass',exact:true})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);expect(overflow).toBeLessThanOrEqual(1);
});
