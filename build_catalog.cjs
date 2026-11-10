const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'dist'),context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'course-extra.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8').split('let saved={}')[0]+';this.catalog={datasets,exercises};this.csv=csv;',context);
fs.writeFileSync(path.join(root,'assets/catalog.json'),JSON.stringify(context.catalog,null,2));
for(const dataset of Object.values(context.catalog.datasets)){
 if(!dataset.download)continue;
 const {headers,rows}=JSON.parse(fs.readFileSync(path.join(root,dataset.file),'utf8'));
 fs.writeFileSync(path.join(root,dataset.download),context.csv(headers,rows));
}
console.log('Built catalog for '+Object.keys(context.catalog.datasets).length+' interactive datasets.');
