importScripts('assets/sql-wasm.js');
self.onmessage=async function(e){
 let db;
 try{
  const {sql,database,expected}=e.data;
  if(!/^\s*(SELECT\b|WITH\b|EXPLAIN\b)/i.test(sql))throw Error('Brug en SELECT-forespørgsel. Databasen er skrivebeskyttet.');
  const SQL=await initSqlJs({locateFile:f=>'assets/'+f});
  const res=await fetch(database);if(!res.ok)throw Error('Databasen kunne ikke hentes. Prøv igen.');
  db=new SQL.Database(new Uint8Array(await res.arrayBuffer()));db.run('PRAGMA query_only = ON;');
  function run(q){const stmt=db.prepare(q);try{let rows=[],count=0;const columns=stmt.getColumnNames();while(stmt.step()){if(count>=10000)throw Error('Resultatet har mere end 10.000 rækker. Afgræns med WHERE eller LIMIT.');rows.push(stmt.get());count++;}return {columns,rows,count};}finally{stmt.free();}}
  const start=performance.now();const actual=run(sql);const reference=expected?run(expected):null;
  self.postMessage({ok:true,...actual,reference,ms:Math.round(performance.now()-start)});
 }catch(error){self.postMessage({ok:false,error:error.message});}finally{if(db)db.close();}
};
