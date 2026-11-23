import{it,expect}from'vitest';
import{createContrast,evaluateContrast,foregroundColors,protectionColors,contrastRatio}from'../src/contrast';
import{createMaterial}from'../src/material';
import{resolveMaterialForSize}from'../src/size-adaptation';
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
