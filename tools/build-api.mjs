import ts from'typescript';
import{readFile,writeFile}from'node:fs/promises';
const config=ts.readConfigFile('tsconfig.lib.json',ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,'.');
const outputs=[];
const program=ts.createProgram(parsed.fileNames,{...parsed.options,noEmit:false,declaration:true,emitDeclarationOnly:true,declarationMap:false});
const result=program.emit(undefined,(file,content)=>{if(file.endsWith('.d.ts'))outputs.push({file,content});});
if(result.emitSkipped)throw new Error('Public API declaration generation failed');
const printer=ts.createPrinter();
function publicDeclarations(content){
  const source=ts.createSourceFile('api.d.ts',content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const transformed=ts.transform(source,[context=>root=>{
    const visit=node=>{
      if(ts.isClassDeclaration(node))return context.factory.updateClassDeclaration(node,node.modifiers,node.name,node.typeParameters,node.heritageClauses,node.members.filter(member=>!member.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword||m.kind===ts.SyntaxKind.ProtectedKeyword)));
      return ts.visitEachChild(node,visit,context);
    };return ts.visitNode(root,visit);
  }]);
  const printed=printer.printFile(transformed.transformed[0]);transformed.dispose();return printed;
}
const intro=await readFile('tools/api-intro.md','utf8');
const order=['material','renderer','effect-container','physics','motion','animation','shader-program','optics','shape','dom','drag','selection','highlight','components','presentation','search','scroll','environment','media','dom-backdrop','spring','geometry','index'];
const sections=[];
for(const name of order){const output=outputs.find(o=>o.file.replaceAll('\\','/').endsWith('/'+name+'.d.ts'));if(!output)continue;const heading=name==='material'?'GlassMaterial':name==='renderer'?'GlassRenderer and SurfaceHandle':name;sections.push(`## ${heading}\n\n\`\`\`ts\n${publicDeclarations(output.content).trim()}\n\`\`\`\n`);}
await writeFile('docs/api.md',intro+'\n'+sections.join('\n'));console.log('Generated public API from '+sections.length+' declaration modules');
