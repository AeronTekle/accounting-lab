export function createHandler(data,assets,runExperiment){return async function(request,env={}){
 const u=new URL(request.url),headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const json=(obj,status=200)=>Response.json(obj,{status,headers});
 if(request.method==='GET'&&u.pathname==='/api/config')return json({configured:!!env.GEMINI_API_KEY,model:env.GEMINI_MODEL||'gemini-3.1-flash-lite'});
 if(request.method==='POST'&&u.pathname==='/api/solve'){
  const origin=request.headers.get('origin');if(origin&&origin!==u.origin)return json({error:'Cross-origin requests are not allowed.'},403);
  if(Number(request.headers.get('content-length')||0)>500000)return json({error:'Request too large.'},413);
  try{const text=await request.text();if(text.length>500000)return json({error:'Request too large.'},413);return json(await runExperiment(JSON.parse(text),data,env));}catch(e){return json({error:e.message},400);}
 }
 if(request.method==='GET'&&assets[u.pathname]){const [body,type]=assets[u.pathname];return new Response(body,{headers:{...headers,'Content-Type':type,'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'"}});}
 return json({error:'Not found'},404);
};}
