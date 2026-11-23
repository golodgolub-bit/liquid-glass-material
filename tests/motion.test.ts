import { describe, expect, test } from 'vitest';
import { Spring } from '../src/spring';
import { createMaterial, materials } from '../src/material';
import { roundedRectDistance, smoothUnion, validateRect } from '../src/geometry';

describe('Motion survives refresh-rate and input changes',()=> {
  test.each([0.68,1,1.4])('same position at 30, 60 and 120 Hz, damping %f',damping=> {
    const end = [30,60,120].map(hz=> {
      const s = new Spring(0,3.8,damping); s.target = 250;
      for (let i=0;i<hz/2;i++) s.step(1/hz);
      return s.value;
    });
    expect(Math.max(...end)-Math.min(...end)).toBeLessThan(0.001);
  });
  test('retargeting preserves velocity and converges after a suspended frame',()=> {
    const s = new Spring(0); s.target = 100; s.step(0.04);
    const velocity = s.velocity; s.target = -40;
    expect(s.velocity).toBe(velocity);
    for (let i=0;i<10;i++) s.step(0.4);
    expect(s.value).toBe(-40); expect(s.velocity).toBe(0);
  });
  test('dropped frames do not explode',()=> {
    const s = new Spring(2); s.target = 1000;
    s.step(180); expect(Number.isFinite(s.value)).toBe(true);
    expect(Math.abs(s.value-1000)).toBeLessThan(0.1);
  });
});
describe('Material contract',()=> {
  test('caller mutation cannot change the material or preset',()=> {
    const tint: [number,number,number] = [.2,.4,.7], m = createMaterial({tint});
    tint[0] = 1; expect(m.tint[0]).toBe(.2);
    expect(Object.isFrozen(m)).toBe(true); expect(Object.isFrozen(m.tint)).toBe(true);
    expect(materials.clear.variant).toBe('clear');
  });
  test.each([{refraction:NaN},{frost:2},{thickness:-1},{tint:[0,2,0] as const}])('rejects invalid GPU inputs %j',input=>expect(()=>createMaterial(input)).toThrow());
});
describe('Union topology',()=> {
  test('nearby circles create a continuous bridge without retaining inner boundaries',()=> {
    const a = {x:0,y:0,width:100,height:100,radius:50}, b = {...a,x:108};
    const da = roundedRectDistance(104,50,a), db = roundedRectDistance(104,50,b);
    expect(da).toBe(4); expect(db).toBe(4);
    expect(smoothUnion(da,db,32)).toBeLessThan(0);
    expect(smoothUnion(da,db,0)).toBe(4);
    expect(roundedRectDistance(50,50,a)).toBe(-50);
  });
  test('invalid geometry is rejected before reaching the GPU',()=> {
    expect(()=>validateRect({x:0,y:0,width:0,height:100,radius:2})).toThrow();
    expect(()=>validateRect({x:Infinity,y:0,width:1,height:1,radius:2})).toThrow();
  });
});
