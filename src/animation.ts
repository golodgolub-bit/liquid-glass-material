import type{GlassRenderer}from'./renderer.js';
export interface AnimationFrame{/** Active seconds, excluding hidden/context-lost/paused time. */time:number;/** Seconds since this controller's previous active frame; zero on start/resume. */delta:number;frame:number;renderer:GlassRenderer}
export type AnimationCallback=(frame:Readonly<AnimationFrame>)=>void|boolean;
export interface AnimationOptions{/** Explicitly allow this callback under Reduced Motion. Default false. */essential?:boolean;paused?:boolean}
/** Controlled by the renderer's single requestAnimationFrame scheduler. */
export class GlassAnimation{
  private active:boolean;private cancelled=false;private first=true;private seconds=0;private frames=0;
  constructor(private callback:AnimationCallback,private request:()=>void,private remove:()=>void,readonly essential=false,paused=false){this.active=!paused;}
  get running(){return this.active&&!this.cancelled;}
  get elapsed(){return this.seconds;}
  pause():void{if(this.cancelled||!this.active)return;this.active=false;this.first=true;this.request();}
  resume():void{if(this.cancelled||this.active)return;this.active=true;this.first=true;this.request();}
  cancel():void{if(this.cancelled)return;this.cancelled=true;this.active=false;this.remove();this.request();}
  /** @internal */ suspend():void{this.first=true;}
  /** @internal */ tick(delta:number,renderer:GlassRenderer):void{
    if(!this.running)return;const dt=this.first?0:delta;this.first=false;this.seconds+=dt;
    if(this.callback({time:this.seconds,delta:dt,frame:this.frames++,renderer})===false)this.cancel();
  }
}
