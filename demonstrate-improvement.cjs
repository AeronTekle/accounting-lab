const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'dist'),init=require(path.join(root,'assets/sql-wasm.js'));
(async()=>{const SQL=await init({locateFile:f=>path.join(root,'assets',f)}),db=new SQL.Database(fs.readFileSync(path.join(root,'assets/chinook.sqlite')));
const queries={reference:'SELECT SUM(Total) FROM Invoice;',alternative:'SELECT SUM(UnitPrice*Quantity) FROM InvoiceLine;',incorrect:'SELECT SUM(i.Total) FROM Invoice i JOIN InvoiceLine il ON il.InvoiceId=i.InvoiceId;'};
const values=Object.fromEntries(Object.entries(queries).map(([k,q])=>[k,db.exec(q)[0].values[0][0]]));db.close();
assert(Math.abs(values.reference-2328.6)<1e-8);assert(Math.abs(values.reference-values.alternative)<1e-7);assert(Math.abs(values.reference-values.incorrect)>1);
const database='assets/chinook.sqlite';
let response;
const worker=vm.createContext({
 performance,
 importScripts(){},
 initSqlJs:async()=>SQL,
 fetch:async file=>({ok:true,arrayBuffer:async()=>fs.readFileSync(path.join(root,file))}),
 self:{postMessage(result){response=result;}}
});
vm.runInContext(fs.readFileSync(path.join(root,'sql-worker.js'),'utf8'),worker);
async function run(sql,sample){
 await worker.self.onmessage({data:{sql,database,expected:queries.reference,sample}});
 return response;
}
const distinct='SELECT SUM(DISTINCT Total) FROM Invoice;';
const dollars=value=>Number(value.toFixed(2));
const samples=[];
for(const [sample,ids,expected,distinctTotal] of [[1,[1,2],5.94,5.94],[2,[1,7],3.96,1.98]]){
 const result=await run(distinct,sample);
 assert(result.ok,result.error);
 assert.deepEqual(Array.from(result.sampleInvoices,row=>row[0]),ids);
 assert.equal(dollars(result.reference.rows[0][0]),expected);
 assert.equal(dollars(result.rows[0][0]),distinctTotal);
 for(const query of [queries.reference,queries.alternative]){
  const correct=await run(query,sample);
  assert(correct.ok,correct.error);
  assert.equal(dollars(correct.rows[0][0]),expected);
 }
 const write=await run('WITH a AS (SELECT 1) DELETE FROM Invoice;',sample);
 assert.equal(write.ok,false);
 assert.match(write.error,/readonly/i);
 samples.push({sample,invoices:result.sampleInvoices,expected,distinct_total:distinctTotal});
}
const full=await run(queries.reference);
assert(full.ok,full.error);
assert.equal(dollars(full.rows[0][0]),2328.60);
const evidence={dataset:'Complete supplied Chinook_Sqlite.sqlite',queries,values,alternative_correct_query_matches:true,incorrect_join_rejected:true,interpretation:'The incorrect join repeats each invoice total for every matching line. A query can execute successfully and still overstate the requested measure. Equivalent results are accepted without demanding identical SQL text.',sample_challenge:{query:distinct,samples},limits:'This verifies computational behaviour, not improved student learning, causal educational effects or a guaranteed assignment grade.'};
fs.writeFileSync(path.join(__dirname,'improvement-evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
