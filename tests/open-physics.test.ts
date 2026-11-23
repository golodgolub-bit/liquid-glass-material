import{describe,test,expect}from'vitest';
import{refractRay,fresnelReflectance,traceSlabRay,sampleGlassOptics}from'../src/optics';
import{springFromPhysical,springToPhysical}from'../src/motion';
import{createPhysics}from'../src/physics';
import{Spring}from'../src/spring';
describe('Optics as a numerical model',()=>{
  test('Snell law, critical angle and Fresnel energy at a real interface',()=>{
    const theta=Math.PI/6,r=refractRay([Math.sin(theta),0,-Math.cos(theta)],[0,0,1],1/1.5)!;
    expect(r[0]*1.5).toBeCloseTo(Math.sin(theta),12);expect(Math.hypot(...r)).toBeCloseTo(1,12);
    expect(refractRay([Math.sin(Math.PI/3),0,-.5],[0,0,1],1.5)).toBeNull();
    expect(fresnelReflectance(1,1,1.5)).toBeCloseTo(.04,12);expect(fresnelReflectance(.5,1.5,1)).toBe(1);
  });
  test('parallel slab restores ray direction but shifts its footprint; absorption follows path length',()=>{
    const incident=[.5,0,-Math.sqrt(.75)]as const,r=traceSlabRay({incident,entryNormal:[0,0,1],thickness:10,ior:1.5,backdropDistance:20,absorption:[.1,.2,0]});
    r.outgoing!.forEach((v,i)=>expect(v).toBeCloseTo(incident[i],12));expect(r.offset![0]).toBeLessThan(-1);expect(r.transmittance[1]).toBeLessThan(r.transmittance[0]);expect(r.transmittance[0]/r.transmittance[2]).toBeCloseTo(Math.exp(-.1*r.pathLength),12);
    const identity=traceSlabRay({incident,entryNormal:[0,0,1],thickness:10,ior:1,backdropDistance:20});expect(identity.offset![0]).toBeCloseTo(0,12);expect(identity.transmittance).toEqual([1,1,1]);
  });
  test('screen probe is flat in the interior and identity-index glass never refracts',()=>{
    const p={depth:20,width:12,thickness:18,refraction:17,ior:1.48,gradient:[1,0]as const};expect(sampleGlassOptics(p)).toEqual({normal:[0,-0,1],displacement:[0,0]});
    expect(Math.hypot(...sampleGlassOptics({...p,depth:3}).displacement)).toBeGreaterThan(1);
    expect(Math.hypot(...sampleGlassOptics({...p,depth:3,ior:1}).displacement)).toBeLessThan(1e-12);
  });
  test('a wedge intersects its tilted exit plane and can totally reflect at that plane',()=>{
    const r=traceSlabRay({entryNormal:[.3,0,1],exitNormal:[.2,0,1],thickness:10,backdropDistance:20});
    expect(r.internal![0]*r.pathLength*.2+r.internal![2]*r.pathLength+10).toBeCloseTo(0,10);
    const reflected=traceSlabRay({entryNormal:[0,0,1],exitNormal:[1,0,1],thickness:10});expect(reflected.totalInternalReflection).toBe(true);expect(reflected.outgoing).toBeNull();expect(reflected.transmittance).toEqual([0,0,0]);
  });
});
describe('Open spring and deformation parameters',()=>{
  test('physical mass stiffness damping roundtrip preserves the differential equation',()=>{
    const p={mass:2,stiffness:150,damping:12},r=springToPhysical(springFromPhysical(p),2);expect(r.stiffness).toBeCloseTo(p.stiffness,12);expect(r.damping).toBeCloseTo(p.damping,12);
  });
  test('physics is validated and copied before it can enter a renderer',()=>{
    const scale:[number,number]=[.1,.2],p=createPhysics({pressScale:scale,geometry:{frequency:2}});scale[0]=.9;expect(p.pressScale[0]).toBe(.1);expect(p.geometry.damping).toBe(.88);
    expect(()=>createPhysics({velocityScale:0})).toThrow();expect(()=>createPhysics({material:{damping:-1}})).toThrow();expect(()=>springFromPhysical({mass:0,stiffness:1,damping:0})).toThrow();
  });
  test('an exported slow spring integrates a multi-second step without losing elapsed time',()=>{
    const a=new Spring(0,.1,.6),b=new Spring(0,.1,.6);a.target=b.target=100;a.step(4);for(let i=0;i<240;i++)b.step(1/60);expect(a.value).toBeCloseTo(b.value,9);expect(a.velocity).toBeCloseTo(b.velocity,9);
  });
});
