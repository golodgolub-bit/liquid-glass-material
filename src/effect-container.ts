import {GlassRenderer,type SurfaceHandle,type BackdropSource} from './renderer.js';
import {createMaterial,type GlassMaterial} from './material.js';
import {validateRect,type Rect} from './geometry.js';
import {createPhysics,type PhysicsOptions} from './physics.js';
import type {GlassShape} from './shape.js';
import type {MotionResult} from './motion.js';

export type GlassEffectTransition='matchedGeometry'|'materialize'|'identity';
export interface GlassEffectItem {
  id:string;rect:Rect;union?:string;shape?:GlassShape|null;content?:BackdropSource|null;
  interactive?:boolean;transition?:GlassEffectTransition;
}
export interface GlassEffectContainerOptions {
  namespace?:string;spacing?:number;layer?:number;vibrancy?:boolean;
  material?:Partial<GlassMaterial>;physics?:PhysicsOptions;transition?:GlassEffectTransition;
}
interface Entry {surface:SurfaceHandle;item:GlassEffectItem;revision:number;exiting:boolean}
let sequence=0;
const validTransitions=['matchedGeometry','materialize','identity'];
const distance=(a:Rect,b:Rect)=>Math.hypot(Math.max(0,a.x-b.x-b.width,b.x-a.x-a.width),Math.max(0,a.y-b.y-b.height,b.y-a.y-a.height));
/** Reconciles stable effect identities without replacing their springs or GPU renderer. */
export class GlassEffectContainer {
  readonly namespace:string;
  private entries=new Map<string,Entry>();
  private disposed=false;
  private options:GlassEffectContainerOptions;
  constructor(private renderer:GlassRenderer,options:GlassEffectContainerOptions={}){
    const spacing=options.spacing??20,layer=options.layer??0,transition=options.transition??'matchedGeometry';
    if(!Number.isFinite(spacing)||spacing<0||spacing>100||!Number.isFinite(layer)||!validTransitions.includes(transition))throw new RangeError('Invalid effect container options');
    if(options.namespace!==undefined&&!options.namespace)throw new TypeError('Namespace must be nonempty');
    this.namespace=options.namespace??`effects-${++sequence}`;
    this.options={...options,spacing,layer,transition,material:createMaterial(options.material),physics:createPhysics(options.physics)};
  }
  get size():number{return [...this.entries.values()].filter(e=>!e.exiting).length;}
  get(id:string):SurfaceHandle|undefined{const entry=this.entries.get(id);return entry&&!entry.exiting?entry.surface:undefined;}
  private nearest(rect:Rect,candidates:readonly GlassEffectItem[],union?:string):Rect|null{
    let best:Rect|null=null,gap=this.options.spacing!;
    for(const item of candidates)if(item.union===union){const d=distance(rect,item.rect);if(d<=gap){gap=d;best=item.rect;}}
    return best;
  }
  /** All rectangles and IDs are validated before reconciliation; call again to interrupt a transition. */
  reconcile(items:readonly GlassEffectItem[],options:{animate?:boolean}={}):Promise<MotionResult[]>{
    if(this.disposed)throw new Error('Effect container is disposed');
    const ids=new Set<string>(),counts=new Map<string,number>();
    for(const item of items){
      validateRect(item.rect);
      if(item.union!==undefined&&!item.union)throw new TypeError('Union keys must be nonempty');
      if(!item.id||ids.has(item.id))throw new Error('Effect IDs must be nonempty and unique inside a namespace');
      if(item.transition&&!validTransitions.includes(item.transition))throw new RangeError('Unknown effect transition');
      const old=this.entries.get(item.id);if(old&&old.item.union!==item.union)throw new Error('An effect identity cannot change its union; use a new ID');
      ids.add(item.id);const key=item.union??'';counts.set(key,(counts.get(key)??0)+1);
    }
    // Exiting members still occupy their union while their transition is visible.
    for(const [id,entry]of this.entries)if(!ids.has(id)){const key=entry.item.union??'';counts.set(key,(counts.get(key)??0)+1);}
    if([...counts.values()].some(n=>n>32))throw new RangeError('A union supports at most 32 active and exiting effects');
    const previous=[...this.entries.values()].filter(e=>!e.exiting).map(e=>({...e.item,rect:e.surface.state.visualRect}));
    const pending:Promise<MotionResult>[]=[];
    for(const item of items){
      const transition=item.transition??this.options.transition!,animate=options.animate!==false&&transition!=='identity';
      let entry=this.entries.get(item.id);
      if(!entry){
        const source=animate&&transition==='matchedGeometry'?this.nearest(item.rect,previous,item.union):null;
        const surface=this.renderer.addSurface({id:JSON.stringify([this.namespace,item.id]),group:JSON.stringify([this.namespace,'union',item.union??'']),spacing:this.options.spacing,layer:this.options.layer,vibrancy:this.options.vibrancy,material:this.options.material,physics:this.options.physics,rect:source??item.rect,shape:item.shape??undefined,content:item.content??undefined,interactive:item.interactive,materialize:animate,elastic:false});
        entry={surface,item:{...item,rect:{...item.rect}},revision:0,exiting:false};this.entries.set(item.id,entry);
      }else{
        if(item.shape!==entry.item.shape)entry.surface.shape(item.shape??null,{immediate:!animate});
        if(item.content!==entry.item.content)entry.surface.content(item.content??null);
      }
      entry.revision++;entry.exiting=false;entry.item={...item,rect:{...item.rect}};
      entry.surface.move(item.rect,animate);pending.push(entry.surface.show({immediate:!animate}));
    }
    for(const [id,entry]of this.entries)if(!ids.has(id)&&!entry.exiting){
      const transition=entry.item.transition??this.options.transition!,animate=options.animate!==false&&transition!=='identity',revision=++entry.revision;
      entry.exiting=true;
      const destination=animate&&transition==='matchedGeometry'?this.nearest(entry.surface.state.visualRect,items,entry.item.union):null;
      if(destination)entry.surface.move(destination);
      pending.push(entry.surface.hide({immediate:!animate}).then(result=>{
        if(!this.disposed&&entry.revision===revision&&entry.exiting){entry.surface.remove();this.entries.delete(id);}return result;
      }));
    }
    return Promise.all(pending);
  }
  material(options:Partial<GlassMaterial>,animate=true):this{
    if(this.disposed)throw new Error('Effect container is disposed');
    const base=options.variant!==undefined&&options.variant!==this.options.material?.variant?createMaterial({variant:options.variant}):this.options.material;
    const next=createMaterial({...base,...options});this.options.material=next;
    const unions=new Set<string>();for(const entry of this.entries.values()){const key=entry.item.union??'';if(!unions.has(key)){entry.surface.material(next,animate);unions.add(key);}}
    return this;
  }
  dispose():void{if(this.disposed)return;this.disposed=true;for(const entry of this.entries.values())entry.surface.remove();this.entries.clear();}
}
