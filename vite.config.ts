import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig(({ mode }) => ({
  base: './',
  server: { watch: { ignored: ['**/public/docs/**', '**/artifacts/**'] } },
  plugins: [{name:'documentation-index',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url?.split('?')[0]==='/docs/')req.url=req.url.replace('/docs/','/docs/index.html');next();});}}],
  build: mode === 'demo' ? { outDir: 'dist-demo',rollupOptions:{input:{main:resolve(__dirname,'index.html'),dom:resolve(__dirname,'examples/dom/index.html'),programmatic:resolve(__dirname,'examples/programmatic/index.html'),workbench:resolve(__dirname,'examples/workbench/index.html'),gallery:resolve(__dirname,'examples/gallery/index.html')}} } : {
    copyPublicDir:false,
    lib: { entry: resolve(__dirname, 'src/index.ts'), name: 'LiquidGlass', formats: ['es'], fileName: 'liquid-glass', cssFileName: 'style' },
    sourcemap: true,
  },
}));
