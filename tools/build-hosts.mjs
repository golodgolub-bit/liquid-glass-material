import { mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root=resolve(import.meta.dirname,'..');
for(const relative of ['examples/windows/WebAssets','examples/android/app/src/main/assets/glass']){
  const target=join(root,relative);await mkdir(target,{recursive:true});
  await copyFile(join(root,'examples/host/index.html'),join(target,'index.html'));
  for(const file of ['liquid-glass.js','style.css']) await copyFile(join(root,'dist',file),join(target,file));
  console.log(`Prepared ${relative}`);
}
