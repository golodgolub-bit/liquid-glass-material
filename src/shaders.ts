export const vertex = `#version 300 es
precision highp float;
out vec2 uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const scrollEdgeGLSL=`
uniform vec4 scrollEdges;uniform vec2 viewportSize;uniform vec4 edgeColor;uniform float edgeHard;
vec3 applyScrollEdge(vec3 c,vec2 texcoord){
  if(max(max(scrollEdges.x,scrollEdges.y),max(scrollEdges.z,scrollEdges.w))<0.001)return c;
  vec2 p=vec2(texcoord.x,1.0-texcoord.y)*viewportSize;
  vec4 distances=vec4(p.y,viewportSize.x-p.x,viewportSize.y-p.y,p.x);
  vec4 f=1.0-smoothstep(vec4(0.0),max(scrollEdges,vec4(0.001)),distances);
  f*=step(vec4(0.001),scrollEdges);
  if(edgeHard>0.5)f=step(distances,scrollEdges)*step(vec4(0.001),scrollEdges);
  float fade=max(max(f.x,f.y),max(f.z,f.w));
  vec3 ambient=texture(blurred,texcoord).rgb;
  float l=dot(ambient,vec3(.2126,.7152,.0722));
  vec3 body=edgeColor.a>0.5?edgeColor.rgb:mix(vec3(.065,.08,.1),vec3(.96,.97,.985),smoothstep(.25,.55,l));
  return mix(mix(c,ambient,fade*.75),body,fade*.72);
}`;
export const copyFragment = `#version 300 es
precision highp float;
in vec2 uv; out vec4 color; uniform sampler2D source;uniform sampler2D blurred;
${scrollEdgeGLSL}
void main() { color = vec4(applyScrollEdge(texture(source, uv).rgb,uv), 1.0); }`;
export const blurFragment = `#version 300 es
precision highp float;
in vec2 uv; out vec4 color; uniform sampler2D source; uniform vec2 direction;uniform float kernel[7];
void main() {
  // Dense Gaussian support: stretching a sparse five-tap kernel makes text
  // split into repeated stripes. Every neighboring blur texel participates.
  vec3 c=texture(source,uv).rgb*kernel[0];
  for(int i=1;i<=6;i++){vec2 offset=direction*float(i);c+=(texture(source,uv+offset).rgb+texture(source,uv-offset).rgb)*kernel[i];}
  color = vec4(c, 1.0);
}`;
export const glassFragment = `#version 300 es
precision highp float;
in vec2 uv; out vec4 color;
uniform sampler2D backdrop; uniform sampler2D blurred;uniform sampler2D scatteredWide;
uniform sampler2D vibrantForeground;uniform float useVibrancy;uniform float magnification;uniform vec2 lensCenter;
uniform vec4 vibrancyColor;
uniform vec2 resolution; uniform float pixelRatio;
uniform vec4 shapes[32]; uniform float radii[32]; uniform float reveals[32]; uniform int count; uniform float spacing;
uniform highp sampler2DArray shapeMaps;uniform int shapeIndices[32];uniform int shapeFromIndices[32];uniform float shapeBlends[32];
uniform sampler2D surfaceContent;uniform float contentOnly;
uniform vec4 optics; // thickness, refraction, dispersion, frost
uniform vec4 finish; // saturation, highlight, shadow, dimming
uniform vec4 tint;
uniform vec3 physical; // ior, environment reflection, corner power
uniform float edgeWidth;uniform float edgeLimit;uniform float bevelStrength;
uniform sampler2D environmentMap;uniform float hasEnvironment;uniform float environmentRotation;
uniform vec4 mode; // clear, appearance (-1 auto, 0 light, 1 dark), reduced transparency, contrast
uniform vec4 touch; // x,y, press, impulse
uniform float interactionTime;
uniform vec2 light;
${scrollEdgeGLSL}
// Distance AND its analytic gradient in one traversal (no finite-difference passes).
vec3 geometry(vec2 p, vec4 shape, float radius) {
  vec2 delta = p - shape.xy;
  vec2 q = abs(delta) - shape.zw + radius;
  vec2 outside = max(q, 0.0);
  float len=length(outside);
  vec2 n=len>0.00001?outside/len:(q.x>q.y?vec2(1,0):vec2(0,1));
  // Only curved continuous corners need powers; straight sides and capsules
  // use the exact, inexpensive circular distance.
  if(physical.z>2.001&&radius<min(shape.z,shape.w)-0.01&&min(outside.x,outside.y)>0.0){
    float scale=max(outside.x,outside.y);vec2 unit=outside/scale;
    vec2 raised=pow(unit,vec2(physical.z));len=scale*pow(raised.x+raised.y,1.0/physical.z);
    vec2 gradient=pow(unit,vec2(physical.z-1.0));n=gradient/max(length(gradient),0.0001);
  }
  n *= mix(vec2(-1.0),vec2(1.0),step(vec2(0.0),delta));
  return vec3(len + min(max(q.x,q.y),0.0) - radius, n);
}
vec3 contour(vec2 p,int i,int index) {
  if(index>=0){
    vec2 size=shapes[i].zw*2.0,local=(p-shapes[i].xy)/size+.5;
    vec4 sampleField=texture(shapeMaps,vec3(clamp(local,0.0,1.0),float(index)));
    float distanceUnit=(dot(sampleField.rg,vec2(65280.0,255.0))/65535.0-.5)*4.0;
    vec2 gradient=(sampleField.ba*2.0-1.0)/size;float len=max(length(gradient),.00001);
    vec2 outside=(local-clamp(local,0.0,1.0))*size;
    float outsideLength=length(outside);
    return vec3(distanceUnit/len+outsideLength,outsideLength>.001?outside/outsideLength:gradient/len);
  }
  return geometry(p,shapes[i],radii[i]);
}
vec4 shapeField(vec2 p,int i) {
  if(reveals[i]<0.0001)return vec4(1e6,0.0,0.0,0.0);
  vec3 result=contour(p,i,shapeIndices[i]);
  if(shapeBlends[i]<.9999)result=mix(contour(p,i,shapeFromIndices[i]),result,clamp(shapeBlends[i],0.0,1.0));
  return vec4(result,reveals[i]);
}
vec4 field(vec2 p) {
  vec4 a = shapeField(p,0);
  if (count == 1) return a;
  for (int i = 1; i < 32; i++) {
    if (i >= count) break;
    vec4 b = shapeField(p,i);
    float h = clamp(0.5 + 0.5 * (b.x-a.x) / max(spacing,0.001),0.0,1.0);
    a = vec4(mix(b.x,a.x,h) - spacing*h*(1.0-h), mix(b.yzw,a.yzw,h));
  }
  return a;
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / pixelRatio;
  vec4 boundary = field(p);
  float d = boundary.x, aa = 0.85 / pixelRatio;
  float coverage = 1.0 - smoothstep(-aa, aa, d);
  if(contentOnly>.5){
    if(coverage<.001)discard;
    vec2 local=(p-shapes[0].xy)/(shapes[0].zw*2.0)+.5;
    vec4 ink=texture(surfaceContent,vec2(local.x,1.0-local.y));
    float alpha=ink.a*coverage*clamp(boundary.w,0.0,1.0);color=vec4(ink.rgb*alpha,alpha);return;
  }
  float shadowDistance = d - boundary.z * 1.5;
  float presence = clamp(boundary.w, 0.0, 1.0);
  float shadow = exp(-max(shadowDistance, 0.0) / 5.0) * finish.z * (1.0 - coverage) * presence;
  if (d > 38.0) discard;
  if (coverage < 0.001) { color = vec4(vec3(0.015, 0.022, 0.04) * shadow, shadow); return; }
  vec2 grad = boundary.yz;
  float gradientLength=length(grad);
  vec2 n = grad / max(gradientLength, 0.0001);
  float depth = max(-d, 0.0), bevel = max(min(edgeWidth,edgeLimit),0.001);
  float t=clamp(depth/bevel,0.0,1.0);
  // Optical normals bend the transmitted ray. Shading normals are independent:
  // a lensing boundary must not automatically become a raised, embossed frame.
  float height=1.0-pow(1.0-t,3.0);
  float slope=2.4*(1.0-t)*(1.0-t)*min(gradientLength,1.0)*step(.001,edgeWidth);
  vec3 opticalNormal=normalize(vec3(n*vec2(1.0,-1.0)*slope,1.0));
  vec3 normal=normalize(vec3(n*vec2(1.0,-1.0)*slope*bevelStrength,1.0));
  vec3 incident=vec3(0.0,0.0,-1.0);
  vec3 ray=refract(incident,opticalNormal,1.0/physical.x);
  vec2 displacement=ray.xy/max(-ray.z,0.15)*optics.y*height*1.6*sqrt(optics.x/18.0)*presence;
  // A ray may sample beyond the silhouette. Clamping it to the pixel's distance
  // from the edge flattened the optics into a narrow visible stripe.
  displacement*=min(1.0,bevel*.7/max(length(displacement),.0001));
  vec2 texel=pixelRatio/resolution;
  vec2 centerUV=vec2(lensCenter.x/viewportSize.x,1.0-lensCenter.y/viewportSize.y);
  float zoom=1.0+(magnification-1.0)*presence;
  vec2 refractUV=centerUV+(uv-centerUV)/zoom+displacement*texel;
  float edge=1.0-t;
  vec2 spectral=displacement*texel*optics.z*0.045;
  vec3 transmitted = texture(backdrop,refractUV).rgb;
  if (optics.z > 0.001) { transmitted.r = texture(backdrop,refractUV+spectral).r; transmitted.b = texture(backdrop,refractUV-spectral).b; }
  float frost = mix(optics.w, max(optics.w, 0.94), mode.z);
  vec3 nearScatter=texture(blurred,refractUV).rgb;
  vec3 wideScatter=texture(scatteredWide,refractUV).rgb;
  vec3 scattered=mix(nearScatter,wideScatter,smoothstep(0.35,1.0,frost)),ambient=texture(blurred,uv).rgb;
  float lum = luma(ambient);
  float dark = mode.y < -0.5 ? 1.0 - smoothstep(0.25, 0.55, lum) : mode.y;
  // Roughness suppresses the sharp image instead of leaving a second sharp ghost.
  vec3 c = mix(transmitted, scattered, smoothstep(0.0,0.52,frost));
  c=applyScrollEdge(c,refractUV);
  c = mix(vec3(luma(c)), c, finish.x);
  float regular = 1.0 - mode.x;
  vec3 body = mix(vec3(0.96,0.97,0.99), vec3(0.07,0.085,0.11), dark);
  c = mix(c, body, regular * (0.08 + 0.06 * frost));
  c = mix(c, body, mode.z * 0.72); c *= 1.0 - finish.w;
  c = mix(c, c * tint.rgb * 0.65 + tint.rgb * (0.17 + luma(c) * 0.27), tint.a);
  if(useVibrancy>0.5){vec4 foreground=texture(vibrantForeground,refractUV);c=mix(c,mix(foreground.rgb,vibrancyColor.rgb,vibrancyColor.a),foreground.a);}
  float facing=dot(n,normalize(light));
  float f0=pow((physical.x-1.0)/(physical.x+1.0),2.0);
  float fresnel=(f0+(1.0-f0)*pow(1.0-opticalNormal.z,5.0))*step(1.0001,physical.x);
  vec3 reflected=reflect(incident,opticalNormal);
  vec2 reflectedUV=clamp(uv+reflected.xy*bevel*3.0*texel,texel,1.0-texel);
  vec3 environment=texture(blurred,reflectedUV).rgb;
  if(hasEnvironment>.5){vec2 e=vec2(fract(atan(reflected.x,reflected.z)/6.28318530718+.5+environmentRotation/6.28318530718),1.0-acos(clamp(reflected.y,-1.0,1.0))/3.14159265359);environment=texture(environmentMap,e).rgb;}
  c=mix(c,environment,fresnel*physical.y*presence);
  vec3 key=normalize(vec3(light*vec2(1.0,-1.0)*0.85,1.2));
  vec3 fillLight=normalize(vec3(-light*vec2(1.0,-1.0)*0.85,0.65));
  float keyGlare=pow(max(dot(normal,normalize(key+vec3(0,0,1))),0.0),48.0);
  float fillGlare=pow(max(dot(normal,normalize(fillLight+vec3(0,0,1))),0.0),62.0);
  float rim=exp(-depth*1.65),bezel=1.0-smoothstep(0.65,1.0,t);
  c+=vec3(1.0,0.985,0.96)*(keyGlare+fillGlare*0.4)*bezel*finish.y*0.03*bevelStrength;
  c+=rim*(0.025*bevelStrength+pow(max(facing,0.0),6.0)*mix(.035,.16,bevelStrength))*finish.y;
  c-=rim*pow(max(-facing,0.0),2.0)*0.12*finish.y*bevelStrength;
  // A broad response under the finger, without periodic water ripples.
  float glow=exp(-distance(p,touch.xy)/95.0)*touch.z;
  c+=vec3(0.018,0.022,0.028)*glow;
  float sweep=pow(max(dot(n,normalize(light+vec2(touch.w*0.65,-touch.w*0.3))),0.0),10.0);
  c+=vec3(1.0,0.98,0.94)*bezel*sweep*touch.w*finish.y*0.12;
  // Sub-LSB static dither avoids 8-bit gradient bands; never changes at rest.
  float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
  c+=dither/255.0;
  if (mode.w > 0.5) c = mix(body, mix(vec3(0.02),vec3(1.0),dark), rim);
  c = mix(texture(backdrop, uv).rgb, c, presence);
  color = vec4(clamp(c,0.0,1.0) * coverage, coverage);
}`;
