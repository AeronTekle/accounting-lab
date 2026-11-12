const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'dist'),catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/catalog.json'))),practice=JSON.parse(fs.readFileSync(path.join(root,'assets/practice.json')));
const all=[...Object.values(catalog.exercises).flat(),...practice.questions];assert.equal(all.length,82);assert.equal(new Set(all.map(x=>x.id)).size,all.length);for(const q of all){assert(q.title);assert(q.answer);}
for(const q of practice.questions)for(const f of q.files)assert(fs.existsSync(path.join(root,f)),f);
for(const dataset of Object.values(catalog.datasets)){
 if(!dataset.download)continue;
 const {headers,rows}=JSON.parse(fs.readFileSync(path.join(root,dataset.file),'utf8'));
 const lines=fs.readFileSync(path.join(root,dataset.download),'utf8').replace(/^\uFEFF/,'').split('\r\n');
 assert.equal(lines[0],headers.map(header=>'"'+header+'"').join(';'));
 assert.equal(lines.length,rows.length+1);
}
for(const m of practice.materials){const b=fs.readFileSync(path.join(root,m.file));if(m.sha256)assert.equal(crypto.createHash('sha256').update(b).digest('hex'),m.sha256);}
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'exams.js'),'utf8').split('const store=')[0]+';this.sets=examSets;this.followUps=followUps;',ctx);assert.equal(Object.keys(ctx.followUps).length,24);
const questionKinds=Object.fromEntries([
 ...Object.entries(catalog.exercises).flatMap(([dataset,questions])=>questions.map(q=>[q.id,catalog.datasets[dataset].schema?'SQL':'Excel'])),
 ...practice.questions.map(q=>[q.id,q.kind])
]);
for(const kind of ['Excel','SQL','Regression'])assert.equal(Object.keys(ctx.followUps).filter(id=>questionKinds[id]===kind).length,8);
for(const [id,followUp] of Object.entries(ctx.followUps)){
 assert(questionKinds[id],id);
 assert(followUp.topic&&followUp.prompt);
 assert.equal(followUp.points.length,3,id);
 assert.equal(new Set(followUp.points).size,3,id);
}
assert.equal(ctx.sets.length,26);const ids=new Set(all.map(x=>x.id));for(const e of ctx.sets){assert(e.ids.every(x=>ids.has(x)));assert.equal(new Set(e.ids).size,e.ids.length);assert(e.ids.every(id=>id.startsWith("r")===(e.type==="regression")));assert.equal(e.ids.length,e.type==='regression'?4:5);assert.equal(e.seconds,e.type==='regression'?300:480);}
assert.equal(new Set(ctx.sets.flatMap(e=>e.ids)).size,all.length);
const examCode=fs.readFileSync(path.join(root,'exams.js'),'utf8');
let time=10_000, saved;
const element={classList:{toggle(){}},prepend(){},focus(){}};
const mockContext=vm.createContext({
 Date:{now:()=>time},
 datasetCatalog:catalog,
 localStorage:{setItem(_key,value){saved=value;}},
 document:{getElementById(){return element;},createElement(){return {};}}
});
vm.runInContext(examCode.split("el('examsTab').onclick=")[0]+
 ';catalog=datasetCatalog;renderSession=()=>{};this.exam={filesFor,newExam,newMock,single,startTimer,pauseTimer,finish,updateTimer,activeQuestionIds,locked,getSession:()=>session,setSession:value=>{session=value;},sets:examSets};',mockContext);
const exam=mockContext.exam;
assert.equal(exam.filesFor({dataset:'payroll'})[0],'assets/payroll-practice.csv');
assert.equal(exam.filesFor({dataset:'employees'})[0],'assets/employee-codes.csv');
assert.equal(exam.filesFor({dataset:'chinook'})[0],'assets/chinook.sqlite');
exam.newExam(exam.sets[0]);
exam.startTimer();
time+=42_000;
exam.pauseTimer();
const paused=JSON.parse(saved);
assert.equal(paused.remaining,438);
exam.setSession(paused);
exam.single('c2');
exam.newExam(exam.sets[1]);
exam.newMock();
assert.equal(exam.getSession().id,'M01');
assert.equal(exam.getSession().remaining,438);
exam.startTimer();
assert.equal(exam.getSession().deadline,time+438_000);
exam.finish();
exam.newMock();
assert.equal(exam.activeQuestionIds().length,5);
assert.equal(exam.getSession().remaining,480);
exam.startTimer();
exam.getSession().done[exam.activeQuestionIds()[0]]=true;
time+=480_000;
exam.updateTimer();
assert.equal(exam.getSession().partIndex,1);
assert.equal(exam.getSession().parts[0].expired,true);
assert.equal(exam.getSession().remaining,300);
assert.equal(exam.getSession().deadline,null);
assert.equal(exam.activeQuestionIds().length,4);
assert(exam.locked());
exam.setSession(JSON.parse(saved));
exam.single('c2');
assert.equal(exam.getSession().id,'mock');
exam.startTimer();
exam.pauseTimer();
assert.equal(exam.getSession().remaining,300);
exam.startTimer();
exam.finish();
assert.equal(exam.getSession().parts[1].expired,false);
assert.equal(exam.activeQuestionIds().length,9);
assert.equal(Object.keys(exam.getSession().done).length,1);
assert.equal(exam.locked(),false);
console.log('Exam flow checks passed: paused attempts, reload, independent timers and combined review.');
const t=practice.models.temperature.b,b=practice.models.interaction.b;
const r=id=>practice.questions.find(q=>q.id===id);assert(Math.abs(r('r1').expected-(t[0]+70*t[1]))<1e-8);assert(Math.abs(r('r2').expected-10*t[1])<1e-8);assert(Math.abs(r('r4').expected-(b[2]+5000*b[3]))<1e-8);assert(Math.abs(r('r5').expected-(b[1]+b[3]))<1e-8);
assert(Math.abs(r('r7').expected-20*t[1])<1e-8);
assert(Math.abs(r('r10').expected-1000*(b[1]+b[3]))<1e-8);
assert(Math.abs(r('r11').expected-(b[0]+4000*b[1]))<1e-8);
assert.equal(Object.keys(practice.models).length,6);
for(const q of practice.questions.filter(q=>q.kind==='Regression'))assert.equal(practice.models[q.model].n,312);
assert.equal(r('r13').expected.toFixed(2),'2685.62');
assert(practice.models.quadratic.b[2]<0);
assert.equal(r('r15').expected.toFixed(2),'1436.30');
assert.equal(r('r16').expected.toFixed(4),'-0.0405');
assert.match(r('f4').answer,/11 missing ZIP codes recorded as the text N\/A/);
assert.match(r('i3').answer,/33\.05.*33\.20/);
assert.equal(practice.models.temperature.n,312);assert.equal(practice.verification.film_records,33502);assert.equal(practice.verification.brooklyn_shoots,10367);assert.equal(practice.verification.phantom_rows,68);
(async()=>{const init=require(path.join(root,'assets/sql-wasm.js')),SQL=await init({locateFile:f=>path.join(root,'assets',f)});for(const name of ['movies','pcards']){const db=new SQL.Database(fs.readFileSync(path.join(root,catalog.datasets[name].file)));for(const q of catalog.exercises[name]){const out=db.exec(q.answer)[0];assert(out,q.id);assert.equal(out.values.length,practice.verification.sql[q.id].rows);assert.deepEqual(out.values.slice(0,5),practice.verification.sql[q.id].preview);}assert.equal(db.exec('PRAGMA integrity_check')[0].values[0][0],'ok');db.close();}console.log('Course checks passed: 82 unique questions, 26 complete exams, original-file hashes, regression arithmetic, 22 extra SQL answers and SQLite integrity.');})().catch(e=>{console.error(e);process.exitCode=1;});
