import{it,expect}from'vitest';
import{createContrast,evaluateContrast,evaluateContrastBounds,foregroundColors,protectionColors,contrastRatio}from'../src/contrast';
import{createMaterial}from'../src/material';
import{resolveMaterialForSize,measureMaterialFootprint}from'../src/size-adaptation';
it('chooses readable ink and solves a bounded neutral protection',()=>{
  const policy=createContrast(),rgb=[[0,0,0],[1,1,1]]as const,result=evaluateContrast(rgb,policy);
  expect(result.foreground).toBe('dark');expect(result.protection).toBeGreaterThan(0);expect(result.meetsTarget).toBe(true);
  for(const sample of rgb){const protectedRGB=sample.map((v,i)=>v*(1-result.protection)+protectionColors[result.foreground][i]*result.protection)as unknown as readonly[number,number,number];expect(contrastRatio(foregroundColors[result.foreground],protectedRGB)).toBeGreaterThanOrEqual(4.5);}
  expect(evaluateContrast([[1,1,1]],{...policy,protection:0}).foreground).toBe('dark');expect(evaluateContrast([[0,0,0]],{...policy,protection:0}).foreground).toBe('light');
});
it('rejects invalid regions and keeps size response continuous and bounded',()=>{
  expect(()=>createContrast({region:{x:.8,width:.5}})).toThrow();expect(()=>createContrast({minimumRatio:22})).toThrow();
  const material=createMaterial(),a=resolveMaterialForSize(material,{width:200,height:100}),b=resolveMaterialForSize(material,{width:201,height:100});
  expect(b.thickness).toBeGreaterThan(a.thickness);expect(b.thickness-a.thickness).toBeLessThan(.1);expect(material.thickness).toBe(18);
  expect(resolveMaterialForSize(material,{width:1e6,height:1e6}).thickness).toBeLessThanOrEqual(100);
});
it('uses conservative RGB bounds and rejects reversed or nonfinite bounds',()=>{
  const bounds={minimum:[0,0,0],maximum:[1,1,1]}as const,policy=createContrast({protection:0});
  expect(evaluateContrastBounds(bounds,policy).meetsTarget).toBe(false);
  expect(evaluateContrastBounds(bounds).meetsTarget).toBe(true);
  expect(()=>evaluateContrastBounds({minimum:[.5,0,0],maximum:[.1,1,1]})).toThrow();
  expect(()=>evaluateContrastBounds({minimum:[0,0,0],maximum:[1,NaN,1]})).toThrow();
});
it('excludes union gaps, counts overlap once and accepts silhouette area overrides',()=>{
  const a={x:-80,y:-50,width:100,height:80},b={x:120,y:40,width:100,height:80},footprint=measureMaterialFootprint([a,b]);
  expect(footprint).toEqual({width:300,height:170,area:16000});
  const moved=measureMaterialFootprint([a,{...b,x:1000,y:500}]),material=createMaterial();
  expect(resolveMaterialForSize(material,footprint)).toEqual(resolveMaterialForSize(material,moved));
  expect(measureMaterialFootprint([a,{...a,x:-30}]).area).toBe(12000);
  expect(measureMaterialFootprint([a,a]).area).toBe(8000);
  expect(resolveMaterialForSize(material,{width:100,height:100,area:2000}).thickness).toBe(18);
  expect(()=>resolveMaterialForSize(material,{width:10,height:10,area:101})).toThrow();expect(()=>measureMaterialFootprint([])).toThrow();
});
