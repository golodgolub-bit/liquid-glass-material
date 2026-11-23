import{describe,it,expect}from'vitest';
import{spectralIndices,refractiveIndexAtWavelength,spectralWavelengths,absorptionFromTransmittance,sampleGlassOptics}from'../src/optics';
import{createMaterial}from'../src/material';
describe('spectral media',()=>{
  it('reconstructs nd and Vd at the Fraunhofer lines',()=>{
    const [r,g,b]=spectralIndices(1.5168,64.17);
    expect(g).toBeCloseTo(1.5168,12);expect(r).toBeLessThan(g);expect(b).toBeGreaterThan(g);
    expect((g-1)/(b-r)).toBeCloseTo(64.17,9);
    expect(refractiveIndexAtWavelength(1.5168,64.17,spectralWavelengths.green)).toBe(g);
    expect(()=>spectralIndices(1.5,0)).toThrow();expect(()=>refractiveIndexAtWavelength(1.5,58,200)).toThrow();
  });
  it('converts extinction and removes bending between matched media',()=>{
    const transmission=[.8,.9,1]as const,extinction=absorptionFromTransmittance(transmission,20);
    extinction.forEach((sigma,i)=>expect(Math.exp(-sigma*20)).toBeCloseTo(transmission[i],12));
    const ray=sampleGlassOptics({depth:3,width:12,thickness:18,refraction:17,ior:1.52,outsideIor:1.52,gradient:[1,0]});
    expect(Math.hypot(...ray.displacement)).toBeLessThan(1e-12);
    expect(()=>createMaterial({abbeNumber:1})).toThrow();expect(()=>createMaterial({absorption:[-.1,0,0]})).toThrow();
    expect(Object.isFrozen(createMaterial({absorption:extinction}).absorption)).toBe(true);
  });
});
