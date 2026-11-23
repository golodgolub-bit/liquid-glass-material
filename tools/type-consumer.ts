// Compile independently with NodeNext to verify the published ESM declarations.
import { GlassRenderer, createGlassShape, bindLiquidHighlight, glassToggle, bindDrag, bindMediaBackdrop, glassPopover, glassSearch, bindLiquidSelection, bindDomBackdrop, supportsDomBackdrop, motionPresets,createGlassShader,slabOpticsGLSL,traceSlabRay,springFromPhysical, type BackdropSource, type GlassMaterial, type MotionResult } from '../dist/index.js';
declare const canvas: HTMLCanvasElement;
declare const parent: HTMLElement;
declare const backdrop: BackdropSource;
const material: Partial<GlassMaterial> = { variant: 'regular', tint: [0.2,0.5,1], edgeWidth:4 };
const renderer = new GlassRenderer(canvas);
renderer.setBackdrop(backdrop);
renderer.setShader(createGlassShader({declarations:slabOpticsGLSL,uniforms:{uGlass_gain:{type:'float',value:1}},optics:'GlassOpticalSample ray=defaultGlassOptics(data);ray.displacement*=uGlass_gain;return ray;'}));renderer.setShaderUniform('uGlass_gain',1.2);renderer.configureLightMotion({frequency:3});
traceSlabRay({entryNormal:[0,0,1],thickness:10});
renderer.setReflectionSource(canvas);renderer.updateReflection();renderer.setReflectionRotation(Math.PI);
const animation=renderer.addAnimation(({time,delta,frame,renderer:owner})=>{owner.setLight(Math.sin(time),delta);return frame<10;},{paused:true});
animation.resume();animation.pause();void animation.elapsed;void animation.running;animation.cancel();
const contour=createGlassShape({path:'M 50 4 L 95 95 L 5 95 Z'});
const front=renderer.addSurface({id:'front',layer:1,shape:contour,content:canvas,rect:{x:0,y:0,width:100,height:100,radius:20}});
void front.shape(null);front.contains(20,30);front.content(null);
front.configurePhysics({geometry:springFromPhysical({mass:1,stiffness:400,damping:30}),pressScale:[0,0]}).kick({x:100}).deform(({visualRect})=>({...visualRect}));void front.physics;void front.state.velocity;
renderer.setVibrancySource(canvas,{color:[.1,.4,1]});
bindLiquidHighlight(renderer,parent,{id:'highlight',items:[parent]}).dispose();
const toggle = glassToggle(renderer,parent,'Enabled',true,{material});
const moving: Promise<MotionResult> = toggle.surface.animateTo({x:20},{spring:motionPresets.fluid});
void moving;
toggle.surface.material({magnification:1.4,ior:1.48,reflection:.4,cornerPower:2.6});
bindDrag(renderer,toggle.element,{surface:toggle.surface}).dispose();
declare const media:HTMLImageElement;bindMediaBackdrop(renderer,media,{fit:'cover'}).dispose();
const menu=glassPopover(renderer,toggle.element,[{label:'Details'}],{parent});
const search=glassSearch(renderer,parent,{width:320});
const navigation=bindLiquidSelection(renderer,parent,{items:[toggle.element],id:'selection'});
declare const content:HTMLElement;
if(supportsDomBackdrop())bindDomBackdrop(renderer,canvas,content,{foreground:true}).dispose();
menu.dispose();search.dispose();navigation.dispose();
toggle.setChecked(false);
toggle.dispose();
renderer.dispose();

import {GlassEffectContainer,spectralIndices,absorptionFromTransmittance} from '../dist/index.js';
const effects=new GlassEffectContainer(renderer,{namespace:"typed"});void effects.reconcile([{id:"a",rect:{x:0,y:0,width:80,height:40,radius:20}}]);effects.material({abbeNumber:58,outsideIor:1,absorption:absorptionFromTransmittance([.9,1,1],20)});void spectralIndices(1.52,58);effects.dispose();

import {createContrast,createSizeAdaptation,contrastRatio,resolveMaterialForSize,materials} from "../dist/index.js";
front.contrast(createContrast({appearance:"auto",region:{x:.2,width:.6}})).sizeAdaptation(createSizeAdaptation({thickness:.4}));
void front.contrastReady();void front.state.baseMaterial;void contrastRatio([1,1,1],[0,0,0]);void resolveMaterialForSize(materials.clearDimmed,{width:300,height:180});

void renderer.idle;

import {evaluateContrastBounds,measureMaterialFootprint} from '../dist/index.js';
void evaluateContrastBounds({minimum:[0,0,0],maximum:[1,1,1]});
void resolveMaterialForSize(materials.regular,measureMaterialFootprint([{x:0,y:0,width:120,height:48}]));
const liftedSelection=bindLiquidSelection(renderer,parent,{id:'typed-lift',items:[parent],physics:{press:{frequency:4}},lift:{scale:[1.2,1.6],offset:[0,-4],trackingSpring:{frequency:12},releaseSpring:{frequency:4,damping:.9},material:{abbeNumber:58}}});liftedSelection.dispose();
