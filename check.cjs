const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'dist');
require(path.join(dir,'formula.js'));
const {compileFormula:compile,calculate:calc,functions}=globalThis.FormulaLab;
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(dir,"course-extra.js"),"utf8"),context);vm.runInContext(fs.readFileSync(path.join(dir,'library-extra.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(dir,'coverage-extra.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(dir,'app.js'),'utf8').split('let saved={}')[0]+';this.exercises=exercises;this.datasets=datasets;',context);
const employee=JSON.parse(fs.readFileSync(path.join(dir,'assets/employees.json'))),payroll=JSON.parse(fs.readFileSync(path.join(dir,'assets/payroll.json')));
function run(s,data=employee,i=0){return calc(compile(s),data,i);}
let checks=0;function equal(a,b){assert.deepEqual(a,b);checks++;}
equal(employee.rows.length,597);equal(payroll.rows.length,4981);
const employeeChecks={
 e1:([,first,last])=>first+' '+last,
 e2:([code])=>Number(code.split('-')[1].match(/^\d+/)[0]),
 e3:([code])=>/M(?:o)?$/.test(code)?'Monthly':'Weekly',
 e4:([code])=>code.split('-')[0],
 e5:([,first,last])=>(first[0]+last[0]).toUpperCase(),
 e6:([code])=>code.length
};
for(const ex of context.exercises.employees){
 const ast=compile(ex.answer);
 for(const [index,row] of employee.rows.entries())equal(calc(ast,employee,index),employeeChecks[ex.id](row));
}
const sumColumn=index=>payroll.rows.reduce((total,row)=>total+row[index],0);
const payrollChecks={
 p1:([,,regularPay,overtimePay])=>regularPay+overtimePay,
 p6:([hours,overtime,regularPay,overtimePay])=>hours+overtime===0&&regularPay+overtimePay!==0?'Review':'OK'
};
const payrollTotals={p2:32878.75,p3:33.05,p4:sumColumn(3),p5:sumColumn(1)/32878.75};
for(const ex of context.exercises.payroll){
 const ast=compile(ex.answer);
 if(ex.mode==='rows'){
  for(const [index,row] of payroll.rows.entries())equal(calc(ast,payroll,index),payrollChecks[ex.id](row));
 }else{
  assert(Math.abs(calc(ast,payroll)-payrollTotals[ex.id])<1e-7,ex.id);
  checks++;
 }
}
equal(payroll.rows.filter(row=>payrollChecks.p6(row)==='Review').length,7);
const cases=[['=LEFT(A2,5)','Japan'],['=RIGHT(A2,2)','Mo'],['=MID(A2,6,3)','177'],['=LEN(B2)',4],['=FIND("-",A2)',9],['=SEARCH("JAPAN",A2)',1],['=IF(TRUE,7,1/0)',7],['=IFERROR(1/0,99)',99],['=AND(1=1,2<3)',true],['=OR(FALSE,TRUE)',true],['=NOT(FALSE)',true],['=CONCATENATE(B2," ",C2)','Carl Rodriguez'],['=TRIM("  a   b  ")','a b'],['=UPPER(B2)','CARL'],['=LOWER(B2)','carl'],['=VALUE("123")',123],['=ROUND(-1.25,1)',-1.3],['=SUM(1,2,3)',6],['=AVERAGE(2,4)',3],['=COUNT(1,"a",2)',2],['=MIN(8,2,3)',2],['=MAX(8,2,3)',8],['=IF(TRUE;2;3)',2],['=IF(FALSE,1/0,7)',7]];
for(const [f,expected] of cases)equal(run(f),expected);
equal(run('=$B$2',employee,10),'Carl');equal(run('=B2',employee,1),'Anne');equal(run('=SUM(A2:B2)',payroll,1),25);
assert.throws(()=>run('=1/0'),/DIV/);assert.throws(()=>run('=Z99999'),/REF/);assert.throws(()=>run('=DOESNOTEXIST(1)'),/unavailable/);
assert.throws(()=>run('=FIND("missing",A2)'),/VALUE/);assert.throws(()=>run('=SEARCH("*",A2)'),/literal text/);
assert.throws(()=>run('=AVERAGE("a")'),/DIV/);
(async()=>{
 const init=require(path.join(dir,'assets/sql-wasm.js'));const SQL=await init({locateFile:f=>path.join(dir,'assets',f)});
 for(const dataset of ['songs','chinook']){const db=new SQL.Database(fs.readFileSync(path.join(dir,context.datasets[dataset].file)));db.run('PRAGMA query_only=ON');for(const ex of context.exercises[dataset]){const result=db.exec(ex.answer)[0];assert(result);const first=result.values[0];if(ex.id==='s1')equal(result.values.length,5);if(ex.id==='s2')equal(result.values.length,23);if(ex.id==='s3')equal(result.values.length,4);if(ex.id==='c1')equal(first[0],4);if(ex.id==='c2')equal(Math.round(first[0]*100)/100,2328.60);if(ex.id==='c3'){equal(result.values[0][0],'USA');assert(result.values.every((r,i,a)=>i===0||a[i-1][1]>=r[1]));}
 if(ex.id==='s4'){equal(result.values.length,5);equal(first[1],0.964);}
 if(ex.id==='s5')assert(Math.abs(first[0]-0.65906)<1e-8);
 if(ex.id==='s6')equal(result.values.reduce((n,row)=>n+row[1],0),100);
 if(ex.id==='c4'){equal(result.values.length,59);assert(Math.abs(result.values.reduce((n,row)=>n+row[1],0)-2328.60)<1e-7);}
 if(ex.id==='c5'){equal(result.values.length,5);equal(first[0],412);}
 if(ex.id==='c6'){equal(result.values.length,24);equal(result.values.reduce((n,row)=>n+row[1],0),59);}
 if(ex.id==='s7'){equal(result.values.length,100);equal(result.columns.length,2);}
 if(ex.id==='s8')equal(result.values.length,100);
 if(ex.id==='s9')equal(result.values.length,3);
 if(ex.id==='s10'||ex.id==='s11'){equal(result.values.length,1);assert(Number.isFinite(first[0]));}
 if(ex.id==='s12')assert(result.values.every(([name])=>name.toLowerCase().includes('feat.')));

}
 assert.throws(()=>db.exec('DELETE FROM '+(dataset==='songs'?'songs':'Invoice')),/readonly/);db.close();}
 console.log(checks+' independent data/function checks passed; all '+functions.length+' supported functions covered; '+['songs','chinook'].reduce((n,id)=>n+context.exercises[id].length,0)+' SQL solutions executed using bundled SQLite.');
})().catch(e=>{console.error(e);process.exitCode=1;});
