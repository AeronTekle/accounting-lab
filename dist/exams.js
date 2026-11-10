'use strict';
const el=id=>document.getElementById(id);
const sections=['home','bank','materials','session'];
let catalog,practice,bank=[],byId={},session=null,bankPage=1;
const bankPageSize=12;
const nf=new Intl.NumberFormat('en-US',{maximumFractionDigits:6});
const examSets=[
 {id:'M01',title:'Employee Codes and Songs',type:'manipulation',seconds:480,ids:['e1','e2','e3','s2','s3'],desc:'Extract text, apply conditions and join related data.'},
 {id:'M02',title:'Payroll and Invoices',type:'manipulation',seconds:480,ids:['p1','p2','p3','c1','c2'],desc:'Calculate gross pay, weighted rates and totals.'},
 {id:'M03',title:'Film Permits and Filters',type:'manipulation',seconds:480,ids:['f1','f2','f3','s1','s2'],desc:'Import data, work with dates and apply filters.'},
 {id:'M04',title:'Data Quality and Movies',type:'manipulation',seconds:480,ids:['t1','j1','j2','m1','m2'],desc:'Practise ETL, journal data, joins and averages.'},
 {id:'M05',title:'Payroll and Audit Flags',type:'manipulation',seconds:480,ids:['i1','i2','p3','a1','a2'],desc:'Compare payroll systems, inspect missing data and review purchasing cards.'},
 {id:'M06',title:'Employee Codes and Actors',type:'manipulation',seconds:480,ids:['e2','e3','m1','m2','m3'],desc:'Extract parts of variable-length codes and query related tables.'},
 {id:'M07',title:'Song Rankings and Artist Counts',type:'manipulation',seconds:480,ids:['s4','s5','s6','e5','e6'],desc:'Rank songs, summarise artists and work with employee text fields.'},
 {id:'M08',title:'Invoice Analysis',type:'manipulation',seconds:480,ids:['c2','c4','c5','c6','e4'],desc:'Summarise invoices by customer and country, and work with variable-length codes.'},
 {id:'M09',title:'Payroll Review',type:'manipulation',seconds:480,ids:['p4','p5','p6','i2','a4'],desc:'Analyse overtime and identify payroll and card transactions for review.'},
 {id:'M10',title:'Film Ratings and Credits',type:'manipulation',seconds:480,ids:['m4','m5','m6','f2','f3'],desc:'Filter and rank films, trace director credits and analyse permit records.'},
 {id:'M11',title:'Purchasing Card Review',type:'manipulation',seconds:480,ids:['a4','a5','a6','j1','j2'],desc:'Find credits, summarise spend, flag repeated charges and preserve an audit trail.'},
 {id:'M12',title:'Accounting Analytics Review',type:'manipulation',seconds:480,ids:['c3','a3','p6','a6','t1'],desc:'Rank results, flag exceptions and identify data quality issues.'},
 {id:'M13',title:'Songs Before Joins',type:'manipulation',seconds:480,ids:['s7','s8','s9','s2','s10'],desc:'Select song fields, sort, filter and calculate an average.'},
 {id:'M14',title:'Artists and Employee Codes',type:'manipulation',seconds:480,ids:['s3','s11','s12','e4','t2'],desc:'Join songs to artists, search titles and build a location and plant key.'},
 {id:'M15',title:'Movie Lookup and Sorting',type:'manipulation',seconds:480,ids:['m1','m7','m8','m9','m10'],desc:'Find people and films, filter ratings and sort a film series.'},
 {id:'M16',title:'Movie Relationships',type:'manipulation',seconds:480,ids:['m11','m12','m13','m14','m15'],desc:'Join ratings, directors and actors, then compare groups of films.'},
 {id:'M17',title:'Film Permits and Co-Stars',type:'manipulation',seconds:480,ids:['f4','f5','f6','m16','m3'],desc:'Find missing permit data and trace performers through shared films.'},
 {id:'M18',title:'Payroll Rates and Monthly Estimates',type:'manipulation',seconds:480,ids:['i1','i2','i3','i4','p3'],desc:'Compare payroll extracts, calculate weighted rates and estimate January pay.'},
 {id:'R01',title:'Temperature and Sales',type:'regression',seconds:300,ids:['r1','r2','r3','r6'],desc:'Interpret coefficients and p-values, make predictions and identify forecast inputs.'},
 {id:'R02',title:'Sales on Game Days',type:'regression',seconds:300,ids:['r4','r5','r3','r6'],desc:'Interpret interactions, reference groups and uncertainty.'},
 {id:'R03',title:'Explain the Model',type:'regression',seconds:300,ids:['r1','r3','r4','r5'],desc:'Calculate and interpret model results.'},
 {id:'R04',title:'Temperature Predictions and Limits',type:'regression',seconds:300,ids:['r1','r7','r9','r12'],desc:'Compare predictions, identify extrapolation and plan a fair forecast test.'},
 {id:'R05',title:'Game-Day Effects and Predictions',type:'regression',seconds:300,ids:['r8','r10','r11','r4'],desc:'Interpret the interaction and predict sales under two game-day scenarios.'},
 {id:'R06',title:'Forecasting and Model Comparison',type:'regression',seconds:300,ids:['r3','r6','r8','r12'],desc:'Evaluate model evidence and explain how to test a forecast over time.'},
 {id:'R07',title:'Prior-Sales Forecast and Temperature',type:'regression',seconds:300,ids:['r13','r14','r6','r12'],desc:'Produce a seven-day forecast, interpret curvature and plan a forecast test.'},
 {id:'R08',title:'Game Days and Home-Game Effects',type:'regression',seconds:300,ids:['r15','r16','r8','r11'],desc:'Compare game-day sales and interpret the slope for home games.'}
];
const store=()=>{try{localStorage.setItem('accountingLab.exam.v1',JSON.stringify(session));}catch{}};
function text(tag,content,cls){const x=document.createElement(tag);x.textContent=content;if(cls)x.className=cls;return x;}
function btn(label,action,cls='primary-button'){const b=text('button',label,cls);b.onclick=action;return b;}
function show(id){
 for(const section of sections)el(section).hidden=section!==id;
 for(const [name,view] of [['examsTab','home'],['bankTab','bank'],['materialsTab','materials']]){
  el(name).classList.toggle('active',id===view);
  if(id===view)el(name).setAttribute('aria-current','page');else el(name).removeAttribute('aria-current');
 }
 if(id==='bank')renderBank();
}
function openBank(){
 show('bank');
 el('bankHeading').focus();
}
function showExamGroup(group){
 for(const name of ['manipulation','regression']){
  const selected=name===group;
  el(name+'Cards').hidden=!selected;
  el(name+'Filter').setAttribute('aria-pressed',String(selected));
 }
}
function remaining(){return session?.deadline?Math.max(0,Math.ceil((session.deadline-Date.now())/1000)):session?.remaining||0;}
function displayTime(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function locked(){return session&&!session.guided&&!session.finished;}
function currentPart(){return session.parts?.[session.partIndex];}
function activeQuestionIds(){return locked()&&currentPart()?currentPart().ids:session.ids;}
function moveToQuestion(id){
 session.index=session.ids.indexOf(id);
 store();
 renderQuestion();
}
function protectAttempt(message){
 if(!locked()||!(session.started||session.partIndex>0))return false;
 renderSession();
 el('examInstructions').prepend(text('p',message,'attempt-message'));
 el('sessionTitle').focus();
 return true;
}
function renderCards(){
 for(const group of ['manipulation','regression']){
  const container=el(group+'Cards');
  const sets=examSets.filter(ex=>ex.type===group);
  const label=group==='manipulation'?'Data manipulation':'Regression';
  el(group+'Filter').textContent=label+' ('+sets.length+')';
  container.replaceChildren();
  for(const ex of sets){
   const card=text('article','','exam-card');
   const open=btn('Open exam ↗',()=>newExam(ex),'secondary-button');
   open.setAttribute('aria-label','Open exam '+ex.id+' '+ex.title);
   card.append(text('span',ex.id+' · '+ex.seconds/60+' min · '+ex.ids.length+' questions','exam-meta'),text('h3',ex.title),text('p',ex.desc),open);
   container.append(card);
  }
 }
 document.querySelector('.return-session')?.remove();
 if(session&&!session.guided&&!session.finished){
  el('home').prepend(btn((session.started||session.partIndex>0?'Resume: ':'Open: ')+session.title,()=>{
   renderSession();
   el('sessionTitle').focus();
  },'secondary-button return-session'));
 }
}
function newExam(ex){
 if(protectAttempt('Resume or finish your current attempt before opening another exam.'))return;
 session={attempt:String(Date.now()),id:ex.id,title:ex.title,ids:ex.ids,remaining:ex.seconds,deadline:null,index:0,answers:{},done:{},finished:false,guided:false};
 store();
 renderSession();
 el('sessionTitle').focus();
}
function newMock(){
 if(protectAttempt('Resume or finish your current attempt before opening another exam.'))return;
 const parts=['manipulation','regression'].map(type=>{
  const sets=examSets.filter(ex=>ex.type===type);
  const {id,title,ids,seconds}=sets[Math.floor(Math.random()*sets.length)];
  return {id,title,ids,seconds};
 });
 session={attempt:String(Date.now()),id:'mock',title:'Full mock exam',parts,partIndex:0,ids:parts.flatMap(part=>part.ids),remaining:parts[0].seconds,deadline:null,index:0,answers:{},done:{},finished:false,guided:false};
 store();
 renderSession();
 el('sessionTitle').focus();
}
function single(id){
 if(protectAttempt('Resume or finish your current attempt before opening guided practice.'))return;
 session={id:'single',title:'Guided practice',ids:[id],index:0,answers:{},done:{},finished:false,guided:true};
 store();
 renderSession();
}
function renderBank(){
 const subject=el('subjectFilter').value;
 const subjectQuestions=bank.filter(q=>subject==='all'||q.kind===subject);
 const caseFilter=el('caseFilter');
 const selectedCase=caseFilter.value;
 const cases=[...new Set(subjectQuestions.map(q=>q.category))].sort((a,b)=>a.localeCompare(b));
 caseFilter.replaceChildren(new Option('All cases','all'),...cases.map(name=>new Option(name,name)));
 caseFilter.value=cases.includes(selectedCase)?selectedCase:'all';
 const terms=el('questionSearch').value.toLowerCase().trim().split(/\s+/).filter(Boolean);
 const matches=subjectQuestions.filter(q=>{
  const searchable=[q.id,q.title,q.category,q.kind,q.skill,q.prompt].join(' ').toLowerCase();
  return (caseFilter.value==='all'||caseFilter.value===q.category)&&terms.every(term=>searchable.includes(term));
 });
 const pages=Math.max(1,Math.ceil(matches.length/bankPageSize));
 bankPage=Math.min(bankPage,pages);
 const start=(bankPage-1)*bankPageSize;
 const visible=matches.slice(start,start+bankPageSize);
 el('bankCount').textContent=matches.length?'Showing '+(start+1)+'–'+(start+visible.length)+' of '+matches.length+' questions':'No matching questions';
 el('bankPages').hidden=pages===1;
 el('bankPageLabel').textContent='Page '+bankPage+' of '+pages;
 el('prevBankPage').disabled=bankPage===1;
 el('nextBankPage').disabled=bankPage===pages;
 const list=el('bankList');
 list.replaceChildren();
 for(const q of visible){
  const button=btn('',()=>{single(q.id);el('sessionTitle').focus();},'bank-item');
  const label=text('span','','bank-item-label');
  const mode=q.dataset?'Interactive lab':q.kind==='Regression'?'Model output':'Workbook';
  label.append(text('strong',q.title),text('small',q.category+' · '+mode));
  button.append(text('span',q.kind,'item-code'),label,text('span','↗','arrow'));
  list.append(button);
 }
 if(!matches.length)list.append(text('p','Try a different search term or clear the filters.'));
}
function resetBankPage(){
 bankPage=1;
 renderBank();
}
function downloadLinks(container,files){container.replaceChildren();for(const file of [...new Set(files)]){const a=text('a',file.split('/').pop()+' ↓');a.href=file;a.download='';container.append(a);}}
function filesFor(q){
 if(q.files)return q.files;
 const dataset=catalog.datasets[q.dataset];
 return [dataset.download||dataset.file];
}
function allFiles(){return [...new Set(session.ids.flatMap(id=>filesFor(byId[id])))];}
const modelViews={
 temperature:['b₀ + b₁ × tmax','Sales is daily sales in dollars. tmax is the daily high temperature in °F. The observed range is 28.94–104 °F.'],
 interaction:['b₀ + b₁ × L + b₂ × G + b₃ × L × G','L is sales 364 days earlier. G is 1 on game days and 0 otherwise. Of the 312 observed sales dates, 13 were game days.'],
 lagged:['b₀ + b₁ × Sales₇ + b₂ × Sales₂₈ + b₃ × Sales₃₆₄','Each Sales term is the daily sales amount at its indicated lag, measured in dollars.'],
 quadratic:['b₀ + b₁ × tmax + b₂ × tmax²','The fitted slope varies with tmax, which is measured in °F. The observed range is 28.94–104 °F.'],
 game:['b₀ + b₁ × G','G is 1 on any game day and 0 on non-game days. The model compares the two groups without other predictors.'],
 home:['b₀ + b₁ × L + b₂ × H + b₃ × L × H','L is sales 364 days earlier. H is 1 on home-game days and 0 on all other days.']
};
function renderModel(q){
 const out=el('regressionOutput');out.replaceChildren();out.hidden=!q.model;if(!q.model)return;
 const m=practice.models[q.model],card=text('section','','model-card');card.append(text('header','OLS from the restaurant case · n = '+m.n+' · R² = '+m.r2.toFixed(4)+' · conventional OLS standard errors'));
 const [formula,description]=modelViews[q.model];
 card.append(text('div','Predicted sales = '+formula,'model-formula'));
 const table=document.createElement('table'),caption=text('caption','Model coefficients fitted to the supplied restaurant data');caption.className='sr-only';table.append(caption);const head=document.createElement('thead'),tr=document.createElement('tr');['Term','Estimate','Standard error','p-value'].forEach(x=>tr.append(text('th',x)));head.append(tr);table.append(head);const body=document.createElement('tbody');m.coefficients.forEach(c=>{const row=document.createElement('tr');[c.term,nf.format(c.estimate),nf.format(c.standardError),c.pValue<.0001?c.pValue.toExponential(3):c.pValue.toFixed(6)].forEach(x=>row.append(text('td',x)));body.append(row);});table.append(body);card.append(table);out.append(card);
 out.append(text('p',description,'model-description'));
}
function renderQuestion(){
 const questionId=session.ids[session.index];
 const q=byId[questionId],lock=locked(),activeIds=activeQuestionIds(),position=activeIds.indexOf(questionId);
 el('questionLabel').textContent=(position+1)+' / '+activeIds.length+' · '+q.kind.toUpperCase();el('questionCategory').textContent=q.category;el('questionTitle').textContent=q.title;el('questionPrompt').textContent=q.prompt;downloadLinks(el('questionFiles'),filesFor(q));renderModel(q);
 el('questionNav').replaceChildren();
 activeIds.forEach((id,i)=>{
  const selected=id===questionId;
  const button=btn(String(i+1).padStart(2,'0')+' · '+byId[id].kind,()=>moveToQuestion(id),(selected?'active ':'')+(session.done[id]?'completed':''));
  if(selected)button.setAttribute('aria-current','step');
  el('questionNav').append(button);
 });
 const area=el('responseArea');area.replaceChildren();
 if(q.dataset){
  const frame=document.createElement('iframe');frame.title='Interactive workspace: '+q.title;frame.className='lab-frame';frame.src='index.html?v=exam-downloads-1&embed=1&dataset='+encodeURIComponent(q.dataset)+'&exercise='+encodeURIComponent(q.id)+'&attempt='+encodeURIComponent(session.attempt||'guided')+(lock?'&exam=1':'');area.append(frame);
 }else{
  const label=text('label','YOUR METHOD AND EXPLANATION','response-label');label.htmlFor='writtenAnswer';const answer=document.createElement('textarea');answer.id='writtenAnswer';answer.className='scratch-answer';answer.placeholder='Write your calculation, method or interpretation here…';answer.value=session.answers[q.id]||'';answer.oninput=()=>{session.answers[q.id]=answer.value;store();};area.append(label,answer);
  if(q.expected!==null&&q.expected!==undefined&&!lock){const wrap=text('div','','numeric-check'),label=text('label','Check your numeric result','response-label');label.htmlFor='numericAnswer';const inp=document.createElement('input');inp.type='text';inp.inputMode='decimal';inp.id='numericAnswer';inp.className='numeric-answer';inp.placeholder='Enter your result';const result=text('span','','numeric-feedback');result.setAttribute('role','status');const button=btn('Check number',()=>{const val=Number(inp.value.trim().replace(',','.'));if(!inp.value.trim()||!Number.isFinite(val)){result.textContent='Enter a number without a thousands separator.';return;}const tolerance=q.id==='r5'?0.000001:q.id==='r16'?0.000051:0.011;result.textContent=Math.abs(val-q.expected)<=tolerance?'✓ The number is correct. Use the criteria below to review your explanation.':'The result differs. Check the model and the inputs requested in the question.';},'secondary-button');wrap.append(label,inp,button,result);area.append(wrap);}
 }
 el('answerDetails').hidden=lock;el('answerDetails').open=false;el('questionHint').hidden=true;el('questionHint').textContent=q.hint||'Check the data, method and units.';el('showQuestionHint').hidden=lock;el('questionAnswer').textContent=q.answer;el('answerChecks').replaceChildren();(q.checks||['Check the output values and rows','Explain why your method works','Use the specified dataset']).forEach(x=>el('answerChecks').append(text('li',x)));el('doneCheckbox').checked=!!session.done[q.id];el('doneCheckbox').onchange=()=>{session.done[q.id]=el('doneCheckbox').checked;store();renderNavMarks();};
 el('nextQuestion').textContent=position<activeIds.length-1?'Next question →':'First question ↺';
 if(lock&&!q.dataset)area.append(text('p','You can see hints, worked solutions and review criteria after finishing the exam.','locked-note'));
}
function renderNavMarks(){
 const ids=activeQuestionIds();
 Array.from(el('questionNav').children).forEach((button,i)=>button.classList.toggle('completed',!!session.done[ids[i]]));
}
const mockSectionNames=['Data manipulation','Data interpretation'];
function renderMockProgress(){
 const progress=el('mockProgress');
 progress.hidden=!session.parts;
 progress.replaceChildren();
 if(!session.parts)return;
 session.parts.forEach((part,i)=>{
  const current=!session.finished&&session.partIndex===i;
  const item=text('li','','mock-step');
  if(current)item.setAttribute('aria-current','step');
  const status=part.expired?'Time expired':part.expired===false?'Finished':current?'Current section':'Up next';
  item.append(text('strong',(i+1)+'. '+mockSectionNames[i]),text('span',part.seconds/60+' min · '+status));
  progress.append(item);
 });
}
function renderReview(){
 const panel=el('reviewSummary');
 panel.hidden=!session.finished;
 panel.replaceChildren();
 if(!session.finished)return;
 const heading=text('h2',session.parts?'Review your full mock exam':'Review your exam');
 heading.id='reviewHeading';
 heading.tabIndex=-1;
 panel.append(heading,text('p','Open a question below to compare your work with its worked solution. The attempted count reflects the questions you marked.'));
 const groups=session.parts||[{ids:session.ids,title:session.title,expired:session.expired}];
 groups.forEach((part,i)=>{
  const group=text('div','','review-section');
  const attempted=part.ids.filter(id=>session.done[id]).length;
  const title=session.parts?mockSectionNames[i]+' · '+part.title:part.title;
  group.append(text('h3',title),text('p',attempted+' of '+part.ids.length+' marked as attempted. '+(part.expired?'Time expired.':'Section finished.')));
  const questions=text('ol','','review-questions');
  part.ids.forEach(id=>{
   const item=text('li','','');
   const open=btn(byId[id].title,()=>{moveToQuestion(id);el('questionTitle').focus();},'text-button');
   item.append(open);
   questions.append(item);
  });
  group.append(questions);
  panel.append(group);
 });
}
function renderSession(){
 show('session');
 const part=currentPart();
 const waiting=Boolean(part&&!session.deadline&&!session.finished);
 el('backButton').textContent=session.guided?'← Back to question bank':'← Back to practice exams';
 el('sessionTitle').textContent=session.guided?byId[session.ids[0]].title:session.parts?session.title:session.id+' · '+session.title;
 el('sessionMode').textContent=session.guided?'GUIDED PRACTICE':session.parts?'FULL MOCK EXAM':'TIMED PRACTICE EXAM';
 el('sessionStatus').textContent=session.guided?'Hints and worked solutions available':session.finished?'Review':session.deadline?'Exam in progress':session.started?'Paused':'Ready to start';
 el('timerPanel').hidden=session.guided||Boolean(session.parts&&session.finished);
 const instructions=session.guided?'Try the question first, then use the hints, worked solution and review criteria to check your work.':session.parts?(session.finished?'Both sections are complete. Use the review below to revisit your work.':'Section '+(session.partIndex+1)+' of 2 · '+part.id+' '+part.title+'. Download the files below before starting. Hints and solutions open after both sections.'):'This exam has '+session.ids.length+' questions. Use the lab for SQL and supported Excel formulas, or download the files to work in your own tools.';
 el('examInstructions').replaceChildren(text('div',instructions));
 if(!session.guided){
  const links=text('div','','file-links');
  const files=allFiles();
  downloadLinks(links,files);
  el('examInstructions').append(links);
  if(files.some(file=>file.startsWith('assets/')&&file.endsWith('.csv'))){
   el('examInstructions').append(text('div','For the practice CSVs, open Data → From Text/CSV in Excel and select Semicolon. The headers and column order match the lab.'));
  }
 }
 renderMockProgress();
 renderReview();
 el('questionNav').hidden=waiting;
 el('questionSheet').hidden=waiting;
 if(waiting)el('responseArea').replaceChildren();else renderQuestion();
 updateTimer();
}
function updateTimer(){
 if(!session||session.guided)return;
 const n=remaining();
 el('timer').textContent=displayTime(n);
 el('startTimer').disabled=Boolean(session.deadline)||session.finished;
 el('startTimer').textContent=session.started?'Resume ▶':session.parts?'Start Section '+(session.partIndex+1)+' ▶':'Start exam ▶';
 el('pauseTimer').disabled=!session.deadline||session.finished;
 el('finishExam').disabled=session.finished||Boolean(session.parts&&!session.started);
 el('finishExam').textContent=session.parts&&session.partIndex===0?'Finish section':'Finish and review';
 el('timerPanel').classList.toggle('expired',Boolean(session.expired));
 if(session.deadline&&n===0)finish(true);
}
function startTimer(){
 if(!locked()||session.deadline)return;
 session.started=true;
 session.deadline=Date.now()+session.remaining*1000;
 store();
 if(session.parts)renderSession();else{
  el('sessionStatus').textContent='Exam in progress';
  updateTimer();
 }
}
function pauseTimer(){
 if(!locked()||!session.deadline)return;
 const time=remaining();
 if(time===0){finish(true);return;}
 session.remaining=time;
 session.deadline=null;
 store();
 if(session.parts)renderSession();else{
  el('sessionStatus').textContent='Paused';
  updateTimer();
 }
}
function finish(expired=false){
 if(!locked())return;
 session.remaining=remaining();
 expired=expired||Boolean(session.deadline&&session.remaining===0);
 session.deadline=null;
 const part=currentPart();
 if(part)part.expired=expired;
 if(part&&session.partIndex===0){
  session.partIndex=1;
  const next=currentPart();
  session.index=session.ids.indexOf(next.ids[0]);
  session.remaining=next.seconds;
  session.started=false;
 }else{
  session.finished=true;
  session.expired=expired;
 }
 store();
 renderSession();
 el(session.finished?'reviewHeading':'sessionTitle').focus();
}
async function init(){
 try{
  const [c,p]=await Promise.all([fetch('assets/catalog.json?v=exam-downloads-1'),fetch('assets/practice.json?v=practice-82')]);if(!c.ok||!p.ok)throw Error();catalog=await c.json();practice=await p.json();
  for(const [dataset,qs] of Object.entries(catalog.exercises)){for(const q of qs)bank.push({...q,dataset,kind:catalog.datasets[dataset].schema?'SQL':'Excel',category:catalog.datasets[dataset].name,prompt:q.desc,answer:q.answer+'\n\n'+q.explain});}
  bank.push(...practice.questions);byId=Object.fromEntries(bank.map(q=>[q.id,q]));for(const ex of examSets)if(ex.ids.some(id=>!byId[id]))throw Error('Unknown exam question.');
  el('questionCount').textContent=bank.length;el('examCount').textContent=examSets.length;el('datasetCount').textContent=Object.keys(catalog.datasets).length;el('modelMethod').textContent=practice.modelMethod;
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
el('examsTab').onclick=()=>{renderCards();show('home');};
el('bankTab').onclick=openBank;
el('openQuestionBank').onclick=openBank;
el('openFullMock').onclick=newMock;
el('materialsTab').onclick=()=>show('materials');
for(const group of ['manipulation','regression'])el(group+'Filter').onclick=()=>showExamGroup(group);
el('subjectFilter').onchange=resetBankPage;
el('caseFilter').onchange=resetBankPage;
el('questionSearch').oninput=resetBankPage;
el('clearFilters').onclick=()=>{
 el('questionSearch').value='';
 el('subjectFilter').value='all';
 el('caseFilter').value='all';
 resetBankPage();
 el('questionSearch').focus();
};
for(const [id,step] of [['prevBankPage',-1],['nextBankPage',1]]){
 el(id).onclick=()=>{bankPage+=step;renderBank();el('bankList').querySelector('.bank-item')?.focus();};
}
el('startTimer').onclick=startTimer;
el('pauseTimer').onclick=pauseTimer;
el('finishExam').onclick=()=>finish();
el('backButton').onclick=()=>{
 if(session.guided){openBank();return;}
 renderCards();
 show('home');
 if(locked()&&(session.started||session.partIndex>0))document.querySelector('.return-session')?.focus();
 else el('examLibraryHeading').scrollIntoView();
};
el('showQuestionHint').onclick=()=>{el('questionHint').hidden=!el('questionHint').hidden;};
el('nextQuestion').onclick=()=>{
 const ids=activeQuestionIds();
 moveToQuestion(ids[(ids.indexOf(session.ids[session.index])+1)%ids.length]);
};
init();
