'use strict';
const el=id=>document.getElementById(id);
const sections=['home','bank','materials','session'];
let catalog,practice,bank=[],byId={},session=null,section='home';
const nf=new Intl.NumberFormat('en-US',{maximumFractionDigits:6});
const examSets=[
 {id:'M01',title:'Employee Codes and Songs',type:'manipulation',seconds:480,ids:['e1','e2','e3','s2','s3'],desc:'Extract text, apply conditions and join related data.'},
 {id:'M02',title:'Payroll and Invoices',type:'manipulation',seconds:480,ids:['p1','p2','p3','c1','c2'],desc:'Calculate gross pay, weighted rates and totals.'},
 {id:'M03',title:'Film Permits and Filters',type:'manipulation',seconds:480,ids:['f1','f2','f3','s1','s2'],desc:'Import data, work with dates and apply filters.'},
 {id:'M04',title:'Data Quality and Movies',type:'manipulation',seconds:480,ids:['t1','j1','j2','m1','m2'],desc:'Practise ETL, journal data, joins and averages.'},
 {id:'M05',title:'Payroll and Audit Flags',type:'manipulation',seconds:480,ids:['i1','i2','p3','a1','a2'],desc:'Compare payroll systems, inspect missing data and review purchasing cards.'},
 {id:'M06',title:'Employee Codes and Actors',type:'manipulation',seconds:480,ids:['e2','e3','m1','m2','m3'],desc:'Extract parts of variable-length codes and query related tables.'},
 {id:'R01',title:'Temperature and Sales',type:'regression',seconds:300,ids:['r1','r2','r3','r6'],desc:'Interpret coefficients and p-values, make predictions and identify forecast inputs.'},
 {id:'R02',title:'Sales on Game Days',type:'regression',seconds:300,ids:['r4','r5','r3','r6'],desc:'Interpret interactions, reference groups and uncertainty.'},
 {id:'R03',title:'Explain the Model',type:'regression',seconds:300,ids:['r1','r3','r4','r5'],desc:'Calculate and interpret model results.'}
];
const store=()=>{try{localStorage.setItem('accountingLab.exam.v1',JSON.stringify(session));}catch{}};
function text(tag,content,cls){const x=document.createElement(tag);x.textContent=content;if(cls)x.className=cls;return x;}
function btn(label,action,cls='primary-button'){const b=text('button',label,cls);b.onclick=action;return b;}
function show(id){section=id;for(const s of sections)el(s).hidden=s!==id;for(const [name,view] of [['examsTab','home'],['bankTab','bank'],['materialsTab','materials']])el(name).classList.toggle('active',id===view);if(id==='bank')renderBank();}
function remaining(){return session?.deadline?Math.max(0,Math.ceil((session.deadline-Date.now())/1000)):session?.remaining||0;}
function displayTime(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function locked(){return session&&!session.guided&&!session.finished;}
function renderCards(){
 for(const group of ['manipulation','regression']){const container=el(group==='manipulation'?'manipulationCards':'regressionCards');container.replaceChildren();examSets.filter(x=>x.type===group).forEach(ex=>{const card=text('article','','exam-card');card.append(text('span',ex.id+' · '+ex.ids.length+' QUESTIONS','eyebrow'),text('h3',ex.title),text('p',ex.desc),btn('Open exam ↗',()=>newExam(ex)),text('small',ex.seconds/60+' minutes · download files before starting'));container.append(card);});}
 if(session&&!session.guided&&!session.finished){const old=document.querySelector('.return-session');if(old)old.remove();const b=btn('Resume exam: '+session.title,()=>renderSession(),'secondary-button return-session');el('home').prepend(b);}
}
function newExam(ex){
 if(session&&!session.guided&&!session.finished&&session.deadline){renderSession();el('examInstructions').textContent='You have an exam in progress. Finish it before starting another.';return;}
 session={attempt:String(Date.now()),id:ex.id,title:ex.title,ids:ex.ids,seconds:ex.seconds,remaining:ex.seconds,deadline:null,index:0,answers:{},done:{},finished:false,guided:false};store();renderSession();
}
function single(id){if(session&&!session.guided&&!session.finished&&session.deadline){renderSession();el('examInstructions').textContent='Finish your current exam before opening guided practice with worked solutions.';return;}session={id:'single',title:'Guided practice',ids:[id],index:0,answers:{},done:{},finished:false,guided:true};store();renderSession();}
function renderBank(){
 const subject=el('subjectFilter').value,search=el('questionSearch').value.toLowerCase().trim();const qs=bank.filter(q=>(subject==='all'||q.kind===subject)&&(!search||(q.id+' '+q.title+' '+q.category+' '+q.prompt).toLowerCase().includes(search)));el('bankCount').textContent=qs.length+' QUESTIONS';el('bankList').replaceChildren();for(const q of qs){const b=btn('',()=>single(q.id),'bank-item');const label=document.createElement('span');label.append(text('strong',q.title),text('small',q.kind+' · '+q.category+(q.dataset?' · interactive lab':' · '+(q.kind==='Regression'?'model output':'source file'))));b.append(text('span',q.id.toUpperCase(),'item-code'),label,text('span','↗','arrow'));el('bankList').append(b);}if(!qs.length)el('bankList').append(text('p','No matching questions. Try a different search term.'));
}
function downloadLinks(container,files){container.replaceChildren();for(const file of [...new Set(files)]){const a=text('a',file.split('/').pop()+' ↓');a.href=file;a.download='';container.append(a);}}
function filesFor(q){return q.files||[catalog.datasets[q.dataset].file];}
function allFiles(){return [...new Set(session.ids.flatMap(id=>filesFor(byId[id])))];}
function renderModel(q){
 const out=el('regressionOutput');out.replaceChildren();out.hidden=!q.model;if(!q.model)return;
 const m=practice.models[q.model],card=text('section','','model-card');card.append(text('header','OLS from the restaurant case · n = '+m.n+' · R² = '+m.r2.toFixed(4)+' · conventional OLS standard errors'));
 const formula=q.model==='temperature'?'Predicted sales = b₀ + b₁ × tmax':'Predicted sales = b₀ + b₁ × L + b₂ × G + b₃ × L × G';card.append(text('div',formula,'model-formula'));
 const table=document.createElement('table'),caption=text('caption','Model coefficients fitted to the supplied restaurant data');caption.className='sr-only';table.append(caption);const head=document.createElement('thead'),tr=document.createElement('tr');['Term','Estimate','Standard error','p-value'].forEach(x=>tr.append(text('th',x)));head.append(tr);table.append(head);const body=document.createElement('tbody');m.coefficients.forEach(c=>{const row=document.createElement('tr');[c.term,nf.format(c.estimate),nf.format(c.standardError),c.pValue<.0001?c.pValue.toExponential(3):c.pValue.toFixed(6)].forEach(x=>row.append(text('td',x)));body.append(row);});table.append(body);card.append(table);out.append(card);
 out.append(text('p',q.model==='temperature'?'Sales is daily sales in dollars. tmax is the daily high temperature in °F. The observed range is 28.94–104 °F.':'L is total sales 364 days earlier. G is 1 on game days and 0 otherwise. The interaction is L × G. Of the 312 observed sales dates, 13 were game days.','model-description'));
}
function renderQuestion(){
 const q=byId[session.ids[session.index]],lock=locked();el('questionLabel').textContent=(session.index+1)+' / '+session.ids.length+' · '+q.kind.toUpperCase();el('questionCategory').textContent=q.category;el('questionTitle').textContent=q.title;el('questionPrompt').textContent=q.prompt;downloadLinks(el('questionFiles'),filesFor(q));renderModel(q);
 el('questionNav').replaceChildren();session.ids.forEach((id,i)=>{const b=btn(String(i+1).padStart(2,'0')+' · '+byId[id].kind,()=>{session.index=i;store();renderQuestion();},(i===session.index?'active ':'')+(session.done[id]?'completed':''));b.setAttribute('aria-current',i===session.index?'step':'false');el('questionNav').append(b);});
 const area=el('responseArea');area.replaceChildren();
 if(q.dataset){
  const frame=document.createElement('iframe');frame.title='Interactive workspace: '+q.title;frame.className='lab-frame';frame.src='index.html?embed=1&dataset='+encodeURIComponent(q.dataset)+'&exercise='+encodeURIComponent(q.id)+'&attempt='+encodeURIComponent(session.attempt||'guided')+(lock?'&exam=1':'');area.append(frame);
 }else{
  const label=text('label','YOUR METHOD AND EXPLANATION','response-label');label.htmlFor='writtenAnswer';const answer=document.createElement('textarea');answer.id='writtenAnswer';answer.className='scratch-answer';answer.placeholder='Write your calculation, method or interpretation here…';answer.value=session.answers[q.id]||'';answer.oninput=()=>{session.answers[q.id]=answer.value;store();};area.append(label,answer);
  if(q.expected!==null&&q.expected!==undefined&&!lock){const wrap=text('div','','numeric-check'),label=text('label','Check your numeric result','response-label');label.htmlFor='numericAnswer';const inp=document.createElement('input');inp.type='text';inp.inputMode='decimal';inp.id='numericAnswer';inp.className='numeric-answer';inp.placeholder=q.id==='r5'?'E.g. 0.630334':'E.g. 3255.87';const result=text('span','','numeric-feedback');result.setAttribute('role','status');const button=btn('Check number',()=>{const val=Number(inp.value.trim().replace(',','.'));if(!inp.value.trim()||!Number.isFinite(val)){result.textContent='Enter a number without a thousands separator.';return;}const tolerance=q.id==='r5'?0.000001:0.011;result.textContent=Math.abs(val-q.expected)<=tolerance?'✓ The number is correct. Use the criteria below to review your explanation.':'The result differs. Check the model and the inputs requested in the question.';},'secondary-button');wrap.append(label,inp,button,result);area.append(wrap);}
 }
 el('answerDetails').hidden=lock;el('answerDetails').open=false;el('questionHint').hidden=true;el('questionHint').textContent=q.hint||'Check the data, method and units.';el('showQuestionHint').hidden=lock;el('questionAnswer').textContent=q.answer;el('answerChecks').replaceChildren();(q.checks||['Check the output values and rows','Explain why your method works','Use the specified dataset']).forEach(x=>el('answerChecks').append(text('li',x)));el('doneCheckbox').checked=!!session.done[q.id];el('doneCheckbox').onchange=()=>{session.done[q.id]=el('doneCheckbox').checked;store();renderNavMarks();};
 el('nextQuestion').textContent=session.index<session.ids.length-1?'Next question →':'First question ↺';
 if(lock&&!q.dataset)area.append(text('p','You can see hints, worked solutions and review criteria after finishing the exam.','locked-note'));
}
function renderNavMarks(){Array.from(el('questionNav').children).forEach((b,i)=>b.classList.toggle('completed',!!session.done[session.ids[i]]));}
function renderSession(){
 show('session');el('sessionTitle').textContent=session.guided?byId[session.ids[0]].title:session.id+' · '+session.title;el('sessionMode').textContent=session.guided?'GUIDED PRACTICE':'TIMED PRACTICE EXAM';el('sessionStatus').textContent=session.guided?'Hints and worked solutions available':session.finished?'Review':session.deadline?'Exam in progress':'Ready to start';el('timerPanel').hidden=session.guided;
 el('examInstructions').replaceChildren(text('div',session.guided?'Try the question first, then use the hints, worked solution and review criteria to check your work.':'This exam has '+session.ids.length+' questions. Use the lab for SQL and supported Excel formulas, or use the downloads to work in your own tools. The review lists the questions you marked as attempted.'));
 if(!session.guided){const links=text('div','','file-links');downloadLinks(links,allFiles());el('examInstructions').append(links);}
 el('reviewSummary').hidden=!session.finished;el('reviewSummary').replaceChildren();if(session.finished){const n=session.ids.filter(id=>session.done[id]).length;el('reviewSummary').append(text('h2','Review your exam'),text('p','You marked '+n+' of '+session.ids.length+' questions as attempted. Compare your work with the worked solutions and try your queries and formulas again.'),text('p',session.expired?'Time is up. Worked solutions and result checks are available.':'You finished the exam. Worked solutions and result checks are available.'),btn('Back to question bank',()=>show('bank'),'secondary-button'));}
 renderQuestion();updateTimer();
}
function updateTimer(){if(!session||session.guided)return;const n=remaining();el('timer').textContent=displayTime(n);el('startTimer').disabled=!!session.deadline||session.finished;el('startTimer').textContent=session.started?'Resume ▶':'Start exam ▶';el('pauseTimer').disabled=!session.deadline||session.finished;el('finishExam').disabled=session.finished;el('timerPanel').classList.toggle('expired',!!session.expired);if(session.deadline&&n===0){finish(true);}}
function finish(expired=false){if(!session||session.guided||session.finished)return;session.remaining=remaining();session.deadline=null;session.finished=true;session.expired=expired;store();renderSession();}
async function init(){
 try{
  const [c,p]=await Promise.all([fetch('assets/catalog.json'),fetch('assets/practice.json')]);if(!c.ok||!p.ok)throw Error();catalog=await c.json();practice=await p.json();
  for(const [dataset,qs] of Object.entries(catalog.exercises)){for(const q of qs)bank.push({...q,dataset,kind:catalog.datasets[dataset].schema?'SQL':'Excel',category:catalog.datasets[dataset].name,prompt:q.desc,answer:q.answer+'\n\n'+q.explain});}
  bank.push(...practice.questions);byId=Object.fromEntries(bank.map(q=>[q.id,q]));for(const ex of examSets)if(ex.ids.some(id=>!byId[id]))throw Error('Unknown exam question.');
  el('questionCount').textContent=bank.length;el('modelMethod').textContent=practice.modelMethod;
  for(const m of practice.materials){const a=text('a','','material-card');a.href=m.file;a.download='';a.append(text('strong',m.title+' ↓'),text('small',m.note),text('small','Source: '+m.origin));el('materialList').append(a);}
  try{const old=JSON.parse(localStorage.getItem('accountingLab.exam.v1')||'null');if(old&&old.ids?.every(id=>byId[id])&&old.index>=0&&old.index<old.ids.length){
   const exam=examSets.find(set=>set.id===old.id);
   if(exam)old.title=exam.title;
   session=old;
  }}catch{}
  renderCards();el('loading').hidden=true;const params=new URLSearchParams(location.search);if(byId[params.get('question')])single(params.get('question'));else show(params.get('view')==='materials'?'materials':params.get('view')==='bank'?'bank':'home');
  if(session?.deadline&&remaining()===0)finish(true);
  setInterval(updateTimer,1000);
 }catch(error){el('loading').textContent='Could not load the practice content. Reload the page to try again.';console.error(error);}
}
el('examsTab').onclick=()=>{renderCards();show('home');};el('bankTab').onclick=()=>show('bank');el('materialsTab').onclick=()=>show('materials');el('subjectFilter').onchange=renderBank;el('questionSearch').oninput=renderBank;
el('startTimer').onclick=()=>{if(!session||session.finished)return;session.started=true;session.deadline=Date.now()+session.remaining*1000;store();el('sessionStatus').textContent='Exam in progress';updateTimer();};el('pauseTimer').onclick=()=>{session.remaining=remaining();session.deadline=null;store();el('sessionStatus').textContent='Pause';updateTimer();};el('finishExam').onclick=()=>finish();el('backButton').onclick=()=>{renderCards();show('home');};el('showQuestionHint').onclick=()=>{el('questionHint').hidden=!el('questionHint').hidden;};el('nextQuestion').onclick=()=>{session.index=(session.index+1)%session.ids.length;store();renderQuestion();};
init();
