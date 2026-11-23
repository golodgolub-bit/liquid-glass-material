import {version} from './version';
export function markup(icon:(name:string,size?:number)=>string,slider:(id:string,label:string,min:number,max:number,value:number,step:number,unit:string)=>string):string{return `
  <header class="header">
    <a class="brand" href="#" aria-label="Liquid Glass home"><span class="brand-icon">${icon("glass",22)}</span>liquid<span class="brand-light">glass</span><span class="version">${version}</span></a>
    <nav aria-label="Main navigation"><a class="active" href="#playground">Playground</a><a href="#anatomy">The material</a><a href="#integration">Developers ${icon("arrow",13)}</a></nav>
    <a href="./docs/index.html" class="header-cta">Documentation ${icon("arrow",15)}</a>
  </header>
  <main>
    <section class="intro" id="playground">
      <div><div class="eyebrow"><span class="live-dot"></span> THE MATERIAL LABORATORY</div><h1>Liquid Glass Material</h1><p>Refraction, layered surfaces and programmable motion.</p></div>
      <div class="intro-note"><span class="mono">01 / INTERACTIVE STUDY</span><p>Drag the lens, change the background<br>and compare material settings.</p></div>
    </section>
    <section class="laboratory" aria-label="Interactive material laboratory">
      <aside class="panel controls">
        <div class="panel-heading"><h2>Material</h2><button class="icon-button" id="reset" aria-label="Reset material">${icon("reset",16)}</button></div>
        <div class="segmented" aria-label="Material variant"><button data-variant="regular" class="selected" aria-pressed="true">Regular</button><button data-variant="clear" aria-pressed="false">Clear</button></div>
        <p class="control-note" id="variant-note">Adaptive contrast and scattering.<br>Regular material for controls.</p>
        <div class="rule"></div><div class="subheading">OPTICS <span>GPU MATERIAL</span></div>
        ${slider("refraction","Refraction",0,35,13,1,"px")}
        ${slider("thickness","Optical depth",2,40,18,1,"px")}
        ${slider("edgeWidth","Refraction reach",0,24,12,.25,"px")}
        ${slider("bevel","Raised edge",0,1,0,.05,"")}
        ${slider("edgeContrast","Contour contrast",0,1,.18,.02,"")}
        ${slider("scatterRadius","Scattering radius",0,12,9,.25,"px")}
        ${slider("frost","Scattering",0,100,68,1,"%")}
        ${slider("dispersion","Dispersion",0,2,.35,.05,"")}<details class="optical-details"><summary>Light & reflections</summary>${slider("specularIntensity","Edge light",0,2,.55,.05,"")}${slider("specularWidth","Edge light width",.1,12,1.4,.1,"px")}${slider("ambientSpill","Ambient color",0,1,.12,.02,"")}${slider("highlight","Highlights",0,2,.55,.05,"")}${slider("reflection","Reflections",0,1,.38,.02,"")}${slider("ior","Refractive index",1,2.5,1.48,.01,"")}${slider("cornerPower","Corner continuity",2,4,2.6,.1,"")}</details>
        <div class="rule"></div><div class="subheading">TINT <span>ABSORPTION</span></div>
        <div class="tint-swatches" aria-label="Glass tint">${[["neutral","#e9ecf2"],["blue","#5481ef"],["violet","#a185da"],["coral","#e89480"],["green","#8ab6a0"]].map(([r,e],t)=>`<button class="tint-swatch ${t===0?"selected":""}" data-tint="${r}" style="--swatch:${e}" aria-label="${r} tint" aria-pressed="${t===0}">${t===0?icon("check",13):""}</button>`).join("")}</div>
        <div class="rule"></div><div class="subheading">EXPERIMENTS</div>
        <button id="fusion" class="experiment-button" aria-pressed="false">${icon("layers",17)} Merge surfaces <span class="toggle-track"></span></button>
        <button id="motion" class="experiment-button" aria-pressed="false">${icon("move",17)} Reduced motion <span class="toggle-track"></span></button>
        <button id="contrast" class="experiment-button" aria-pressed="false">${icon("sun",17)} High contrast <span class="toggle-track"></span></button>
        <button id="transparency" class="experiment-button" aria-pressed="false">${icon("glass",17)} Reduced transparency <span class="toggle-track"></span></button>
      </aside>
      <div class="viewport-column">
        <div class="stage" id="stage">
          <canvas id="material-canvas" aria-hidden="true"></canvas>
          <div class="stage-controls"><button id="scene-label" class="scene-label">${icon("image",16)}<span>First light</span></button><div class="stage-actions"><button id="lighting" class="stage-icon" aria-label="Rotate light">${icon("sun",19)}</button><button id="menu-toggle" class="stage-icon" aria-label="Open material menu" aria-expanded="false" aria-controls="material-menu">${icon("plus",20)}</button></div></div>
          <button id="lens" class="lens" aria-label="Draggable glass lens. Use arrow keys to move."><span class="lens-symbol">${icon("move",25)}</span><strong>Feel the material</strong><small>DRAG TO EXPLORE</small></button>
          <button id="fusion-lens" class="fusion-lens" aria-label="Merge second surface" hidden>${icon("glass",28)}</button>
          <div id="material-menu" class="material-menu" hidden><div class="menu-title">A surface that responds.</div><button data-menu="grid">${icon("layers",17)} Inspect refraction</button><button data-menu="clear">${icon("glass",17)} Try clear glass</button><button data-menu="reset">${icon("reset",17)} Reset experiment</button><span>Geometry, optics, and motion.</span></div>
          <div class="stage-caption"><span class="caption-line"></span><span id="stage-caption-text">REAL-TIME REFRACTION · SHARED BACKDROP</span></div>
          <div class="dock" id="dock" role="group" aria-label="Sample navigation"><button class="dock-item active" data-dock="image" aria-label="Landscape" aria-pressed="true">${icon("image",22)}<span>Landscape</span></button><button class="dock-item" data-dock="heart" aria-label="Favorite" aria-pressed="false">${icon("heart",22)}<span>Favorite</span></button><button class="dock-item" data-dock="sliders" aria-label="Details" aria-pressed="false">${icon("sliders",22)}<span>Details</span></button></div>
          <button id="search" class="search-button" aria-label="Switch to calibration grid">${icon("search",23)}</button>
          <div class="stage-error" role="alert" hidden></div>
        </div>
        <div class="scene-strip"><span class="subheading">BACKDROP</span><div class="scene-options" role="group" aria-label="Backdrop">${[["dawn","First light"],["night","Blue hour"],["grid","Test grid"],["editorial","Editorial"]].map(([r,e],t)=>`<button data-scene="${r}" class="scene-option ${t===0?"selected":""}" aria-pressed="${t===0}"><span class="scene-thumb ${r}"></span>${e}</button>`).join("")}</div><label class="media-open">Open image / video<input id="media-file" type="file" accept="image/*,video/*" aria-label="Open backdrop image or video"></label></div>
      </div>
      <aside class="panel inspector">
        <div class="panel-heading"><h2>Under the surface</h2><span class="status-chip"><span class="live-dot"></span>LIVE</span></div>
        <div class="layer-stack"><div><span>01</span> Specular highlights <i></i></div><div><span>02</span> Curved boundary <i></i></div><div><span>03</span> Light transmission <i></i></div><div><span>04</span> Adaptive scattering <i></i></div><div><span>05</span> Ambient shadow <i></i></div></div>
        <p class="inspector-note">Five connected layers.<br>One continuous material.</p>
        <div class="rule"></div><div class="subheading">RENDERING <span id="gpu-status">WEBGL 2</span></div>
        <div class="metrics"><div><span>CPU submission</span><strong id="cpu-ms">—<small> ms</small></strong></div><div><span>GPU elapsed</span><strong id="gpu-ms">—</strong></div><div><span>Draw calls</span><strong id="draw-calls">—</strong></div><div><span>Texture budget</span><strong id="texture-mb">—</strong></div></div>
        <div class="frame-chart" id="frame-chart" aria-label="Recent CPU submission times"></div><div class="chart-label"><span>CPU SUBMISSION / FRAME</span><span id="idle-status">ON DEMAND</span></div>
        <label class="quality-label" for="quality">Render quality<select id="quality"><option value="low">Efficient · 1×</option><option value="balanced" selected>Balanced · 1.5×</option><option value="high">High · 2×</option></select></label>
        <p class="performance-note">Shared blur. Cached textures.<br>Zero render loop while idle.</p>
        <div class="platform-note"><span class="platform-dot"></span> Browser · Windows · Android</div>
      </aside>
    </section>
    <div class="lab-footnote"><span>AN INDEPENDENT, PORTABLE MATERIAL IMPLEMENTATION</span><span>Optical behavior inspired by Apple’s Liquid Glass. <a href="#integration">See scope & limitations ${icon("arrow",11)}</a></span></div>
    <section class="anatomy" id="anatomy"><div><div class="eyebrow">RENDERING MODEL</div><h2>Material and motion.</h2><p>The compositor combines refraction, cached scattering and spring motion over application-provided pixels.</p></div><div class="anatomy-cards"><article><span>01 / OPTICS</span><h3>Optical boundary</h3><p>A signed distance field defines the boundary. Its gradient drives lensing, directional reflections, and subtle spectral separation.</p></article><article><span>02 / DYNAMICS</span><h3>Spring motion</h3><p>Analytically integrated springs preserve velocity as targets change. Neighboring forms merge into a shared optical surface.</p></article><article><span>03 / CONTEXT</span><h3>Contrast and content</h3><p>Regular adapts to the backdrop. Clear preserves rich media. Contrast, transparency, and reduced motion remain explicit controls.</p></article></div></section>
    <section class="integration" id="integration"><div><div class="eyebrow">FOR DEVELOPERS</div><h2>Bring your own interface.</h2><p>Typed, framework-independent, and rendered on the GPU. Use the material in a web app, Electron, WebView2, or Android WebView.</p><div class="install"><code>npm install ./liquid-glass-material-${version}.tgz</code><button id="copy-install" class="icon-button" aria-label="Copy installation command">${icon("copy",17)}</button></div><p class="scope-note"><a href="./examples/dom/index.html">Try live HTML behind glass ↗</a><br>Requires an explicit canvas, image, or video backdrop. Arbitrary DOM and native windows cannot be refracted automatically. Native hosts need a WebView integration. This is an approximation; Apple’s shaders and exact constants are private.</p></div><div class="code-card"><div><span class="code-dot"></span><span>your-app.ts</span><button id="copy-code" class="icon-button" aria-label="Copy integration code">${icon("copy",16)}</button></div><pre><code id="code-example"></code></pre></div></section>
  </main><footer><a class="brand" href="#">${icon("glass",18)} liquidglass</a><span>WebGL 2 material and interaction library.</span><span class="mono">MIT LICENSE / v${version}</span></footer><div id="toast" role="status" aria-live="polite"></div>
`;}
