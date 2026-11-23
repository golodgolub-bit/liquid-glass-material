export type BackdropName = 'dawn' | 'night' | 'grid' | 'editorial';
export function paintBackdrop(canvas: HTMLCanvasElement, width: number, height: number, scene: BackdropName, offset = 0): void {
  const scale = Math.min(devicePixelRatio,1.5);
  canvas.width = Math.round(width*scale); canvas.height = Math.round(height*scale);
  const c = canvas.getContext('2d')!; c.scale(scale,scale);
  const w = width, h = height;
  if (scene === 'grid' || scene === 'editorial') {
    c.fillStyle = '#f4f4ef'; c.fillRect(0,0,w,h);
    if (scene === 'grid') {
      for (let y = -40; y < h+40; y += 32) for (let x = -40; x < w+40; x += 32) {
        c.fillStyle = ((x+40)/32+(y+40)/32)%2 ? '#d5dcdf' : '#f5f6f0'; c.fillRect(x+offset%64,y,32,32);
      }
      c.strokeStyle = '#8c9eac'; c.lineWidth = 1;
      for (let x = 0; x < w; x += 128) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
      for (let y = 0; y < h; y += 128) { c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
      c.fillStyle = '#215bff'; c.fillRect(w*.41,0,4,h);
      c.fillStyle = '#e96430'; c.fillRect(0,h*.55,w,4);
      c.fillStyle = '#294050'; c.font = '11px ui-monospace, monospace';
      for (let y = 20; y < h; y += 128) for (let x = 10; x < w; x += 128) c.fillText(`${x}, ${y}`,x,y);
    } else {
      c.fillStyle = '#171b22'; c.font = `600 ${Math.min(w*.11,88)}px Georgia, serif`;
      c.fillText('A different',w*.10,h*.39-offset); c.fillText('point of view.',w*.10,h*.54-offset);
      c.font = '13px ui-monospace, monospace'; c.fillStyle = '#8c6256'; c.fillText('THE MATERIAL ISSUE  /  VOL. 026',w*.10,h*.20-offset);
      c.fillStyle = '#6a6f75'; c.font = '16px Georgia, serif';
      const text = ['Light moves through the surface, and the surface moves with you.', 'A thin boundary becomes a place between content and control.', 'Nothing stands still. Everything stays connected.'];
      text.forEach((t,i)=>c.fillText(t,w*.10,h*.67+i*27-offset));
      c.fillStyle = '#b8cad4'; c.fillRect(w*.10,h*.84-offset,w*.28,90);
      c.fillStyle = '#bc7560'; c.fillRect(w*.41,h*.84-offset,w*.18,90);
      c.fillStyle = '#5c7061'; c.fillRect(w*.62,h*.84-offset,w*.28,90);
    }
    return;
  }
  const night = scene === 'night';
  const sky = c.createLinearGradient(0,0,w*.8,h);
  if (night) { sky.addColorStop(0,'#111b38'); sky.addColorStop(.4,'#343d75'); sky.addColorStop(.75,'#8a537b'); sky.addColorStop(1,'#d98774'); }
  else { sky.addColorStop(0,'#a9c9df'); sky.addColorStop(.26,'#cad7e5'); sky.addColorStop(.56,'#f7dfd4'); sky.addColorStop(.8,'#efad8e'); sky.addColorStop(1,'#ba8695'); }
  c.fillStyle = sky; c.fillRect(0,0,w,h);
  const sunX = w*.72, sunY = h*.36;
  const halo = c.createRadialGradient(sunX,sunY,0,sunX,sunY,w*.4);
  halo.addColorStop(0,night?'#ecb1d025':'#fff4ccaa'); halo.addColorStop(1,'#fff0c000');
  c.fillStyle = halo; c.fillRect(0,0,w,h);
  c.fillStyle = night?'#f6d7da':'#fff4d7'; c.beginPath(); c.arc(sunX,sunY,night?24:37,0,Math.PI*2); c.fill();
  const layers = night ? ['#4e476f','#32395e','#222d4c','#18263b'] : ['#b4a6b6','#9693ad','#777e9c','#596d8d'];
  layers.forEach((color,i) => {
    c.beginPath(); c.moveTo(-20,h);
    for (let x = -20; x <= w+20; x += 4) {
      const t = x/w;
      const y = h*(.65+i*.087) + Math.sin(t*6.5+i*1.9)*h*.065 + Math.sin(t*13+i*2.4)*h*.018;
      c.lineTo(x,y);
    }
    c.lineTo(w+20,h); c.closePath(); c.fillStyle = color; c.fill();
  });
  const fade = c.createLinearGradient(0,h*.67,0,h); fade.addColorStop(0,'#a6b8cc00'); fade.addColorStop(1,night?'#111a3855':'#cbd9e022');
  c.fillStyle = fade; c.fillRect(0,0,w,h);
  c.fillStyle = night?'#fff7efb0':'#3a465d90'; c.font = '11px ui-monospace, monospace'; c.letterSpacing = '3px';
  c.fillText(night?'38° 43′ N  /  AFTER HOURS':'38° 43′ N  /  FIRST LIGHT',40,h*.26);
  c.fillStyle = night?'#fff8f0':'#35465e'; c.font = `400 ${Math.min(w*.077,66)}px Georgia, serif`; c.letterSpacing = '-2px';
  c.fillText('Somewhere',38,h*.40); c.fillText('between light.',38,h*.40+Math.min(w*.085,73));
  c.letterSpacing = '0px';
}
