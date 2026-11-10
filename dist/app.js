'use strict';
const $=id=>document.getElementById(id);
const datasets={
 songs:{name:'Songs · Spotify',file:'assets/songs.db',meta:'100 songs · 2 tables',source:'CS50 Songs · SQL part 1',schema:{songs:'id INTEGER · name TEXT · artist_id INTEGER · danceability REAL · energy REAL · key INTEGER · loudness REAL · speechiness REAL · valence REAL · tempo REAL · duration_ms INTEGER',artists:'id INTEGER · name TEXT'}},
 chinook:{name:'Chinook · Music store',file:'assets/chinook.sqlite',meta:'412 invoices · 11 tables',source:'PwC Chinook · SQL part 1',schema:{Invoice:'InvoiceId INTEGER · CustomerId INTEGER · InvoiceDate DATETIME · BillingAddress TEXT · BillingCity TEXT · BillingState TEXT · BillingCountry TEXT · BillingPostalCode TEXT · Total NUMERIC',InvoiceLine:'InvoiceLineId INTEGER · InvoiceId INTEGER · TrackId INTEGER · UnitPrice NUMERIC · Quantity INTEGER',Customer:'CustomerId INTEGER · FirstName TEXT · LastName TEXT · Company TEXT · Address TEXT · City TEXT · State TEXT · Country TEXT · PostalCode TEXT · Phone TEXT · Fax TEXT · Email TEXT · SupportRepId INTEGER',Track:'TrackId INTEGER · Name TEXT · AlbumId INTEGER · MediaTypeId INTEGER · GenreId INTEGER · Composer TEXT · Milliseconds INTEGER · Bytes INTEGER · UnitPrice NUMERIC',Album:'AlbumId INTEGER · Title TEXT · ArtistId INTEGER',Artist:'ArtistId INTEGER · Name TEXT',Genre:'GenreId INTEGER · Name TEXT',Employee:'EmployeeId INTEGER · LastName TEXT · FirstName TEXT · Title TEXT · ReportsTo INTEGER · BirthDate DATETIME · HireDate DATETIME · Address TEXT · City TEXT · State TEXT · Country TEXT · PostalCode TEXT · Phone TEXT · Fax TEXT · Email TEXT',MediaType:'MediaTypeId INTEGER · Name TEXT',Playlist:'PlaylistId INTEGER · Name TEXT',PlaylistTrack:'PlaylistId INTEGER · TrackId INTEGER'}},
 employees:{name:'Employee codes · ETL',file:'assets/employees.json',meta:'597 employees · ETL case 3',source:'ETL Case 3 · Excel part 2'},
 payroll:{name:'Payroll · IntegrateCo 2015',file:'assets/payroll.json',meta:'4,981 payroll rows · 5 selected fields',source:'IntegrateCo 2015 · Excel part 3'}
};
const exercises={
 songs:[
  {id:'s1',title:'First look at the data',skill:'SELECT · LIMIT',desc:'Show name and energy for the first five songs by ascending id. Return those two columns in that order.',starter:'SELECT name, energy\nFROM songs\nORDER BY id\nLIMIT 5;',answer:'SELECT name, energy\nFROM songs\nORDER BY id ASC\nLIMIT 5;',hint:'Select the columns, order by id, then use LIMIT 5.',explain:'SELECT returns the two requested fields. Sorting by id identifies which five songs to return.',ordered:true},
  {id:'s2',title:'Apply three conditions',skill:'WHERE · AND',desc:'Find songs with danceability, energy and valence all greater than 0.6. Return only name. Row order is optional.',starter:'SELECT name\nFROM songs\nWHERE danceability > 0.6;',answer:'SELECT name\nFROM songs\nWHERE danceability > 0.6\n  AND energy > 0.6\n  AND valence > 0.6;',hint:'All three conditions must hold. Use AND.',explain:'AND requires all three conditions to be true. The complete course database returns 23 songs.',ordered:false},
  {id:'s3',title:'Join songs to artists',skill:'JOIN · WHERE',desc:'Find all songs by looking up Drake by artist name. Return only the song name. Row order is optional.',starter:'SELECT s.name\nFROM songs AS s\n-- Join songs to artists here',answer:"SELECT s.name\nFROM songs AS s\nJOIN artists AS a ON s.artist_id = a.id\nWHERE a.name = 'Drake';",hint:'Match songs.artist_id to artists.id. The artist name is in artists.name.',explain:'Join the tables by ID and filter by artist name. An equivalent subquery also works.',ordered:false}
 ],
 chinook:[
  {id:'c1',title:'Count invoices above $20',skill:'COUNT · WHERE',desc:'How many invoices have a Total strictly greater than 20? Return one number in one column.',starter:'SELECT COUNT(*)\nFROM Invoice\nWHERE Total > 20;',answer:'SELECT COUNT(*) AS InvoiceCount\nFROM Invoice\nWHERE Total > 20;',hint:'Filter by Total, then use COUNT(*).',explain:'COUNT(*) counts the invoices that meet the condition. The strict threshold excludes invoices of exactly $20.',ordered:false},
  {id:'c2',title:'Invoice revenue without double-counting',skill:'SUM · ROW GRANULARITY',desc:'Find the total value of all invoices. Count each invoice once and return one number.',starter:'SELECT SUM(i.Total)\nFROM Invoice AS i\nJOIN InvoiceLine AS il\n  ON il.InvoiceId = i.InvoiceId;',answer:'SELECT SUM(Total) AS InvoiceValue\nFROM Invoice;',hint:'An invoice can have multiple lines. What happens to i.Total when you join to InvoiceLine?',explain:'Invoice contains one row per invoice. Joining to InvoiceLine repeats the invoice totals. The correct total is $2,328.60.',ordered:false},
  {id:'c3',title:'Rank countries by invoice value',skill:'GROUP BY · ORDER BY',desc:'Return BillingCountry and the sum of Total per country. Sort by total descending, then by country alphabetically for ties.',starter:'SELECT BillingCountry, SUM(Total) AS Revenue\nFROM Invoice\n-- Add grouping and ordering',answer:'SELECT BillingCountry, SUM(Total) AS Revenue\nFROM Invoice\nGROUP BY BillingCountry\nORDER BY Revenue DESC, BillingCountry ASC;',hint:'Use GROUP BY to group invoices by country and ORDER BY SUM(Total) DESC to rank them.',explain:'Grouping and summing gives one row per country. The secondary sort breaks ties consistently.',ordered:true}
 ],
 employees:[
  {id:'e1',title:'Combine first and last names',skill:'TEXT · &',desc:'Combine FirstName in column B and LastName in column C with one space. Start in row 2 and fill down for all 597 employees.',starter:'=B2&" "&C2',answer:'=B2&" "&C2',mode:'rows',hint:'Use & to join the text and put the space in double quotes.',explain:'The first result is Carl Rodriguez. Relative references adjust as you fill the formula down.'},
  {id:'e2',title:'Extract the plant ID',skill:'MID · FIND',desc:'Extract PlantID from EmployeeCode in column A. The plant ID has one or two digits after the hyphen and before M, Mo, W or We. Return a number.',starter:'=MID(A2,1,1)',answer:'=VALUE(MID(A2,FIND("-",A2)+1,LEN(A2)-FIND("-",A2)-IF(OR(RIGHT(A2,1)="o",RIGHT(A2,1)="e"),2,1)))',mode:'rows',hint:'Use FIND to locate the hyphen. Subtract its position and the suffix length from the total length. Mo and We have two characters. M and W have one. Use VALUE to return a number.',explain:'Japan177-3Mo returns 3. Using FIND lets the formula handle country and employee codes of varying lengths.'},
  {id:'e3',title:'Classify monthly and weekly codes',skill:'IF · OR · RIGHT',desc:'Return "Monthly" for codes ending in M or Mo and "Weekly" for W or We. Use EmployeeCode in column A and fill down.',starter:'=RIGHT(A2,1)',answer:'=IF(OR(RIGHT(A2,1)="M",RIGHT(A2,2)="Mo"),"Monthly","Weekly")',mode:'rows',hint:'RIGHT(A2,1) returns o for a code ending in Mo. Use OR to test for both M and Mo.',explain:'The dataset contains 181 Mo codes, 158 M codes and 258 W codes. We is also a valid suffix. A production system should flag invalid codes separately.'}
 ],
 payroll:[
  {id:'p1',title:'Calculate gross pay per row',skill:'REGULAR PAY + OVERTIME',desc:'Calculate gross pay per payroll row by adding Reg_Pay in column C and OT_Pay in column D. Start in row 2.',starter:'=C2+D2',answer:'=C2+D2',mode:'rows',hint:'Gross pay here is the sum of regular and overtime pay.',explain:'Each row represents a payroll allocation. Keep all 4,981 rows.'},
  {id:'p2',title:'Calculate total hours',skill:'SUM · RANGES',desc:'Calculate total regular and overtime hours across all 4,981 rows. Reg_Hrs is in column A and OT_Hrs in column B. Use rows 2 through 4,982 and return one total.',starter:'=SUM(A2:A4982)',answer:'=SUM(A2:A4982)+SUM(B2:B4982)',mode:'summary',hint:'Include regular and overtime hours. You can sum the entire range A2:B4982.',explain:'The total is 32,878.75 hours. AVERAGE would give the hours per row.'},
  {id:'p3',title:'Calculate gross pay per hour',skill:'SUM · WEIGHTED AVERAGE',desc:'Divide total gross pay by total hours in the 2015 extract. Columns A and B contain hours. Columns C and D contain pay. Use rows 2 through 4,982 and round to two decimals.',starter:'=ROUND(SUM(C2:C4982)/SUM(A2:A4982),2)',answer:'=ROUND((SUM(C2:C4982)+SUM(D2:D4982))/(SUM(A2:A4982)+SUM(B2:B4982)),2)',mode:'summary',hint:'Include overtime in both totals, then divide total pay by total hours.',explain:'$1,086,734.19 divided by 32,878.75 hours gives $33.05 per hour. Seven rows have pay and zero hours. The total retains their pay amounts, which warrant a closer look before drawing a business conclusion.'}
 ]
};
if(window.COURSE_EXTRA){Object.assign(datasets,window.COURSE_EXTRA.datasets);Object.assign(exercises,window.COURSE_EXTRA.exercises);}
let saved={};try{saved=JSON.parse(localStorage.getItem('accountingLab.v1')||'{}');}catch{}
let state={studio:'sql',dataset:'songs',index:0,play:false,completed:new Set(saved.completed||[]),drafts:saved.drafts||{},last:null,worker:null,timer:null,working:false,data:null,loadId:0};
const dataCache={};const fmt=new Intl.NumberFormat('en-US',{maximumFractionDigits:8});
const usd=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:8});
let sampleOneQuery=null;
const same=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(a),Math.abs(b)):a===b;
function persist(){try{localStorage.setItem('accountingLab.v1',JSON.stringify({completed:[...state.completed],drafts:state.drafts}));}catch{}}
function current(){return state.play?null:exercises[state.dataset][state.index];}
function key(){return state.dataset+':'+(state.play?'play':current().id)+(new URLSearchParams(location.search).get('attempt')||'');}
function input(){return state.studio==='sql'?$('sqlInput'):$('formulaInput');}
function remember(){if(state.working)return;state.drafts[key()]={text:input().value,mode:$('formulaMode').value};persist();}
function stop(){if(state.worker)state.worker.terminate();clearTimeout(state.timer);state.worker=null;state.working=false;$('runButton').disabled=false;$('checkButton').disabled=state.play;$('runButton').innerHTML=state.studio==='sql'?'<span>▶</span> Run SQL <kbd>⌘ ↵</kbd>':'<span>▶</span> Calculate <kbd>⌘ ↵</kbd>';updateSampleButtons();}
function clearResults(){state.last=null;$('resultCount').textContent='Ready for your next attempt';$('timing').textContent='';$('feedback').hidden=true;$('tableFooter').hidden=true;$('exportButton').disabled=true;$('resultArea').replaceChildren();const div=document.createElement('div');div.className='empty-result';div.innerHTML='<span class="empty-icon">▤<span>↗</span></span><h3>Your results will appear here</h3><p>Enter a solution and select <strong>'+(state.studio==='sql'?'Run SQL':'Calculate')+'</strong>.<br>You can edit your solution and run it again.</p>';$('resultArea').append(div);}
function feedback(message,type='neutral'){$('feedback').textContent=message;$('feedback').className='feedback '+type;$('feedback').hidden=false;}
function list(){
 $('exerciseList').replaceChildren();const items=exercises[state.dataset];let completed=0;
 items.forEach((ex,i)=>{const done=state.completed.has(ex.id);if(done)completed++;const b=document.createElement('button');b.className='exercise-button'+(!state.play&&state.index===i?' active':'')+(done?' done':'');b.setAttribute('aria-pressed',String(!state.play&&state.index===i));const num=document.createElement('span');num.className='num';num.textContent=done?'✓':String(i+1).padStart(2,'0');const label=document.createElement('span');const title=document.createElement('strong');title.textContent=ex.title;const small=document.createElement('small');small.textContent=ex.skill;label.append(title,small);b.append(num,label);b.onclick=()=>{remember();state.play=false;state.index=i;renderTask();};$('exerciseList').append(b);});
 $('progress').textContent=completed+' / '+items.length;$('playButton').classList.toggle('active',state.play);
}
function renderTask(){
 stop();clearResults();const ex=current();list();$('hint').hidden=true;$('solution').hidden=true;$('hintButton').textContent='✧ Show hint';$('solutionButton').textContent='Show worked solution ↗';$('taskKicker').textContent=ex?'EXERCISE '+String(state.index+1).padStart(2,'0'):'SANDBOX';$('skillTag').textContent=ex?ex.skill:'EXPERIMENT';$('taskTitle').textContent=ex?ex.title:'What would you like to explore?';$('taskDescription').textContent=ex?ex.desc:state.studio==='sql'?'Write a SELECT query to explore the tables or try out a join. The sandbox runs your query and shows the output.':'Try a supported Excel formula on the dataset. Choose per-row calculations or one summary calculation.';
 $('hintButton').hidden=!ex;$('solutionButton').hidden=!ex;$('checkButton').disabled=!ex;$('taskNote').textContent=datasets[state.dataset].source;
 const examLocked=new URLSearchParams(location.search).get('exam')==='1';const draft=state.drafts[key()];input().value=draft?draft.text:examLocked?(state.studio==='sql'?'SELECT ':'='):ex?ex.starter:state.studio==='sql'?(state.dataset==='songs'?'SELECT *\nFROM songs\nLIMIT 10;':'SELECT *\nFROM Invoice\nLIMIT 10;'):'=A2';$('formulaMode').value=draft?.mode||ex?.mode||'rows';updateLines();
 if(ex){$('hint').textContent=ex.hint;$('solutionCode').textContent=ex.answer;$('solutionExplanation').textContent=ex.explain;}
 if(examLocked){for(const id of ['solutionButton','hintButton','checkButton'])$(id).hidden=true;}
 const walkthrough=$('joinWalkthrough');
 walkthrough.hidden=examLocked||ex?.id!=='c2';
 walkthrough.open=false;
 walkthrough.querySelector('.join-explanation').open=false;
 $('sampleChallenge').hidden=walkthrough.hidden;
 resetSamples();
}
function makeTable(headers,rows,{index=false,computed=-1}={}){
 const wrap=document.createElement('div');wrap.className='table-scroll';const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');
 if(index){const th=document.createElement('th');th.textContent='#';th.className='row-index';tr.append(th);}
 headers.forEach(h=>{const th=document.createElement('th');th.textContent=h;th.scope='col';tr.append(th);});head.append(tr);table.append(head);const body=document.createElement('tbody');rows.forEach((row,i)=>{const tr=document.createElement('tr');if(index){const td=document.createElement('td');td.textContent=i+2;td.className='row-index';tr.append(td);}row.forEach((v,c)=>{const td=document.createElement('td');if(v&&typeof v==='object'&&'error' in v){td.textContent=v.error;td.className='cell-error';td.title=v.error;}else{const raw=v&&typeof v==='object'&&'value' in v?v.value:v;td.textContent=raw===null?'NULL':typeof raw==='number'?fmt.format(raw):typeof raw==='boolean'?(raw?'TRUE':'FALSE'):String(raw??'');if(c===computed)td.className='computed';td.title=String(raw??'NULL');}tr.append(td);});body.append(tr);});table.append(body);wrap.append(table);return wrap;
}
async function renderContext(){
 const ds=datasets[state.dataset];$('schema').replaceChildren();$('schema').className='schema';$('datasetMeta').textContent=ds.meta;$('contextHeading').textContent=state.studio==='sql'?'Database tables':'Source data';
 $('downloadButton').textContent=state.studio==='sql'?'Download database ↓':'Download CSV for Excel ↓';
 $('contextTip').innerHTML='<span>↳</span>'+(state.studio==='sql'?'Look for shared IDs when joining tables. You can also open this database in a SQLite editor.':'Data starts in row 2. This lab supports selected formulas. Download the same data as CSV to use other methods in Excel. Choose a semicolon as the delimiter if Excel asks.');
 if(state.studio==='sql'){
  state.data=null;Object.entries(ds.schema).forEach(([table,fields],i)=>{const details=document.createElement('details');details.open=i===0;const summary=document.createElement('summary');summary.textContent=table;const small=document.createElement('small');const parts=fields.split(' · ');small.textContent=parts.length+' FIELDS';summary.append(small);const div=document.createElement('div');div.className='schema-fields';parts.forEach(f=>{const s=document.createElement('span');s.textContent=f;s.className=/\bid\b|Id|artist_id/.test(f)?'pk':'';div.append(s);});details.append(summary,div);$('schema').append(details);});
 }else{
  const id=++state.loadId;state.data=null;$('schema').textContent='Loading course data…';
  try{if(!dataCache[state.dataset]){const res=await fetch(ds.file);if(!res.ok)throw Error();dataCache[state.dataset]=await res.json();}if(id!==state.loadId)return;state.data=dataCache[state.dataset];$('schema').classList.add('source-preview');$('schema').replaceChildren(makeTable(state.data.headers.map((h,i)=>String.fromCharCode(65+i)+' · '+h),state.data.rows.slice(0,8),{index:true}));}catch{if(id===state.loadId)$('schema').textContent='Could not load the data. Select the dataset again to retry.';}
 }
}
function setStudio(studio){
 remember();stop();state.loadId++;state.studio=studio;state.dataset=studio==='sql'?'songs':'employees';state.index=0;state.play=false;$('sqlTab').classList.toggle('active',studio==='sql');$('excelTab').classList.toggle('active',studio==='excel');$('sqlTab').setAttribute('aria-pressed',studio==='sql');$('excelTab').setAttribute('aria-pressed',studio==='excel');$('crumb').textContent=studio==='sql'?'SQL STUDIO':'EXCEL STUDIO';$('pageTitle').textContent=studio==='sql'?'Practise SQL':'Practise Excel formulas';$('pageSubtitle').textContent=studio==='sql'?'Run queries on course data and see the results immediately.':'Try an Excel formula on one row or across the whole dataset.';$('engineBadge').textContent=studio==='sql'?'SQLite in your browser':'22 Excel functions in your browser';$('editorHeading').textContent=studio==='sql'?'Your query':'Your Excel formula';$('sqlEditorWrap').hidden=studio!=='sql';$('excelEditorWrap').hidden=studio!=='excel';$('dataset').replaceChildren();(studio==='sql'?['songs','chinook','movies','pcards']:['employees','payroll']).forEach(id=>{const opt=document.createElement('option');opt.value=id;opt.textContent=datasets[id].name;$('dataset').append(opt);});renderTask();renderContext();
}
function updateLines(){$('lineNumbers').textContent=$('sqlInput').value.split('\n').map((_,i)=>i+1).join('\n');}
function compareRows(actual,ref,ordered){if(actual.length!==ref.length)return false;if(!actual.length)return true;if(actual[0].length!==ref[0].length)return false;if(ordered)return actual.every((row,i)=>row.every((v,j)=>same(v,ref[i][j])));const a=[...actual].sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y))),b=[...ref].sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));return a.every((row,i)=>row.every((v,j)=>same(v,b[i][j])));}
function updateSampleButtons(){
 $('checkSampleOne').disabled=state.working;
 $('checkSampleTwo').disabled=state.working||sampleOneQuery!==$('sqlInput').value;
 $('loadSampleExample').disabled=state.working;
}
function resetSamples(){
 sampleOneQuery=null;
 for(const id of ['sampleOneResult','sampleTwoResult']){
  $(id).textContent='';
  delete $(id).dataset.outcome;
 }
 $('sampleEvidence').hidden=true;
 $('sampleInvoices').replaceChildren();
 updateSampleButtons();
}
function showSampleResult(sample,result,query){
 const actual=result.rows[0]?.[0];
 const reference=result.reference.rows[0][0];
 const scalar=result.count===1&&result.columns.length===1&&Number.isFinite(actual);
 const matches=scalar&&same(actual,reference);
 const status=$(sample===1?'sampleOneResult':'sampleTwoResult');
 const outcome=scalar?'Your total '+usd.format(actual)+'. Expected '+usd.format(reference)+'.':'Return one numeric total in one column.';
 status.textContent='Sample '+sample+(matches?' passed. ':' needs another look. ')+outcome;
 status.dataset.outcome=matches?'pass':'fail';
 if(sample===1&&matches)sampleOneQuery=query;
 if(sample===2){
  const invoices=result.sampleInvoices.map(([id,total])=>[id,usd.format(total)]);
  $('sampleInvoices').replaceChildren(makeTable(['Invoice ID','Invoice total'],invoices));
  $('sampleEvidence').hidden=false;
 }
 updateSampleButtons();
}
function run(check=false,sample=0){
 if(state.working)return;remember();const ex=current();if(check&&!ex)return;
 const query=input().value;
 if(sample&&($('sampleChallenge').hidden||(sample===2&&query!==sampleOneQuery)))return;
 if(sample===1)resetSamples();
 const sampleStatus=sample?$(sample===1?'sampleOneResult':'sampleTwoResult'):null;
 const reportError=message=>{
  if(!sample){feedback(message,'error');return;}
  if(query!==$('sqlInput').value)return;
  sampleStatus.textContent=message;
  sampleStatus.dataset.outcome='fail';
 };
 if(state.studio==='excel'&&!state.data){feedback('The data is loading. Wait a moment or select the dataset again.','error');return;}
 if(!query.trim()){reportError('Enter a solution in the editor first.');input().focus();return;}
 stop();state.working=true;$('runButton').disabled=true;$('checkButton').disabled=true;$('runButton').textContent='Running…';
 if(sample){
  sampleStatus.textContent='Running Sample '+sample+'…';
  delete sampleStatus.dataset.outcome;
 }else $('feedback').hidden=true;
 updateSampleButtons();
 const worker=new Worker(state.studio==='sql'?'sql-worker.js':'excel-worker.js');state.worker=worker;
 state.timer=setTimeout(()=>{stop();reportError('The calculation reached the eight-second limit. Try a smaller query or formula.');},8000);
 worker.onerror=()=>{if(state.worker!==worker)return;stop();reportError('Could not start the calculation engine. Reload the page to try again.');};
 worker.onmessage=e=>{if(state.worker!==worker)return;const r=e.data;stop();if(!r.ok){reportError(r.error);return;}
  if(sample){if(query===$('sqlInput').value)showSampleResult(sample,r,query);return;}
  $('exportButton').disabled=false;$('timing').textContent=r.ms+' ms';
  if(state.studio==='sql'){
   state.last={headers:r.columns,rows:r.rows};$('resultCount').textContent=r.count+' '+(r.count===1?'row':'rows');$('resultArea').replaceChildren(makeTable(r.columns,r.rows.slice(0,200)));
   $('tableFooter').hidden=false;$('tableFooter').textContent='Showing '+Math.min(r.count,200)+' of '+r.count+' rows. Export the CSV to see all rows.';
   if(!r.count)feedback('The query returned zero rows. Check the filters.');
   if(check){const expected=r.reference;const pass=r.columns.length===expected.columns.length&&compareRows(r.rows,expected.rows,ex.ordered);if(pass){passed(ex);}else{let reason=r.count!==expected.count?'Your answer has '+r.count+' rows. The reference result has '+expected.count+'.':r.columns.length!==expected.columns.length?'Check the number and order of columns.':'Check the values'+(ex.ordered?' and the sort order':'')+'.';feedback('The results differ. '+reason+' Try a hint and run it again.','error');}}
  }else{
   const summary=$('formulaMode').value==='summary';const resultRows=summary?[[r.results[0]]]:state.data.rows.map((row,i)=>[...row,r.results[i]]);const headers=summary?['Result']:[...state.data.headers,'Result'];state.last={headers,rows:resultRows.map(row=>row.map(v=>v&&typeof v==='object'?(v.error||v.value):v))};$('resultCount').textContent=r.results.length+' '+(summary?'calculation':r.results.length===1?'row':'rows');$('resultArea').replaceChildren(makeTable(headers,resultRows.slice(0,200),{index:!summary,computed:headers.length-1}));$('tableFooter').hidden=false;$('tableFooter').textContent=summary?'One calculation on the selected dataset.':'The formula was applied to '+r.results.length+' rows. Showing the first '+Math.min(200,r.results.length)+'.'+(r.errors?' '+r.errors+' rows have errors.':'');
   if(r.errors)feedback(r.errors+' '+(r.errors===1?'row has a formula error.':'rows have formula errors.')+' Check the result column.','error');
   if(check){const pass=$('formulaMode').value===ex.mode&&!r.errors&&r.results.length===r.reference.length&&r.results.every((v,i)=>!r.reference[i].error&&same(v.value,r.reference[i].value));if(pass)passed(ex);else feedback('The results differ. '+($('formulaMode').value!==ex.mode?'Select '+(ex.mode==='summary'?'one summary calculation':'one calculation per row')+'.':r.errors?'Fix the formula errors shown in the result column.':'Some rows differ from the reference result.')+' Try a hint and calculate again.','error');}
  }
 };
 if(state.studio==='sql')worker.postMessage({sql:query,database:datasets[state.dataset].file,expected:check?ex.answer:null,sample});
 else worker.postMessage({formula:query,data:state.data,mode:$('formulaMode').value,expected:check?ex.answer:null});
}
function passed(ex){state.completed.add(ex.id);persist();list();feedback('✓ Your result matches the reference. '+(ex.id==='p3'?'Review the source rows with zero hours.':'Can you explain why your method works?'),'success');}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csv(headers,rows){return '\uFEFF'+[headers,...rows].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');}
$('sqlTab').onclick=()=>{if(state.studio!=='sql')setStudio('sql');};$('excelTab').onclick=()=>{if(state.studio!=='excel')setStudio('excel');};
$('dataset').onchange=()=>{remember();state.dataset=$('dataset').value;state.index=0;state.play=false;renderTask();renderContext();};
$('playButton').onclick=()=>{remember();state.play=true;renderTask();};
$('runButton').onclick=()=>run();$('checkButton').onclick=()=>run(true);
$('checkSampleOne').onclick=()=>run(true,1);
$('checkSampleTwo').onclick=()=>run(true,2);
$('loadSampleExample').onclick=()=>{
 $('sqlInput').value='SELECT SUM(DISTINCT Total) FROM Invoice;';
 $('sqlInput').dispatchEvent(new Event('input'));
 $('sqlInput').focus();
};
$('hintButton').onclick=()=>{$('hint').hidden=!$('hint').hidden;$('hintButton').textContent=$('hint').hidden?'✧ Show hint':'✧ Hide hint';};
$('solutionButton').onclick=()=>{$('solution').hidden=!$('solution').hidden;$('solutionButton').textContent=$('solution').hidden?'Show worked solution ↗':'Hide worked solution ↑';};
$('useSolution').onclick=()=>{input().value=current().answer;$('formulaMode').value=current().mode||'rows';input().dispatchEvent(new Event('input'));input().focus();};
$('resetButton').onclick=()=>{stop();delete state.drafts[key()];persist();renderTask();};
$('sqlInput').oninput=()=>{updateLines();resetSamples();remember();};$('formulaInput').oninput=remember;$('formulaMode').onchange=()=>{stop();remember();clearResults();};
for(const el of [$('sqlInput'),$('formulaInput')])el.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();}if(e.key==='Tab'){e.preventDefault();el.setRangeText('  ',el.selectionStart,el.selectionEnd,'end');el.dispatchEvent(new Event('input'));}});
$('sqlInput').onscroll=()=>{$('lineNumbers').scrollTop=$('sqlInput').scrollTop;};
$('exportButton').onclick=()=>{if(state.last)download(new Blob([csv(state.last.headers,state.last.rows)],{type:'text/csv;charset=utf-8'}),'accounting-lab-results.csv');};
$('downloadButton').onclick=()=>{const ds=datasets[state.dataset];if(state.studio==='sql'){const a=document.createElement('a');a.href=ds.file;a.download=ds.file.split('/').pop();a.click();}else if(state.data)download(new Blob([csv(state.data.headers,state.data.rows)],{type:'text/csv;charset=utf-8'}),state.dataset+'.csv');};
$('helpButton').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();$('startHelp').onclick=()=>$('helpDialog').close();$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=$('helpDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('helpDialog').close();}});
['songs','chinook','movies','pcards'].forEach(id=>{const opt=document.createElement('option');opt.value=id;opt.textContent=datasets[id].name;$('dataset').append(opt);});
renderTask();renderContext();

// Deep links used by the practice bank and embedded exam workspace.
(function(){
 const p=new URLSearchParams(location.search),ds=p.get('dataset'),id=p.get('exercise');
 if(ds&&datasets[ds]){const type=datasets[ds].schema?'sql':'excel';setStudio(type);state.dataset=ds;$('dataset').value=ds;const ix=exercises[ds].findIndex(x=>x.id===id);state.index=ix<0?0:ix;renderTask();renderContext();}
 if(p.get('embed')==='1')document.body.classList.add('embedded-lab');
 if(p.get('exam')==='1'){for(const id of ['solutionButton','hintButton','checkButton'])$(id).hidden=true;}
})();
