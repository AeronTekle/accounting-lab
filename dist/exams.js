'use strict';
const el=id=>document.getElementById(id);
const sections=['home','bank','exams','oral','materials','session'];
let catalog,practice,bank=[],byId={},session=null,bankPage=1;
let activeView='home',restoringLocation=false;
let workspaceObserver;
let oralSubject='Excel';
const bankPageSize=12;
const nf=new Intl.NumberFormat('en-US',{maximumFractionDigits:6});
const followUpSeconds=60;
const followUps={
 i2:{topic:'Missing payroll IDs',prompt:'A colleague suggests excluding all rows with a missing Employee_Number before reporting total gross wages. Would you do that? What would you check first?',points:[
  'Keep the recorded wages in the total unless there is evidence that the transactions should be corrected or excluded.',
  'Flag the affected rows separately and show how much the total would fall if they were excluded.',
  'Reconcile the flagged wages to the payroll register and check another identifier against the employee master before drawing a conclusion.'
 ]},
 m13:{topic:'Duplicate rows after a join',prompt:'Suppose a director has two qualifying films. Two different directors also share the same name. Would SELECT DISTINCT name solve both problems? How would you verify your result?',points:[
  'The join can produce multiple rows for one director when more than one film qualifies.',
  'DISTINCT on the name merges different people with the same name. Deduplicate by person ID, then display the names.',
  'Inspect person IDs in an intermediate result and check that each qualifying ID appears exactly once.'
 ]},
 r15:{topic:'Game days and sales',prompt:'The manager says game days caused the higher predicted sales. What else could explain the difference, and what comparison would you run to check it?',points:[
  'The coefficient compares average sales on game and non-game days in this dataset.',
  'If games cluster on busy days of the week, the weekday mix could explain part of the difference.',
  'Compare game and non-game days on the same weekday, or add weekday controls. The adjusted comparison still describes an association.'
 ]},
 e2:{topic:'Variable-length employee codes',prompt:'Your formula works on Japan177-3Mo. What could go wrong if you used the same fixed character positions for every employee code? Give two examples of what you would test.',points:[
  'The prefix before the hyphen varies in length, so the plant does not always start at the same character.',
  'Plant IDs can have one or two digits, and pay-frequency suffixes can have one or two characters.',
  'Test both short and long plant IDs with M, Mo, W and We suffixes, and compare the extracted number with the source code.'
 ]},
 p3:{topic:'Weighted pay per hour',prompt:'A colleague calculates each row’s pay per hour and then averages those rates. Why can that differ from your company-wide figure? What would you do with rows that have pay but zero hours?',points:[
  'An unweighted mean gives each row equal weight even when the rows contain different numbers of hours.',
  'Company-wide pay per hour divides total regular and overtime pay by total regular and overtime hours.',
  'A paid row with zero hours has no finite individual rate. Flag and investigate it, while retaining its recorded pay in the requested company total.'
 ]},
 p6:{topic:'Investigating zero-hour pay',prompt:'Your rule has flagged paid rows with zero hours. Would you remove those rows before presenting payroll costs? Explain what evidence you would request.',points:[
  'The rule identifies a combination of recorded values that needs review.',
  'Ask for the payroll register and adjustment or payment documentation to establish why pay was recorded without hours.',
  'Keep the recorded amounts in the total pending evidence and document any supported correction separately.'
 ]},
 f3:{topic:'Duration calculations and rounding',prompt:'You have the mean duration for all Shooting Permit records. A colleague instead averages only Brooklyn records and rounds each duration to a whole hour first. What has changed?',points:[
  'Restricting the records to Brooklyn changes the population being averaged.',
  'Rounding every duration before taking the mean can change the result. Use unrounded durations and round the final mean.',
  'Calculate end time minus start time and multiply by 24 because Excel stores date differences in days.'
 ]},
 f4:{topic:'Missing values stored as text',prompt:'A student uses COUNTBLANK and reports that no ZIP codes are missing. How would you investigate the disagreement with your answer?',points:[
  'Inspect the raw ZipCode values and identify the text N/A used for missing ZIP codes in this source.',
  'COUNTBLANK does not count cells containing the text N/A. Count or filter the marker explicitly.',
  'Keep the definition of a missing value explicit and distinguish it from a present but invalid ZIP code.'
 ]},
 j1:{topic:'Keeping journal lines during a join',prompt:'After you add business-unit information, the journal contains more rows than before. What is the likely problem, and how would you check that you preserved every original line?',points:[
  'Repeated BusinessUnitID values in the reference table can match one journal line more than once.',
  'Check reference-key uniqueness and investigate duplicate keys before merging. Use a left join to retain unmatched journal lines.',
  'Reconcile row counts and totals and inspect unmatched IDs. JENumber alone cannot identify a unique journal line.'
 ]},
 i1:{topic:'Comparing payroll definitions',prompt:'A colleague adds a separate overtime estimate to the 2016 Gross_Wages column to make it comparable with 2015. Would that improve the comparison? Explain how you would reconcile the two years.',points:[
  'Gross_Wages already includes overtime in the 2016 extract, so adding overtime again would double-count it.',
  'Use Reg_Pay plus OT_Pay in 2015 and Gross_Wages in 2016 for the same six-month period.',
  'Reconcile the totals at the appropriate aggregation level and explain that different row structures do not imply different pay definitions.'
 ]},
 c2:{topic:'Invoice totals after a join',prompt:'The join repeats invoice totals, so a colleague suggests SUM(DISTINCT Total). Would that always fix the revenue calculation? Explain what happens when two invoices have the same total.',points:[
  'An invoice-to-lines join can repeat one invoice total once for each line.',
  'DISTINCT Total removes repeated amounts, including amounts belonging to different invoices, and can understate revenue.',
  'Sum the invoice table at one row per InvoiceId, or deduplicate by invoice ID before summing. Check invoice counts and totals.'
 ]},
 c6:{topic:'Distinct customers across countries',prompt:'Suppose one customer has invoices billed to two different countries. How should that customer appear in your country counts? Can you add those counts to find the number of unique customers overall?',points:[
  'COUNT(DISTINCT CustomerId) counts that customer once in each billing-country group where they have an invoice.',
  'Adding the group counts can count the same customer more than once across countries.',
  'Calculate the overall distinct customer count directly across all invoices when that is the requested measure.'
 ]},
 s4:{topic:'Ties in a top-five ranking',prompt:'Two songs tie for the fifth-highest danceability score. Why did the question specify a second sort field, and how would your answer change if the requirement were to include every song tied at fifth?',points:[
  'Sorting by ID after danceability makes the choice between equal scores deterministic.',
  'The current task requests exactly five rows, so LIMIT 5 with the stated secondary sort is appropriate.',
  'Including all songs tied at the fifth score is a different requirement and may produce more than five rows.'
 ]},
 s6:{topic:'Artists with no matching songs',prompt:'You are now asked to include every artist, even artists with no songs in this list. What join and counting choices would need to change?',points:[
  'Start from artists and use a left join to songs so artists with no matching song remain.',
  'Count the matched song ID. COUNT(*) would count the retained unmatched row as one.',
  'Group by artist ID as well as the displayed name so different artists with the same name stay separate.'
 ]},
 m2:{topic:'What an average film rating represents',prompt:'Your average gives each film equal weight. A colleague wants films with more votes to count more. Would that measure the same thing, and can either result describe every film in the full database?',points:[
  'AVG(rating) gives each matched film equal weight, regardless of its number of votes.',
  'Weighting by votes gives more influence to films with more votes and answers a different question.',
  'The calculation uses the provided 2,000-film subset, so its result should be described as applying to that subset.'
 ]},
 a1:{topic:'Limits of a spending threshold',prompt:'A reviewer says every purchase above 5,000 is fraudulent and every purchase below it is safe. What can your query establish, and what extra checks would you suggest?',points:[
  'The query identifies transactions strictly above the selected threshold.',
  'The threshold alone cannot establish whether a transaction is legitimate. Review receipts, approval and purchasing purpose.',
  'Review other patterns, such as repeated smaller purchases to the same vendor, as additional flags requiring supporting evidence.'
 ]},
 a6:{topic:'Potential duplicate charges',prompt:'Two positive charges share a vendor, date and amount. What would you need to see before concluding that the same purchase was charged twice?',points:[
  'Matching vendor, date and amount identifies a group for review, but separate legitimate purchases can share those fields.',
  'Compare transaction IDs, receipts and invoice or order references to establish whether both charges relate to the same purchase.',
  'Check for a later credit or reversal and document the evidence before proposing an adjustment.'
 ]},
 r1:{topic:'Temperature units in a prediction',prompt:'The manager gives you a temperature of 20 degrees Celsius. Can you insert 20 into this regression? Explain how you would produce a prediction using the model as fitted.',points:[
  'The model uses Fahrenheit, so inserting 20 would represent 20 degrees Fahrenheit.',
  'Convert 20 degrees Celsius to 68 degrees Fahrenheit before applying the fitted equation.',
  'Include the intercept and interpret the result as predicted daily sales at that temperature.'
 ]},
 r3:{topic:'Significance and forecasting value',prompt:'The temperature slope is statistically significant, but R-squared is small. Would you recommend using the model for sales forecasting on that evidence alone? How would you assess it?',points:[
  'The p-value addresses statistical evidence about the slope under the model assumptions.',
  'R-squared describes the share of variation explained in the fitted sample. A small p-value does not guarantee accurate forecasts.',
  'Test forecasts on later dates using inputs available at forecast time, and compare prediction errors with a suitable benchmark.'
 ]},
 r4:{topic:'An interaction changes the comparison',prompt:'A colleague reports the coefficient on G as the game-day difference when L is 5,000. What term have they missed, and why does the difference depend on L?',points:[
  'Switching G from zero to one changes both the G term and the L times G term.',
  'The difference at L equal to 5,000 is the G coefficient plus 5,000 times the interaction coefficient.',
  'Hold L fixed for the comparison. The G coefficient by itself describes the difference when L equals zero.'
 ]},
 r6:{topic:'Information available at forecast time',prompt:'Someone evaluates next week’s forecast using the temperature that was actually observed next week. Why could that make the forecasting exercise misleading?',points:[
  'The realised future temperature is unavailable when the forecast is made.',
  'Use a temperature forecast available at that time, and check that the lagged-sales and scheduled-game inputs are also available.',
  'Including information learned after the forecast date leaks future information and can make the evaluation look too favourable.'
 ]},
 r9:{topic:'Predictions outside the observed range',prompt:'The equation produces a sales prediction at 0 degrees Fahrenheit. Does being able to calculate it make that prediction well supported by the restaurant data?',points:[
  'The observed daily highs range from 28.94 to 104 degrees Fahrenheit, so zero is outside the fitted sample range.',
  'The prediction extrapolates the fitted relationship beyond the temperatures observed.',
  'Explain that limitation and seek evidence covering colder conditions before relying on the prediction.'
 ]},
 r12:{topic:'Choosing a forecast test period',prompt:'A student randomly mixes early and late restaurant dates into training and test sets. Why would you prefer a chronological comparison for this forecasting task, and how would you keep the model comparison fair?',points:[
  'Forecasting uses past information to predict later dates, so the evaluation should preserve that time order.',
  'Fit the models using the same earlier training dates and compare predictions on the same later test dates.',
  'Use only inputs available at forecast time and compare the same error measure, such as mean absolute error in dollars.'
 ]},
 r14:{topic:'The slope of a curved relationship',prompt:'The squared-temperature coefficient is negative. Does that mean a one-degree increase always reduces predicted sales? Explain how you would find the effect at a particular temperature.',points:[
  'A negative squared coefficient makes the fitted curve concave, but the slope can still be positive at some temperatures.',
  'At a temperature t, the local slope is the linear-temperature coefficient plus twice the squared coefficient times t.',
  'Evaluate the slope at the specified temperature and interpret it within the observed temperature range.'
 ]}
};
let followUpDeadline,followUpInterval;
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
 activeView=id;
 for(const section of sections)el(section).hidden=section!==id;
 const navView=id==='session'?(session.guided?session.returnView||'bank':'exams'):id;
 for(const [name,view] of [['examsTab','home'],['bankTab','bank'],['timedTab','exams'],['oralTab','oral'],['materialsTab','materials']]){
  el(name).classList.toggle('active',navView===view);
  if(navView===view)el(name).setAttribute('aria-current','page');else el(name).removeAttribute('aria-current');
 }
 if(id==='bank')renderBank();
 if(id==='oral')renderOral();
 syncLocation();
}
function syncLocation(replace=false){
 if(restoringLocation)return;
 const url=new URL(location.href);
 url.search='';
 url.hash='';
 if(activeView==='session')url.searchParams.set(session.guided?'question':'exam',session.guided?session.ids[0]:session.id);
 else if(activeView!=='home')url.searchParams.set('view',activeView);
 if(url.href!==location.href)history[replace?'replaceState':'pushState'](null,'',url);
}
function restoreLocation(){
 restoringLocation=true;
 try{
  const params=new URLSearchParams(location.search);
  const id=params.get('question'),examId=params.get('exam');
  const exam=examSets.find(ex=>ex.id===examId);
  if(byId[id])single(id);
  else if(examId==='mock'||exam){
   if(session&&!session.guided&&session.id===examId)renderSession();
   else if(exam)newExam(exam);
   else newMock();
  }else{
   renderCards();
   show(['bank','exams','oral','materials'].includes(params.get('view'))?params.get('view'):'home');
  }
 }finally{
  restoringLocation=false;
  syncLocation(true);
 }
}
function openBank(){
 show('bank');
 el('bankHeading').focus();
}
function openExams(){
 renderCards();
 show('exams');
 el('examLibraryHeading').focus();
}
function openOral(){
 if(activeView==='session'&&session?.returnView==='oral')oralSubject=byId[session.ids[0]].kind;
 show('oral');
 el('oralPracticeTitle').focus();
}
function renderOral(){
 const entries=Object.entries(followUps).filter(([id])=>byId[id].kind===oralSubject);
 el('oralSubjectChoices').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.subject===oralSubject)));
 el('oralCount').textContent=entries.length+' '+oralSubject+' exercises · '+Object.keys(followUps).length+' oral exercises in total';
 const cards=entries.map(([id,followUp])=>{
  const q=byId[id],card=text('article','','oral-card');
  const open=btn('Open exercise →',()=>{single(id,[id]);el('sessionTitle').focus();},'primary-button');
  open.setAttribute('aria-label','Open '+q.kind+' oral exercise '+followUp.topic);
  card.append(text('span',q.kind,'eyebrow'),text('h2',followUp.topic),text('p',q.title),open);
  return card;
 });
 el('followUpExamples').replaceChildren(...cards);
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
function stopFollowUpTimer(){
 clearInterval(followUpInterval);
}
function updateFollowUpTimer(){
 const seconds=Math.max(0,Math.ceil((followUpDeadline-Date.now())/1000));
 el('followUpTimer').textContent=displayTime(seconds);
 if(seconds===0){
  stopFollowUpTimer();
  el('followUpStatus').textContent='Time is up. Review your answer when ready.';
  el('showFollowUpReview').textContent='Show review points';
 }
}
function startFollowUp(){
 stopFollowUpTimer();
 el('followUpReview').hidden=true;
 el('followUpPoints').querySelectorAll('input').forEach(input=>{input.checked=false;});
 el('followUpClock').hidden=false;
 el('followUpStatus').textContent='';
 el('showFollowUpReview').textContent='I’ve finished speaking';
 el('showFollowUpReview').hidden=false;
 followUpDeadline=Date.now()+followUpSeconds*1000;
 updateFollowUpTimer();
 followUpInterval=setInterval(updateFollowUpTimer,250);
 el('followUpTitle').focus();
}
function openFollowUp(){
 const q=byId[session.ids[session.index]], followUp=followUps[q.id];
 if(locked()||!followUp)return;
 el('followUpContext').textContent=q.kind+' · '+q.title;
 el('followUpPrompt').textContent=followUp.prompt;
 const points=followUp.points.map(point=>{
  const label=text('label',point);
  const input=document.createElement('input');
  input.type='checkbox';
  label.prepend(input);
  const item=text('li','');
  item.append(label);
  return item;
 });
 el('followUpPoints').replaceChildren(...points);
 el('followUpDialog').showModal();
 startFollowUp();
}
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
  const label=group==='manipulation'?'Excel and SQL':'Regression';
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
function single(id,browseIds){
 if(protectAttempt('Resume or finish your current attempt before opening guided practice.'))return;
 const answers=session?.guided?session.answers:{};
 const done=session?.guided?session.done:{};
 const previousIds=session?.guided?session.browseIds:undefined;
 const candidates=browseIds||((previousIds||[]).includes(id)?previousIds:bank.filter(q=>q.kind===byId[id].kind).map(q=>q.id));
 const questionIds=candidates.filter(questionId=>byId[questionId]);
 const returnView=activeView==='oral'?'oral':(activeView==='session'||restoringLocation)&&session?.guided?session.returnView||'bank':'bank';
 session={id:'single',title:'Guided practice',ids:[id],index:0,answers,done,browseIds:questionIds.includes(id)?questionIds:[id],returnView,finished:false,guided:true};
 store();
 renderSession();
}
function moveGuided(step){
 const ids=session.browseIds||session.ids;
 const next=ids[ids.indexOf(session.ids[0])+step];
 if(!next)return;
 single(next,ids);
 el('questionTitle').focus();
}
function renderBank(){
 const subject=el('subjectFilter').value;
 el('subjectChoices').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.subject===subject)));
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
  const button=btn('',()=>{single(q.id,matches.map(question=>question.id));el('sessionTitle').focus();},'bank-item');
  const label=text('span','','bank-item-label');
  const mode=q.dataset?'Work in the browser':q.kind==='Regression'?'Interpret model output':'Use the downloaded workbook';
  label.append(text('strong',q.title),text('small',q.category+' · '+mode));
  if(followUps[q.id])label.append(text('small','Includes an examiner follow-up','oral-badge'));
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
function numericValue(value){
 const raw=value.trim();
 const grouped=/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw);
 return Number(grouped?raw.replaceAll(',',''):raw.replace(',','.'));
}
function renderQuestion(){
 workspaceObserver?.disconnect();
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
  const frame=document.createElement('iframe');frame.title='Interactive workspace: '+q.title;frame.className='lab-frame';frame.src='index.html?v=simple-browsing-1&embed=1&dataset='+encodeURIComponent(q.dataset)+'&exercise='+encodeURIComponent(q.id)+'&attempt='+encodeURIComponent(session.attempt||'guided')+(lock?'&exam=1':'');
  frame.onload=()=>{
   if(!frame.isConnected)return;
   const resize=()=>{frame.style.height=Math.ceil(frame.contentDocument.body.getBoundingClientRect().height+2)+'px';};
   resize();
   workspaceObserver=new ResizeObserver(resize);
   workspaceObserver.observe(frame.contentDocument.body);
  };
  area.append(frame);
 }else{
  const label=text('label','YOUR METHOD AND EXPLANATION','response-label');label.htmlFor='writtenAnswer';const answer=document.createElement('textarea');answer.id='writtenAnswer';answer.className='scratch-answer';answer.placeholder='Write your calculation, method or interpretation here…';answer.value=session.answers[q.id]||'';answer.oninput=()=>{session.answers[q.id]=answer.value;store();};area.append(label,answer);
  if(q.expected!==null&&q.expected!==undefined&&!lock){const wrap=text('div','','numeric-check'),label=text('label','Check your numeric result','response-label');label.htmlFor='numericAnswer';const inp=document.createElement('input');inp.type='text';inp.inputMode='decimal';inp.id='numericAnswer';inp.className='numeric-answer';inp.placeholder='Enter your result';const result=text('span','','numeric-feedback');result.setAttribute('role','status');const button=btn('Check number',()=>{const val=numericValue(inp.value);if(!inp.value.trim()||!Number.isFinite(val)){result.textContent='Enter a number, for example 1436.30 or 1,436.30.';return;}const tolerance=q.id==='r5'?0.000001:q.id==='r16'?0.000051:0.011;result.textContent=Math.abs(val-q.expected)<=tolerance?'✓ The number is correct. Use the criteria below to review your explanation.':'The result differs. Check the model and the inputs requested in the question.';},'secondary-button');wrap.append(label,inp,button,result);area.append(wrap);}
 }
 el('answerDetails').hidden=lock;el('answerDetails').open=false;el('questionHint').hidden=true;el('questionHint').textContent=q.hint||'Check the data, method and units.';el('showQuestionHint').hidden=lock;el('questionAnswer').textContent=q.answer;el('answerChecks').replaceChildren();(q.checks||['Check the output values and rows','Explain why your method works','Use the specified dataset']).forEach(x=>el('answerChecks').append(text('li',x)));el('doneCheckbox').checked=!!session.done[q.id];el('doneCheckbox').onchange=()=>{session.done[q.id]=el('doneCheckbox').checked;store();renderNavMarks();};
 el('nextQuestion').textContent=position<activeIds.length-1?'Next question →':'First question ↺';
 const browseIds=session.browseIds||[questionId];
 const browseIndex=browseIds.indexOf(questionId);
 el('previousQuestion').hidden=!session.guided||session.returnView==='oral';
 el('previousQuestion').disabled=browseIndex<=0;
 el('nextQuestion').hidden=session.guided&&session.returnView==='oral';
 el('nextQuestion').disabled=session.guided&&browseIndex>=browseIds.length-1;
 if(session.guided){
  el('nextQuestion').textContent='Next exercise →';
  el('questionLabel').textContent=q.kind.toUpperCase()+' · EXERCISE '+(browseIndex+1)+' OF '+browseIds.length;
 }
 el('openFollowUp').hidden=lock||!followUps[questionId];
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
 const waiting=!session.guided&&!session.finished&&!session.deadline;
 el('backButton').textContent=session.guided?(session.returnView==='oral'?'← Back to oral practice':'← Back to topic practice'):'← Back to timed exams';
 el('sessionTitle').textContent=session.guided?byId[session.ids[0]].kind+' practice':session.parts?session.title:session.id+' · '+session.title;
 el('sessionMode').textContent=session.guided?(session.returnView==='oral'?'ORAL PRACTICE':'TOPIC PRACTICE'):session.parts?'FULL MOCK EXAM':'TIMED PRACTICE EXAM';
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
 el('questionNav').hidden=waiting||session.guided;
 el('questionSheet').hidden=waiting;
 if(waiting){workspaceObserver?.disconnect();el('responseArea').replaceChildren();}else renderQuestion();
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
 renderSession();
}
function pauseTimer(){
 if(!locked()||!session.deadline)return;
 const time=remaining();
 if(time===0){finish(true);return;}
 session.remaining=time;
 session.deadline=null;
 store();
 renderSession();
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
 const controller=new AbortController();
 let loadTimedOut=false;
 const loadTimeout=setTimeout(()=>{loadTimedOut=true;controller.abort();},12000);
 try{
  const [c,p]=await Promise.all([fetch('assets/catalog.json?v=exam-downloads-1',{signal:controller.signal}),fetch('assets/practice.json?v=submission-review-1',{signal:controller.signal})]);if(!c.ok||!p.ok)throw Error();catalog=await c.json();practice=await p.json();
  clearTimeout(loadTimeout);
  for(const [dataset,qs] of Object.entries(catalog.exercises)){for(const q of qs)bank.push({...q,dataset,kind:catalog.datasets[dataset].schema?'SQL':'Excel',category:catalog.datasets[dataset].name,prompt:q.desc,answer:q.answer+'\n\n'+q.explain});}
  bank.push(...practice.questions);byId=Object.fromEntries(bank.map(q=>[q.id,q]));for(const ex of examSets)if(ex.ids.some(id=>!byId[id]))throw Error('Unknown exam question.');
  for(const subject of ['Excel','SQL','Regression']){
   const count=Object.keys(followUps).filter(id=>byId[id].kind===subject).length;
   const button=btn(subject+' · '+count,()=>{oralSubject=subject;renderOral();},'subject-choice');
   button.dataset.subject=subject;
   el('oralSubjectChoices').append(button);
  }
  for(const subject of ['all','Excel','SQL','Regression']){
   const count=bank.filter(q=>subject==='all'||q.kind===subject).length;
   const button=btn((subject==='all'?'All subjects':subject)+' · '+count,()=>{
    el('subjectFilter').value=subject;
    el('caseFilter').value='all';
    resetBankPage();
   },'subject-choice');
   button.dataset.subject=subject;
   button.setAttribute('aria-pressed',String(subject==='all'));
   el('subjectChoices').append(button);
  }
  el('questionCount').textContent=bank.length;el('examCount').textContent=examSets.length;el('datasetCount').textContent=Object.keys(catalog.datasets).length;el('modelMethod').textContent=practice.modelMethod;
  for(const m of practice.materials){const a=text('a','','material-card');a.href=m.file;a.download='';a.append(text('strong',m.title+' ↓'),text('small',m.note),text('small','Source: '+m.origin));el('materialList').append(a);}
  try{const old=JSON.parse(localStorage.getItem('accountingLab.exam.v1')||'null');if(old&&old.ids?.every(id=>byId[id])&&old.index>=0&&old.index<old.ids.length){
   const exam=examSets.find(set=>set.id===old.id);
   if(exam)old.title=exam.title;
   session=old;
  }}catch{}
  restoreLocation();
  if(session?.deadline&&remaining()===0)finish(true);
  el('loading').hidden=true;
  el('loadFallback').hidden=true;
  setInterval(updateTimer,1000);
 }catch(error){
  controller.abort();
  el('loading').hidden=false;
  el('loading').textContent=loadTimedOut?'Loading took too long. Use the materials below or reload the practice page.':'The interactive questions could not load. Use the materials below or reload the practice page.';
  console.error(error);
 }finally{clearTimeout(loadTimeout);}
}
el('examsTab').onclick=()=>{renderCards();show('home');el('homeHeading').focus();};
el('bankTab').onclick=openBank;
el('openQuestionBank').onclick=openBank;
el('timedTab').onclick=openExams;
el('openTimedExams').onclick=openExams;
el('oralTab').onclick=openOral;
el('openOralPractice').onclick=openOral;
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
 if(session.guided){if(session.returnView==='oral')openOral();else openBank();return;}
 openExams();
};
el('showQuestionHint').onclick=()=>{el('questionHint').hidden=!el('questionHint').hidden;};
el('openFollowUp').onclick=openFollowUp;
el('followUpDialog').onclose=()=>{
 stopFollowUpTimer();
 el('openFollowUp').focus();
};
el('retryFollowUp').onclick=startFollowUp;
el('showFollowUpReview').onclick=()=>{
 stopFollowUpTimer();
 el('followUpClock').hidden=true;
 el('followUpStatus').textContent='';
 el('showFollowUpReview').hidden=true;
 el('followUpReview').hidden=false;
 el('followUpReviewTitle').focus();
};
el('nextQuestion').onclick=()=>{
 if(session.guided){moveGuided(1);return;}
 const ids=activeQuestionIds();
 moveToQuestion(ids[(ids.indexOf(session.ids[session.index])+1)%ids.length]);
};
el('previousQuestion').onclick=()=>moveGuided(-1);
window.addEventListener('popstate',restoreLocation);
init();
