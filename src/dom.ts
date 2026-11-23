import { GlassRenderer, type SurfaceOptions, type SurfaceHandle } from './renderer.js';
import type { Rect } from './geometry.js';

export interface ElementBinding { surface: SurfaceHandle; refresh: (animate?: boolean) => void; dispose: () => void }

/** Bind semantic DOM content to a GPU surface. The root canvas must have no CSS transform. */
export function bindElement(renderer: GlassRenderer, element: HTMLElement, options: Omit<SurfaceOptions,'rect'> & { radius?: number }): ElementBinding {
  const original={translate:element.style.translate,scale:element.style.scale,opacity:element.style.opacity,visibility:element.style.visibility};
  const opacity=Number(getComputedStyle(element).opacity);
  const measure = () => {
    const translate=element.style.translate,scale=element.style.scale;
    element.style.translate=original.translate;element.style.scale=original.scale;
    const canvas = renderer.canvas.getBoundingClientRect(), rect = element.getBoundingClientRect();
    element.style.translate=translate;element.style.scale=scale;
    const scaleX = renderer.size.width / canvas.width, scaleY = renderer.size.height / canvas.height;
    return { x: (rect.left-canvas.left)*scaleX, y: (rect.top-canvas.top)*scaleY, width: rect.width*scaleX, height: rect.height*scaleY, radius: options.radius ?? (parseFloat(getComputedStyle(element).borderRadius) || 24) };
  };
  let base: Rect=measure();
  const surface = renderer.addSurface({ ...options, rect: base });
  element.classList.add('lg-surface');
  let disposed = false, refreshToken = 0, pressed = false;
  const refresh = (animate = false) => { if (!disposed && element.getClientRects().length) {const next=measure();if((Object.keys(base)as(keyof Rect)[]).every(k=>Math.abs(base[k]-next[k])<.001))return;base=next;surface.move(base,animate);} };
  const schedule = () => { if (!refreshToken) refreshToken = requestAnimationFrame(() => { refreshToken = 0; refresh(); }); };
  const observer = new ResizeObserver(schedule); observer.observe(element); observer.observe(renderer.canvas);
  window.addEventListener('scroll',schedule,true); window.addEventListener('resize',schedule);
  const point = (event: PointerEvent) => {
    const bounds = renderer.canvas.getBoundingClientRect();
    return [(event.clientX-bounds.left)*renderer.size.width/bounds.width,(event.clientY-bounds.top)*renderer.size.height/bounds.height] as const;
  };
  const down = (event: PointerEvent) => { if (event.button !== 0) return; pressed = true; surface.interact(true,...point(event)); };
  const move = (event: PointerEvent) => { if (pressed) surface.interact(true,...point(event)); };
  const up = () => { pressed = false; surface.interact(false); };
  const keydown = (event: KeyboardEvent) => { if (event.key === ' ' || event.key === 'Enter') surface.interact(true); };
  const keyup = () => surface.interact(false);
  element.addEventListener('pointerdown',down); element.addEventListener('pointermove',move);
  window.addEventListener('pointerup',up); window.addEventListener('pointercancel',up);window.addEventListener('blur',up);
  element.addEventListener('keydown',keydown); element.addEventListener('keyup',keyup); element.addEventListener('blur',up);
  let last='';
  const unsubscribe = renderer.subscribe(() => {
    element.style.setProperty('--lg-foreground',surface.foreground);
    const state=surface.state,r=state.visualRect;
    const tx=r.x+r.width/2-base.x-base.width/2,ty=r.y+r.height/2-base.y-base.height/2;
    const transform=`${tx.toFixed(3)} ${ty.toFixed(3)} ${(r.width/base.width).toFixed(5)} ${(r.height/base.height).toFixed(5)} ${state.visibility.toFixed(4)}`;
    if(transform===last)return;last=transform;
    element.style.translate=`${tx}px ${ty}px`;element.style.scale=`${r.width/base.width} ${r.height/base.height}`;
    element.style.opacity=String(opacity*state.visibility);element.style.visibility=state.visibility<.001?'hidden':original.visibility;
  });
  return { surface, refresh, dispose: () => {
    if (disposed) return; disposed = true; cancelAnimationFrame(refreshToken); observer.disconnect(); unsubscribe();
    window.removeEventListener('scroll',schedule,true); window.removeEventListener('resize',schedule);
    element.removeEventListener('pointerdown',down); element.removeEventListener('pointermove',move);
    window.removeEventListener('pointerup',up); window.removeEventListener('pointercancel',up);window.removeEventListener('blur',up);
    element.removeEventListener('keydown',keydown); element.removeEventListener('keyup',keyup); element.removeEventListener('blur',up);
    element.classList.remove('lg-surface'); element.style.removeProperty('--lg-foreground'); surface.remove();
    Object.assign(element.style,original);
  } };
}

/** Measures only on resize; returns the teardown callback. */
export function observeSize(renderer: GlassRenderer): () => void {
  const canvas = renderer.canvas;
  const resize = () => { const r = canvas.getBoundingClientRect(); if (r.width && r.height) renderer.resize(r.width,r.height); };
  const observer = new ResizeObserver(resize);
  try { observer.observe(canvas,{ box: 'device-pixel-content-box' }); } catch { observer.observe(canvas); }
  window.addEventListener('resize',resize); resize();
  return () => { observer.disconnect(); window.removeEventListener('resize',resize); };
}
