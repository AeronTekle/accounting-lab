'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
const base='http://127.0.0.1:8765/exams.html';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(){
 for(let i=0;i<45;i++){try{const r=await fetch(base);if(r.ok)return;}catch{}await sleep(200);}
 throw new Error('Local website did not start');
}
async function main(){
 await ready();
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#loading').waitFor({state:'hidden',timeout:25000});
  await page.locator('#chooseManipulation').click();
  await page.locator('#selectedTrack').waitFor({state:'visible'});
  await page.locator('#openQuestionBank').click();
  assert.equal(await page.locator('#subjectFilter').inputValue(),'manipulation');
  assert.match(await page.locator('#bankCount').innerText(),/questions/);
  console.log('PASS: data manipulation navigation and question bank filtering');
  await page.goto(base+'?question=e2');
  const excel=page.frameLocator('#responseArea iframe');
  await excel.locator('#formulaInput').waitFor({state:'visible',timeout:20000});
  await excel.locator('#formulaInput').fill('=LEN(A2)');
  await excel.locator('#runButton').click();
  await excel.locator('#resultCount').waitFor({state:'visible',timeout:10000});
  await page.waitForFunction(()=>{const f=document.querySelector('#responseArea iframe');const d=f?.contentDocument;return d&&d.querySelector('#resultCount')?.textContent!=='Ready for your next attempt';},{timeout:15000});
  console.log('PASS: embedded Excel formula executed');
  await page.goto(base+'?question=c2');
  const sql=page.frameLocator('#responseArea iframe');
  await sql.locator('#sqlInput').waitFor({state:'visible',timeout:20000});
  await sql.locator('#sqlInput').fill('SELECT SUM(Total) FROM Invoice;');
  await sql.locator('#runButton').click();
  try{
   await page.waitForFunction(()=>{const d=document.querySelector('#responseArea iframe')?.contentDocument;return d&&/2,328[.]6|2328[.]6/.test(d.querySelector('#resultArea')?.innerText||'');},undefined,{timeout:15000});
  }catch(error){
   console.error('SQL browser diagnostic:',await sql.locator('#resultArea').innerText(),await sql.locator('#feedback').innerText());
   throw error;
  }
  console.log('PASS: embedded SQLite query returned known invoice total');
  await page.goto(base+'?exam=M02');
  await page.locator('#startTimer').click();
  await page.locator('#questionNav button').last().click();
  const timed=page.frameLocator('#responseArea iframe');
  await timed.locator('#sqlInput').waitFor({state:'visible',timeout:20000});
  for(const query of ['SELECT SUM(i.Total) FROM Invoice i JOIN InvoiceLine l ON l.InvoiceId=i.InvoiceId;','SELECT SUM(Total) FROM Invoice;']){
   await timed.locator('#sqlInput').fill(query);
   await timed.locator('#runButton').click();
   await page.waitForFunction(()=>document.querySelector('#responseArea iframe')?.contentDocument?.getElementById('runButton')?.disabled===false,undefined,{timeout:15000});
   await sleep(350);
  }
  await page.locator('#finishExam').click();
  await page.locator('#reviewSummary').getByText('Exam replay').waitFor({state:'visible'});
  assert((await page.locator('#reviewSummary .replay-table-wrap tbody tr').count())>=5);
  await page.locator('#reviewSummary .replay-table-wrap tbody tr').last().getByRole('button',{name:/Replay/}).click();
  await page.locator('#replayDialog').waitFor({state:'visible'});
  console.log('PASS: Exam Replay includes completed exam and opens recorded SQL versions');
  await page.reload();
  await page.locator('#loading').waitFor({state:'hidden',timeout:25000});
  await page.locator('#timedTab').click();
  await page.getByText('Recent exam replays').waitFor({state:'visible'});
  console.log('PASS: completed Exam Replay survives reload in browser storage');
  assert.equal(errors.length,0,'Browser JavaScript errors: '+errors.join('; '));
  console.log('BROWSER SMOKE TESTS PASSED');
 }finally{await browser.close();}
}
main().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>server.kill());
