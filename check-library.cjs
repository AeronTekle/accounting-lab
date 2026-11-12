const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
require('./dist/library-extra.js');
require('./dist/coverage-extra.js');
const library=globalThis.LIBRARY_EXTRA;
const catalog=require('./dist/assets/catalog.json');
const practice=require('./dist/assets/practice.json');
const expected=require('./library-checks.json');
const root=path.join(__dirname,'dist');
const all=[...Object.entries(catalog.exercises).flatMap(([dataset,questions])=>questions.map(q=>({...q,kind:catalog.datasets[dataset].schema?'SQL':'Excel'}))),...practice.questions,...library.questions,...globalThis.COURSE_COVERAGE.questions];
assert.equal(all.length,851);
for(const [kind,count] of [['Excel',359],['SQL',332],['Regression',160]])assert.equal(all.filter(q=>q.kind===kind).length,count,kind);
assert.equal(new Set(all.map(q=>q.id)).size,all.length);
assert.equal(new Set(all.map(q=>q.title)).size,all.length);
for(const q of all){
 for(const file of q.files||[])assert(fs.existsSync(path.join(root,file)),file);
 if(q.expected!==null&&q.expected!==undefined)assert(Number.isFinite(q.expected),q.id);
 if(q.model)assert({...practice.models,...globalThis.COURSE_COVERAGE.models}[q.model],q.id);
}
const same=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(a),Math.abs(b)):a===b;
(async()=>{
 const init=require('./dist/assets/sql-wasm.js');
 const SQL=await init({locateFile:file=>path.join(root,'assets',file)});
 let count=0;
 for(const [dataset,questions] of Object.entries(library.exercises)){
  const db=new SQL.Database(fs.readFileSync(path.join(root,catalog.datasets[dataset].file)));
  db.run('PRAGMA query_only=ON');
  for(const question of questions){
   const result=db.exec(question.answer)[0];
   const reference=expected[question.id];
   assert(reference,question.id);
   assert.deepEqual(result.columns,reference.columns,question.id);
   assert.equal(result.values.length,reference.rows.length,question.id);
   result.values.forEach((row,index)=>row.forEach((value,column)=>assert(same(value,reference.rows[index][column]),question.id+' row '+index+' column '+column)));
   count++;
  }
  db.close();
 }
 assert.equal(count,160);
 console.log('Library checks passed: 851 unique questions, 359 Excel, 332 SQL, 160 regression, and all 160 added SQL results matched the independent source calculations.');
})().catch(error=>{console.error(error);process.exitCode=1;});
