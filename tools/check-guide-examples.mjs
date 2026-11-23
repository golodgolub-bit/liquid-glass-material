import ts from'typescript';
import{readFile,writeFile,mkdir}from'node:fs/promises';
const pages=['quick-start','basic-controls','switches','animation-basics','interface-recipes','themes','edge-quality'],files=[];
await mkdir('artifacts/guide-typecheck',{recursive:true});
const names=['GlassRenderer','glassToggle','glassSlider','glassButton','glassTabs','glassPopover','glassSheet','bindElement','bindLiquidSelection','createGlassTextShape','createGlassShapeFromMask','createGlassShader','createMaterial','createPhysics'];
const globals={renderer:'Glass.GlassRenderer',surface:'Glass.SurfaceHandle',parent:'HTMLElement',labelCanvas:'HTMLCanvasElement',setting:'Glass.ToggleControl',wifi:'Glass.ToggleControl',volume:'Glass.SliderControl',resize:'ResizeObserver',maskCanvas:'HTMLCanvasElement'};
for(const page of pages){const md=await readFile(`docs/${page}.md`,'utf8');let index=0;
  for(const match of md.matchAll(/```ts\r?\n([\s\S]*?)```/g)){
    const code=match[1].replace(/^import\s[\s\S]*?;\s*$/gm,'');
    let prelude=`import * as Glass from '../../dist/index.js';\nconst {${names.join(',')}}=Glass;\n`;
    for(const[name,type]of Object.entries(globals))if(!new RegExp(`(?:const|let|function)\\s+${name}\\b`).test(code))prelude+=`declare const ${name}:${type};\n`;
    prelude+='declare function saveDocument():void;declare function savePreference(key:string,value:boolean):void;declare function setPreviewVolume(value:number):void;declare function saveVolume(value:number):void;declare function showItems(index:number):void;declare function showTheNextStep():void;\n';
    const file=`artifacts/guide-typecheck/${page}-${index++}.ts`;await writeFile(file,prelude+code);files.push(file);
  }
}
const program=ts.createProgram(files,{noEmit:true,strict:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,lib:['lib.es2022.d.ts','lib.dom.d.ts']});
const errors=ts.getPreEmitDiagnostics(program);if(errors.length){console.error(ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'}));process.exitCode=1;}else console.log(`Checked ${files.length} TypeScript examples from ${pages.length} developer guides against built declarations`);
