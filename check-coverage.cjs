const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
require('./dist/coverage-extra.js');require('./dist/library-extra.js');
const extra=COURSE_COVERAGE,refs=require('./coverage-checks.json'),catalog=require('./dist/assets/catalog.json');
const questions=[...Object.values(catalog.exercises).flat(),...require('./dist/assets/practice.json').questions,...LIBRARY_EXTRA.questions,...extra.questions];
const ids=new Set(questions.map(q=>q.id));assert.equal(ids.size,851);assert.equal(questions.length,851);
assert.equal(Object.keys(extra.models).length,120);
assert.equal(extra.questions.filter(q=>q.kind==='Regression').length,120);
for(const q of extra.questions){assert(ids.has(q.id));assert(q.answer&&q.skill&&q.hint);if(q.model)assert(extra.models[q.model]);for(const f of q.files)assert(fs.existsSync('dist/'+f),f);}
const ctx={LIBRARY_EXTRA,COURSE_COVERAGE};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/exams.js','utf8').split('const store=')[0]+';this.sets=examSets;',ctx);
assert.equal(ctx.sets.filter(e=>e.type==='manipulation').length,800);assert.equal(ctx.sets.filter(e=>e.type==='regression').length,44);
assert.equal(new Set(ctx.sets.map(e=>e.id)).size,844);
assert.equal(new Set(ctx.sets.flatMap(e=>e.ids)).size,851);
const signatures=ctx.sets.filter(e=>e.type==='manipulation').map(e=>[...e.ids].sort().join('|'));assert.equal(new Set(signatures).size,800);
for(let i=1;i<=30;i++){const set=ctx.sets.find(e=>e.id==='RC'+String(i).padStart(2,'0'));assert.equal(set.ids.length,4);assert.equal(new Set(set.ids.map(id=>extra.questions.find(q=>q.id===id).model)).size,4);}
const audit=require('./coverage-audit.json');assert.equal(audit.manipulation.length,400);assert.equal(audit.regression.length,120);
for(const e of audit.manipulation)assert(e.equivalents.length&&e.equivalents.every(id=>ids.has(id)));
for(const m of Object.values(extra.models)){assert(m.n===309);assert(Number.isFinite(m.r2));for(const c of m.coefficients)assert(Number.isFinite(c.estimate)&&c.standardError>0&&c.pValue>=0&&c.pValue<=1);}
(async()=>{
 const SQL=await require('./dist/assets/sql-wasm.js')({locateFile:f=>path.join(__dirname,'dist/assets',f)});let tested=0,empty=0;
 for(const [name,qs] of Object.entries(extra.exercises)){
  const db=new SQL.Database(fs.readFileSync('dist/'+catalog.datasets[name].file));
  for(const q of qs){const statement=db.prepare(q.answer),actual=[];const cols=statement.getColumnNames();while(statement.step())actual.push(statement.get());statement.free();const expected=refs[q.id];assert.deepEqual(cols,expected.columns,q.id);assert.equal(actual.length,expected.rows.length,q.id);for(let i=0;i<actual.length;i++)for(let j=0;j<cols.length;j++){const a=actual[i][j],b=expected.rows[i][j];assert(typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(a),Math.abs(b)):a===b,q.id);}tested++;if(!actual.length)empty++;}
  db.close();
 }
 assert.equal(tested,132);
 const periods=new SQL.Database(fs.readFileSync('dist/assets/pcards-periods.db'));assert.deepEqual(periods.exec('SELECT DISTINCT Year FROM pcards ORDER BY Year')[0].values,[[2011],[2012],[2013],[2014]]);assert.equal(periods.exec('SELECT COUNT(*) FROM (SELECT Year,Month FROM pcards GROUP BY Year,Month)')[0].values[0][0],48);periods.close();
 console.log(`Coverage checks passed: 851 questions, 800 distinct manipulation sets, 44 regression sets, 120 model outputs, 132 independently checked SQL answers (${empty} valid empty results) and all 48 source year/month combinations.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
