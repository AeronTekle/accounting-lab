importScripts('assets/sql-wasm.js');
self.onmessage=async function(e){
 let db;
 try{
  const {sql,database,expected}=e.data;
  const statement=sql.replace(/^(?:\s+|--[^\n]*|\/\*[\s\S]*?\*\/)*/, '');
  if(!/^(SELECT\b|WITH\b|EXPLAIN\b)/i.test(statement))throw Error('Use a SELECT query. The database is read-only.');
  const SQL=await initSqlJs({locateFile:f=>'assets/'+f});
  const res=await fetch(database);if(!res.ok)throw Error('Could not load the database. Try again.');
  db=new SQL.Database(new Uint8Array(await res.arrayBuffer()));db.run('PRAGMA query_only = ON;');
  function run(q){const stmt=db.prepare(q);try{let rows=[],count=0;const columns=stmt.getColumnNames();while(stmt.step()){if(count>=10000)throw Error('The result exceeds 10,000 rows. Narrow it with WHERE or LIMIT.');rows.push(stmt.get());count++;}return {columns,rows,count};}finally{stmt.free();}}
  const start=performance.now();const actual=run(sql);const reference=expected?run(expected):null;
  self.postMessage({ok:true,...actual,reference,ms:Math.round(performance.now()-start)});
 }catch(error){self.postMessage({ok:false,error:error.message});}finally{if(db)db.close();}
};
