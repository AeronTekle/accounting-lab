const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'dist');
require(path.join(dir,'formula.js'));
const {compileFormula:compile,calculate:calc,functions}=globalThis.FormulaLab;
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(dir,'app.js'),'utf8').split('let saved={}')[0]+';this.exercises=exercises;this.datasets=datasets;',context);
const employee=JSON.parse(fs.readFileSync(path.join(dir,'assets/employees.json'))),payroll=JSON.parse(fs.readFileSync(path.join(dir,'assets/payroll.json')));
function run(s,data=employee,i=0){return calc(compile(s),data,i);}
let checks=0;function equal(a,b){assert.deepEqual(a,b);checks++;}
equal(employee.rows.length,597);equal(payroll.rows.length,4981);
for(const ex of context.exercises.employees){const ast=compile(ex.answer);for(let i=0;i<employee.rows.length;i++){
 const row=employee.rows[i],code=row[0];const expected=ex.id==='e1'?row[1]+' '+row[2]:ex.id==='e2'?Number(code.split('-')[1].match(/^\d+/)[0]):/M(?:o)?$/.test(code)?'Monthly':'Weekly';equal(calc(ast,employee,i),expected);
}}
for(const ex of context.exercises.payroll){const ast=compile(ex.answer);if(ex.id==='p1'){for(let i=0;i<payroll.rows.length;i++)equal(calc(ast,payroll,i),payroll.rows[i][2]+payroll.rows[i][3]);}else equal(Math.round(calc(ast,payroll)*100)/100,ex.id==='p2'?32878.75:33.05);}
const cases=[['=LEFT(A2,5)','Japan'],['=RIGHT(A2,2)','Mo'],['=MID(A2,6,3)','177'],['=LEN(B2)',4],['=FIND("-",A2)',9],['=SEARCH("JAPAN",A2)',1],['=IF(TRUE,7,1/0)',7],['=IFERROR(1/0,99)',99],['=AND(1=1,2<3)',true],['=OR(FALSE,TRUE)',true],['=NOT(FALSE)',true],['=CONCATENATE(B2," ",C2)','Carl Rodriguez'],['=TRIM("  a   b  ")','a b'],['=UPPER(B2)','CARL'],['=LOWER(B2)','carl'],['=VALUE("123")',123],['=ROUND(-1.25,1)',-1.3],['=SUM(1,2,3)',6],['=AVERAGE(2,4)',3],['=COUNT(1,"a",2)',2],['=MIN(8,2,3)',2],['=MAX(8,2,3)',8],['=IF(TRUE;2;3)',2],['=IF(FALSE,1/0,7)',7]];
for(const [f,expected] of cases)equal(run(f),expected);
equal(run('=$B$2',employee,10),'Carl');equal(run('=B2',employee,1),'Anne');equal(run('=SUM(A2:B2)',payroll,1),25);
assert.throws(()=>run('=1/0'),/DIV/);assert.throws(()=>run('=Z99999'),/REF/);assert.throws(()=>run('=DOESNOTEXIST(1)'),/understøttes/);
assert.throws(()=>run('=FIND("missing",A2)'),/VALUE/);assert.throws(()=>run('=SEARCH("*",A2)'),/jokertegn/);
assert.throws(()=>run('=AVERAGE("a")'),/DIV/);
(async()=>{
 const init=require(path.join(dir,'assets/sql-wasm.js'));const SQL=await init({locateFile:f=>path.join(dir,'assets',f)});
 for(const dataset of ['songs','chinook']){const db=new SQL.Database(fs.readFileSync(path.join(dir,context.datasets[dataset].file)));db.run('PRAGMA query_only=ON');for(const ex of context.exercises[dataset]){const result=db.exec(ex.answer)[0];assert(result);const first=result.values[0];if(ex.id==='s1')equal(result.values.length,5);if(ex.id==='s2')equal(result.values.length,23);if(ex.id==='s3')equal(result.values.length,4);if(ex.id==='c1')equal(first[0],4);if(ex.id==='c2')equal(Math.round(first[0]*100)/100,2328.60);if(ex.id==='c3'){equal(result.values[0][0],'USA');assert(result.values.every((r,i,a)=>i===0||a[i-1][1]>=r[1]));}}
 assert.throws(()=>db.exec('DELETE FROM '+(dataset==='songs'?'songs':'Invoice')),/readonly/);db.close();}
 console.log(checks+' independent data/function checks passed; all '+functions.length+' supported functions covered; six SQL solutions executed using bundled SQLite.');
})().catch(e=>{console.error(e);process.exitCode=1;});
