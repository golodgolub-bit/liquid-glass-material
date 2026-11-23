import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import {version} from './package.json';
export default defineConfig(({ mode }) => ({
  base: './',
  server: { watch: { ignored: ['**/artifacts/**','**/dist-demo/**','**/dist-html/**','**/WebAssets/**','**/assets/glass/**'] } },
  plugins: [{name:'release-version',transformIndexHtml:()=>[{tag:'meta',attrs:{name:'liquid-glass-version',content:version},injectTo:'head'}]},{name:'documentation-index',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url?.split('?')[0]==='/docs/')req.url=req.url.replace('/docs/','/docs/index.html');next();});}}],
  build: mode === 'demo' ? { outDir: 'dist-demo',rollupOptions:{input:{main:resolve(__dirname,'index.html'),examplesIndex:resolve(__dirname,'examples/index.html'),dom:resolve(__dirname,'examples/dom/index.html'),programmatic:resolve(__dirname,'examples/programmatic/index.html'),workbench:resolve(__dirname,'examples/workbench/index.html'),gallery:resolve(__dirname,'examples/gallery/index.html'),readability:resolve(__dirname,'examples/readability/index.html'),reference:resolve(__dirname,'examples/reference/index.html'),dispersion:resolve(__dirname,'examples/dispersion/index.html'),controls:resolve(__dirname,'examples/controls/index.html'),interfaceKit:resolve(__dirname,'examples/interface-kit/index.html')}} } : {
    copyPublicDir:false,
    lib: { entry: resolve(__dirname, 'src/index.ts'), name: 'LiquidGlass', formats: ['es'], fileName: 'liquid-glass', cssFileName: 'style' },
    sourcemap: true,
  },
}));
