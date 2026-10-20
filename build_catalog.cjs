const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'dist'),context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'course-extra.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8').split('let saved={}')[0]+';this.catalog={datasets,exercises};',context);
fs.writeFileSync(path.join(root,'assets/catalog.json'),JSON.stringify(context.catalog,null,2));
console.log('Built catalog for '+Object.keys(context.catalog.datasets).length+' interactive datasets.');
