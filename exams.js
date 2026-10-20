'use strict';
const el=id=>document.getElementById(id);
const sections=['home','bank','materials','session'];
let catalog,practice,bank=[],byId={},session=null,section='home';
const nf=new Intl.NumberFormat('en-US',{maximumFractionDigits:6});
const examSets=[
 {id:'M01',title:'Koder og musik',type:'manipulation',seconds:480,ids:['e1','e2','e3','s2','s3'],desc:'Tekstudtræk, logiske krav og relationer.'},
 {id:'M02',title:'Løn og fakturaer',type:'manipulation',seconds:480,ids:['p1','p2','p3','c1','c2'],desc:'Bruttoløn, vægtede satser og summering.'},
 {id:'M03',title:'Filmoptagelser og filtre',type:'manipulation',seconds:480,ids:['f1','f2','f3','s1','s2'],desc:'Import, datatyper, datoer og filtrering.'},
 {id:'M04',title:'Datakvalitet og film',type:'manipulation',seconds:480,ids:['t1','j1','j2','m1','m2'],desc:'ETL, journaldata, joins og gennemsnit.'},
 {id:'M05',title:'Løn og revisionsflag',type:'manipulation',seconds:480,ids:['i1','i2','p3','a1','a2'],desc:'Systemskifte, manglende data og P-cards.'},
 {id:'M06',title:'Koder og skuespillere',type:'manipulation',seconds:480,ids:['e2','e3','m1','m2','m3'],desc:'Variable tekstkoder og relationelle forespørgsler.'},
 {id:'R01',title:'Temperatur og salg',type:'regression',seconds:300,ids:['r1','r2','r3','r6'],desc:'Forudsigelse, koefficienter, p-værdier og forecast-input.'},
 {id:'R02',title:'Kampdagens betydning',type:'regression',seconds:300,ids:['r4','r5','r3','r6'],desc:'Interaktioner, referencegrupper og usikkerhed.'},
 {id:'R03',title:'Forklar modellen',type:'regression',seconds:300,ids:['r1','r3','r4','r5'],desc:'Beregn, fortolk og forklar dine resultater.'}
];
const store=()=>{try{localStorage.setItem('accountingLab.exam.v1',JSON.stringify(session));}catch{}};
function text(tag,content,cls){const x=document.createElement(tag);x.textContent=content;if(cls)x.className=cls;return x;}
function btn(label,action,cls='primary-button'){const b=text('button',label,cls);b.onclick=action;return b;}
function show(id){section=id;for(const s of sections)el(s).hidden=s!==id;for(const [name,view] of [['examsTab','home'],['bankTab','bank'],['materialsTab','materials']])el(name).classList.toggle('active',id===view);if(id==='bank')renderBank();}
function remaining(){return session?.deadline?Math.max(0,Math.ceil((session.deadline-Date.now())/1000)):session?.remaining||0;}
function displayTime(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function locked(){return session&&!session.guided&&!session.finished;}
function renderCards(){
 for(const group of ['manipulation','regression']){const container=el(group==='manipulation'?'manipulationCards':'regressionCards');container.replaceChildren();examSets.filter(x=>x.type===group).forEach(ex=>{const card=text('article','','exam-card');card.append(text('span',ex.id+' · '+ex.ids.length+' SPØRGSMÅL','eyebrow'),text('h3',ex.title),text('p',ex.desc),btn('Åbn prøven ↗',()=>newExam(ex)),text('small',ex.seconds/60+' minutter · hent filer før start'));container.append(card);});}
 if(session&&!session.guided&&!session.finished){const old=document.querySelector('.return-session');if(old)old.remove();const b=btn('Fortsæt din åbne prøve: '+session.title,()=>renderSession(),'secondary-button return-session');el('home').prepend(b);}
}
function newExam(ex){
 if(session&&!session.guided&&!session.finished&&session.deadline){renderSession();el('examInstructions').textContent='Du har allerede en prøve i gang. Afslut den først, før du starter en ny.';return;}
 session={attempt:String(Date.now()),id:ex.id,title:ex.title,ids:ex.ids,seconds:ex.seconds,remaining:ex.seconds,deadline:null,index:0,answers:{},done:{},finished:false,guided:false};store();renderSession();
}
function single(id){if(session&&!session.guided&&!session.finished&&session.deadline){renderSession();el('examInstructions').textContent='Du har en prøve i gang. Afslut den, før du åbner guidet træning med facit.';return;}session={id:'single',title:'Guidet træning',ids:[id],index:0,answers:{},done:{},finished:false,guided:true};store();renderSession();}
function renderBank(){
 const subject=el('subjectFilter').value,search=el('questionSearch').value.toLowerCase().trim();const qs=bank.filter(q=>(subject==='all'||q.kind===subject)&&(!search||(q.id+' '+q.title+' '+q.category+' '+q.prompt).toLowerCase().includes(search)));el('bankCount').textContent=qs.length+' SPØRGSMÅL';el('bankList').replaceChildren();for(const q of qs){const b=btn('',()=>single(q.id),'bank-item');const label=document.createElement('span');label.append(text('strong',q.title),text('small',q.kind+' · '+q.category+(q.dataset?' · interaktivt lab':' · '+(q.kind==='Regression'?'modeloutput':'originalfil'))));b.append(text('span',q.id.toUpperCase(),'item-code'),label,text('span','↗','arrow'));el('bankList').append(b);}if(!qs.length)el('bankList').append(text('p','Ingen spørgsmål matcher. Prøv et andet søgeord.'));
}
function downloadLinks(container,files){container.replaceChildren();for(const file of [...new Set(files)]){const a=text('a',file.split('/').pop()+' ↓');a.href=file;a.download='';container.append(a);}}
function filesFor(q){return q.files||[catalog.datasets[q.dataset].file];}
function allFiles(){return [...new Set(session.ids.flatMap(id=>filesFor(byId[id])))];}
function renderModel(q){
 const out=el('regressionOutput');out.replaceChildren();out.hidden=!q.model;if(!q.model)return;
 const m=practice.models[q.model],card=text('section','','model-card');card.append(text('header','OLS fra restaurantcasen · n = '+m.n+' · R² = '+m.r2.toFixed(4)+' · sædvanlige OLS-standardfejl'));
 const formula=q.model==='temperature'?'Predicted sales = b₀ + b₁ × tmax':'Predicted sales = b₀ + b₁ × L + b₂ × G + b₃ × L × G';card.append(text('div',formula,'model-formula'));
 const table=document.createElement('table'),caption=text('caption','Modelkoefficienter beregnet fra de vedlagte restaurantdata');caption.className='sr-only';table.append(caption);const head=document.createElement('thead'),tr=document.createElement('tr');['Term','Estimate','Standard error','p-value'].forEach(x=>tr.append(text('th',x)));head.append(tr);table.append(head);const body=document.createElement('tbody');m.coefficients.forEach(c=>{const row=document.createElement('tr');[c.term,nf.format(c.estimate),nf.format(c.standardError),c.pValue<.0001?c.pValue.toExponential(3):c.pValue.toFixed(6)].forEach(x=>row.append(text('td',x)));body.append(row);});table.append(body);card.append(table);out.append(card);
 out.append(text('p',q.model==='temperature'?'Sales er dagligt salg i dollars. tmax er dagens maksimale temperatur i °F. Observeret tmax: 28,94–104 °F.':'L er samlet salg 364 dage tidligere. G=1 på kampdage og 0 ellers. Interaktionen er L×G. Der er 13 kampdage blandt de 312 observerede salgsdatoer.','model-description'));
}
function renderQuestion(){
 const q=byId[session.ids[session.index]],lock=locked();el('questionLabel').textContent=(session.index+1)+' / '+session.ids.length+' · '+q.kind.toUpperCase();el('questionCategory').textContent=q.category;el('questionTitle').textContent=q.title;el('questionPrompt').textContent=q.prompt;downloadLinks(el('questionFiles'),filesFor(q));renderModel(q);
 el('questionNav').replaceChildren();session.ids.forEach((id,i)=>{const b=btn(String(i+1).padStart(2,'0')+' · '+byId[id].kind,()=>{session.index=i;store();renderQuestion();},(i===session.index?'active ':'')+(session.done[id]?'completed':''));b.setAttribute('aria-current',i===session.index?'step':'false');el('questionNav').append(b);});
 const area=el('responseArea');area.replaceChildren();
 if(q.dataset){
  const frame=document.createElement('iframe');frame.title='Interaktivt arbejdsrum: '+q.title;frame.className='lab-frame';frame.src='index.html?embed=1&dataset='+encodeURIComponent(q.dataset)+'&exercise='+encodeURIComponent(q.id)+'&attempt='+encodeURIComponent(session.attempt||'guided')+(lock?'&exam=1':'');area.append(frame);
 }else{
  const label=text('label','DIN FREMGANGSMÅDE OG FORKLARING','response-label');label.htmlFor='writtenAnswer';const answer=document.createElement('textarea');answer.id='writtenAnswer';answer.className='scratch-answer';answer.placeholder='Skriv din beregning, metode eller fortolkning her…';answer.value=session.answers[q.id]||'';answer.oninput=()=>{session.answers[q.id]=answer.value;store();};area.append(label,answer);
  if(q.expected!==null&&q.expected!==undefined&&!lock){const wrap=text('div','','numeric-check'),label=text('label','Kontrollér den efterspurgte talværdi:','response-label');label.htmlFor='numericAnswer';const inp=document.createElement('input');inp.type='text';inp.inputMode='decimal';inp.id='numericAnswer';inp.className='numeric-answer';inp.placeholder=q.id==='r5'?'Fx 0.630334':'Fx 3255.87';const result=text('span','','numeric-feedback');result.setAttribute('role','status');const button=btn('Tjek talværdi',()=>{const val=Number(inp.value.trim().replace(',','.'));if(!inp.value.trim()||!Number.isFinite(val)){result.textContent='Indtast en talværdi uden tusindtalsseparator.';return;}const tolerance=q.id==='r5'?0.000001:0.011;result.textContent=Math.abs(val-q.expected)<=tolerance?'✓ Talværdien er korrekt. Vurder din forklaring med punkterne nedenfor.':'Ikke helt endnu. Kontrollér modellen og de efterspurgte input.';},'secondary-button');wrap.append(label,inp,button,result);area.append(wrap);}
 }
 el('answerDetails').hidden=lock;el('answerDetails').open=false;el('questionHint').hidden=true;el('questionHint').textContent=q.hint||'Kontrollér datagrundlag, metode og enheder.';el('showQuestionHint').hidden=lock;el('questionAnswer').textContent=q.answer;el('answerChecks').replaceChildren();(q.checks||['Kontrollér resultatets værdier og rækker','Forklar din metode; flere løsninger kan være korrekte','Brug det angivne datasæt']).forEach(x=>el('answerChecks').append(text('li',x)));el('doneCheckbox').checked=!!session.done[q.id];el('doneCheckbox').onchange=()=>{session.done[q.id]=el('doneCheckbox').checked;store();renderNavMarks();};
 el('nextQuestion').textContent=session.index<session.ids.length-1?'Næste spørgsmål →':'Til første spørgsmål ↺';
 if(lock&&!q.dataset)area.append(text('p','Hints og facit er skjult under prøven. Du vurderer dine forklaringer i gennemgangen.','locked-note'));
}
function renderNavMarks(){Array.from(el('questionNav').children).forEach((b,i)=>b.classList.toggle('completed',!!session.done[session.ids[i]]));}
function renderSession(){
 show('session');el('sessionTitle').textContent=session.guided?byId[session.ids[0]].title:session.id+' · '+session.title;el('sessionMode').textContent=session.guided?'GUIDET TRÆNING':'SAMLET PRØVEEKSAMEN';el('sessionStatus').textContent=session.guided?'Hints og facit tilgængelige':session.finished?'Gennemgang':session.deadline?'Prøven kører':'Klar til start';el('timerPanel').hidden=session.guided;
 el('examInstructions').replaceChildren(text('div',session.guided?'Prøv selv først. Brug derefter hints, facit og vurderingspunkter til at gennemgå dit svar.':'Denne prøve indeholder '+session.ids.length+' spørgsmål. SQL og udvalgte Excel-opgaver kan løses i det integrerede lab. Andre Excel-opgaver løses i de downloadbare filer. Markeringer er selvvurdering, ikke en automatisk karakter.'));
 if(!session.guided){const links=text('div','','file-links');downloadLinks(links,allFiles());el('examInstructions').append(links);}
 el('reviewSummary').hidden=!session.finished;el('reviewSummary').replaceChildren();if(session.finished){const n=session.ids.filter(id=>session.done[id]).length;el('reviewSummary').append(text('h2','Gennemgå din prøve'),text('p','Du markerede '+n+' af '+session.ids.length+' spørgsmål som gennemarbejdet. Det er ikke en bedømmelse af rigtigheden. Sammenlign dine svar med løsningsvejledningerne, og afprøv dine forespørgsler og formler igen.'),text('p',session.expired?'Tiden udløb. Facit og svarkontrol er nu åbnet.':'Prøven er afsluttet. Facit og svarkontrol er nu åbnet.'),btn('Til opgavebanken',()=>show('bank'),'secondary-button'));}
 renderQuestion();updateTimer();
}
function updateTimer(){if(!session||session.guided)return;const n=remaining();el('timer').textContent=displayTime(n);el('startTimer').disabled=!!session.deadline||session.finished;el('startTimer').textContent=session.started?'Fortsæt ▶':'Start prøve ▶';el('pauseTimer').disabled=!session.deadline||session.finished;el('finishExam').disabled=session.finished;el('timerPanel').classList.toggle('expired',!!session.expired);if(session.deadline&&n===0){finish(true);}}
function finish(expired=false){if(!session||session.guided||session.finished)return;session.remaining=remaining();session.deadline=null;session.finished=true;session.expired=expired;store();renderSession();}
async function init(){
 try{
  const [c,p]=await Promise.all([fetch('assets/catalog.json'),fetch('assets/practice.json')]);if(!c.ok||!p.ok)throw Error();catalog=await c.json();practice=await p.json();
  for(const [dataset,qs] of Object.entries(catalog.exercises)){for(const q of qs)bank.push({...q,dataset,kind:catalog.datasets[dataset].schema?'SQL':'Excel',category:catalog.datasets[dataset].name,prompt:q.desc,answer:q.answer+'\n\n'+q.explain});}
  bank.push(...practice.questions);byId=Object.fromEntries(bank.map(q=>[q.id,q]));for(const ex of examSets)if(ex.ids.some(id=>!byId[id]))throw Error('Ukendt eksamensspørgsmål.');
  el('questionCount').textContent=bank.length;el('modelMethod').textContent=practice.modelMethod;
  for(const m of practice.materials){const a=text('a','','material-card');a.href=m.file;a.download='';a.append(text('strong',m.title+' ↓'),text('small',m.note),text('small','Kilde: '+m.origin));el('materialList').append(a);}
  try{const old=JSON.parse(localStorage.getItem('accountingLab.exam.v1')||'null');if(old&&old.ids?.every(id=>byId[id])&&old.index>=0&&old.index<old.ids.length)session=old;}catch{}
  renderCards();el('loading').hidden=true;const params=new URLSearchParams(location.search);if(byId[params.get('question')])single(params.get('question'));else show(params.get('view')==='materials'?'materials':params.get('view')==='bank'?'bank':'home');
  if(session?.deadline&&remaining()===0)finish(true);
  setInterval(updateTimer,1000);
 }catch(error){el('loading').textContent='Kursusindholdet kunne ikke hentes. Genindlæs siden for at prøve igen.';console.error(error);}
}
el('examsTab').onclick=()=>{renderCards();show('home');};el('bankTab').onclick=()=>show('bank');el('materialsTab').onclick=()=>show('materials');el('subjectFilter').onchange=renderBank;el('questionSearch').oninput=renderBank;
el('startTimer').onclick=()=>{if(!session||session.finished)return;session.started=true;session.deadline=Date.now()+session.remaining*1000;store();el('sessionStatus').textContent='Prøven kører';updateTimer();};el('pauseTimer').onclick=()=>{session.remaining=remaining();session.deadline=null;store();el('sessionStatus').textContent='Pause';updateTimer();};el('finishExam').onclick=()=>finish();el('backButton').onclick=()=>{renderCards();show('home');};el('showQuestionHint').onclick=()=>{el('questionHint').hidden=!el('questionHint').hidden;};el('nextQuestion').onclick=()=>{session.index=(session.index+1)%session.ids.length;store();renderQuestion();};
init();
