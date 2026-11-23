import { GlassRenderer, createMaterial, bindElement, glassToggle, glassSlider, glassTabs } from '../src';
const canvas = document.querySelector('canvas')!, source = document.createElement('canvas');
source.width = 320; source.height = 240;
const ctx = source.getContext('2d')!;
for(let x=0;x<320;x++) { ctx.fillStyle = `rgb(${x/320*255},${x%32<16?230:20},120)`; ctx.fillRect(x,0,1,240); }
const renderer = new GlassRenderer(canvas,{maxPixelRatio:1}); renderer.resize(320,240); renderer.setBackdrop(source);
const surface = renderer.addSurface({id:'test',contrast:false,sizeAdaptation:false,rect:{x:80,y:70,width:160,height:100,radius:35},material:createMaterial({variant:'identity'})});
function capture(): Promise<number[]> {
  return new Promise(resolve=> {
    const unsubscribe = renderer.subscribe(()=> {
      unsubscribe(); const copy = document.createElement('canvas'); copy.width=320; copy.height=240;
      const c = copy.getContext('2d')!; c.drawImage(canvas,0,0); resolve(Array.from(c.getImageData(0,0,320,240).data));
    }); renderer.invalidate();
  });
}
Object.assign(window,{testGlass:{renderer,surface,source,capture,bind:()=>bindElement(renderer,document.querySelector('button')!,{id:'button'}),controls:()=> {
  const parent=document.createElement('div');parent.style.cssText='position:absolute;top:0;left:330px;display:flex;flex-direction:column;gap:20px';document.body.append(parent);
  const toggle=glassToggle(renderer,parent,'Notifications'),slider=glassSlider(renderer,parent,'Volume',50),tabs=glassTabs(renderer,parent,['One','Two','Three']);
  return {toggle,slider,tabs,dispose:()=> {toggle.dispose();slider.dispose();tabs.dispose();parent.remove();}};
}}});
