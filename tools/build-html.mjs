import{build}from'vite';
import{readFile,writeFile,mkdir,readdir,cp}from'node:fs/promises';
import{resolve,dirname,join}from'node:path';
const inputs=['index.html','examples/index.html',...(await readdir('examples',{withFileTypes:true})).filter(e=>e.isDirectory()&&!['host','windows','android'].includes(e.name)).map(e=>`examples/${e.name}/index.html`)];
const version=JSON.parse(await readFile('package.json','utf8')).version;
await mkdir('dist-html',{recursive:true});
for(const input of inputs){
  const output=await build({configFile:false,base:'./',publicDir:false,logLevel:'error',build:{write:false,target:'es2022',minify:true,cssCodeSplit:false,assetsInlineLimit:Infinity,rollupOptions:{input:resolve(input),output:{format:'iife',inlineDynamicImports:true}}}});
  const files=output.output,html=files.find(f=>f.type==='asset'&&f.fileName.endsWith('.html'));if(!html)throw Error(`No HTML for ${input}`);
  let page=String(html.source);
  for(const asset of files){
    if(asset.type==='chunk'){
      page=page.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/,'');
      page=page.replace('</body>',()=>`<script>${asset.code.replaceAll('</script','<\\/script')}</script></body>`);
    }
    else if(asset.fileName.endsWith('.css'))page=page.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/,()=>`<style>${asset.source}</style>`);
  }
  page=page.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g,'').replace(/href="((?!https?:|#|mailto:)[^"]*\/)"/g,'href="$1index.html"');
  if(/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(page))throw Error(`Unbundled script/style in ${input}`);
  page=page.replace('</head>',`<meta name="liquid-glass-version" content="${version}"></head>`);
  const dest=join('dist-html',input);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,page);console.log(`Bundled ${input}`);
}
await cp('public/docs','dist-html/docs',{recursive:true});
await writeFile('dist-html/.nojekyll','');
await writeFile('dist-html/version.json',JSON.stringify({version,format:'standalone-html'},null,2)+'\n');
console.log(`Built ${inputs.length} standalone HTML examples from version ${version}`);
