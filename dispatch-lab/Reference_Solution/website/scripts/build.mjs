import {readFile,mkdir,writeFile} from 'node:fs/promises';
const data=await readFile('data.json','utf8'),assets={};
for(const [route,file,type] of [['/','index.html','text/html; charset=utf-8'],['/app.js','app.js','text/javascript; charset=utf-8'],['/style.css','style.css','text/css; charset=utf-8']])assets[route]=[await readFile('web/'+file,'utf8'),type];
try{assets['/reference-evidence.json']=[await readFile('evidence/website_evidence.json','utf8'),'application/json'];}catch{}
const core=(await readFile('core.js','utf8')).replaceAll('export ',''),handler=(await readFile('handler.js','utf8')).replace('export ','');
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await mkdir('worker',{recursive:true});
await writeFile('worker/index.js',core+'\n'+handler+'\nconst data='+data+';\nconst assets='+JSON.stringify(assets)+';\nexport default {fetch:createHandler(data,assets,runExperiment)};\n');
await writeFile('dist/server/index.js',await readFile('worker/index.js'));await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Built Dispatch Lab Worker and embedded assets.');
