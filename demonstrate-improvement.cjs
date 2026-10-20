const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist'),init=require(path.join(root,'assets/sql-wasm.js'));
(async()=>{const SQL=await init({locateFile:f=>path.join(root,'assets',f)}),db=new SQL.Database(fs.readFileSync(path.join(root,'assets/chinook.sqlite')));
const queries={reference:'SELECT SUM(Total) FROM Invoice;',alternative:'SELECT SUM(UnitPrice*Quantity) FROM InvoiceLine;',incorrect:'SELECT SUM(i.Total) FROM Invoice i JOIN InvoiceLine il ON il.InvoiceId=i.InvoiceId;'};
const values=Object.fromEntries(Object.entries(queries).map(([k,q])=>[k,db.exec(q)[0].values[0][0]]));db.close();
assert(Math.abs(values.reference-2328.6)<1e-8);assert(Math.abs(values.reference-values.alternative)<1e-7);assert(Math.abs(values.reference-values.incorrect)>1);
const evidence={dataset:'Complete supplied Chinook_Sqlite.sqlite',queries,values,alternative_correct_query_matches:true,incorrect_join_rejected:true,interpretation:'The incorrect join repeats each invoice total for every matching line. A query can execute successfully and still overstate the requested measure. Equivalent results are accepted without demanding identical SQL text.',limits:'This verifies computational behaviour, not improved student learning, causal educational effects or a guaranteed assignment grade.'};
fs.writeFileSync(path.join(__dirname,'improvement-evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
