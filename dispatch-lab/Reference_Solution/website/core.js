// Ordinary route validation; no solver or model is involved in these calculations.
export const DEFAULTS={vehicles:3,capacity:100,shift_minutes:240,travel_multiplier:1,demand_multiplier:1,fixed_cost_dkk:500,minute_cost_dkk:4,search_seconds:3};
export function parseCSV(text){
 const rows=[];let row=[],field='',quote=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){field+='"';i++;}else quote=!quote;}
 else if(c===','&&!quote){row.push(field);field='';}else if(c==='\n'&&!quote){row.push(field.replace(/\r$/,''));if(row.some(x=>x!==''))rows.push(row);row=[];field='';}else field+=c;}
 if(quote)throw Error('Unclosed CSV quote.');if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}return rows;
}
export function prepare(payload={},data){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid request.');
 if(Object.keys(payload).some(k=>!['config','locations_csv','matrix_csv','window_change','method','extra_prompt'].includes(k)))throw Error('Unknown request field.');
 const cfg={...DEFAULTS,...payload.config};
 if(Object.keys(cfg).some(k=>!(k in DEFAULTS)))throw Error('Unknown configuration field.');
 for(const [k,lo,hi] of [['vehicles',1,5],['capacity',1,500],['shift_minutes',30,480],['fixed_cost_dkk',0,5000],['minute_cost_dkk',1,50],['search_seconds',1,10]])if(!Number.isInteger(cfg[k])||cfg[k]<lo||cfg[k]>hi)throw Error(`${k} must be an integer from ${lo} to ${hi}.`);
 for(const k of ['travel_multiplier','demand_multiplier'])if(typeof cfg[k]!=='number'||!Number.isFinite(cfg[k])||cfg[k]<.5||cfg[k]>3)throw Error('Invalid multiplier.');
 if(('locations_csv'in payload)!==('matrix_csv'in payload))throw Error('Upload both CSV files.');
 const lc=payload.locations_csv??data.locations_csv,mc=payload.matrix_csv??data.matrix_csv;
 if(typeof lc!=='string'||typeof mc!=='string')throw Error('CSV inputs must be text.');
 const rows=parseCSV(lc),header=rows.shift(),required=['id','name','demand','service_minutes','open_minute','close_minute','x','y'];
 if(header?.join(',')!==required.join(',')||rows.length<2||rows.length>40)throw Error('Use the supplied location header and 1–39 customers.');
 const locations=rows.map(row=>{if(row.length!==header.length)throw Error('Invalid CSV row.');const r=Object.fromEntries(header.map((k,i)=>[k,row[i]]));for(const k of required.slice(2)){if(!/^-?\d+$/.test(r[k]))throw Error('Numeric fields must be whole numbers.');r[k]=Number(r[k]);}if(!r.id||!r.name||r.demand<0||r.service_minutes<0||r.open_minute<0||r.open_minute>r.close_minute||r.close_minute>1440||Math.abs(r.x)>1000||Math.abs(r.y)>1000)throw Error('Invalid location.');return r;});
 const ids=locations.map(x=>x.id);if(ids[0]!=='D0'||new Set(ids).size!==ids.length)throw Error('Unique IDs with D0 first required.');
 if(locations[0].demand||locations[0].service_minutes||locations[0].open_minute||locations.slice(1).some(l=>l.demand<=0||l.service_minutes<=0))throw Error('Invalid depot or customer demand/service.');
 const table=parseCSV(mc);if(table.length!==ids.length+1||table[0].join(',')!==['id',...ids].join(','))throw Error('Matrix must match location IDs in order.');
 const matrix=table.slice(1).map((row,i)=>{if(row.length!==ids.length+1||row[0]!==ids[i])throw Error('Invalid matrix row.');return row.slice(1).map((x,j)=>{if(!/^\d+$/.test(x)||Number(x)>1440||(i===j?Number(x)!==0:Number(x)<=0))throw Error('Invalid journey time.');return Number(x);});});
 if(payload.window_change){const c=payload.window_change,l=locations.slice(1).find(l=>l.id===c.id);if(!l||!Number.isInteger(c.open_minute)||!Number.isInteger(c.close_minute)||c.open_minute<0||c.open_minute>c.close_minute||c.close_minute>1440)throw Error('Invalid window change.');Object.assign(l,{open_minute:c.open_minute,close_minute:c.close_minute});}
 return {config:cfg,dataset:{locations,travel_minutes:matrix,effective_travel_minutes:matrix.map(row=>row.map(v=>Math.ceil(v*cfg.travel_multiplier))),effective_demand:locations.map(l=>Math.ceil(l.demand*cfg.demand_multiplier))},source_inputs:{locations_csv:lc,matrix_csv:mc,window_change:payload.window_change??null}};
}
export function evaluate(raw,p){
 const {config:c,dataset:d}=p,errors=[],output=[],seen=[],ids=new Map(d.locations.map((l,i)=>[l.id,i]));
 if(!Array.isArray(raw)||raw.some(r=>!Array.isArray(r))){return {valid:false,errors:['Expected routes as an array of customer-ID arrays.'],routes:[],used_vehicles:0,customers_served:0,total_cost_dkk:0,total_drive_minutes:0,total_paid_minutes:0,total_wait_minutes:0};}
 if(raw.length>c.vehicles)errors.push('Too many vehicle routes.');
 for(const [v,r] of raw.entries()){
  if(!r.length){errors.push(`Route ${v+1} is empty; omit unused vans.`);continue;}
  if(r.some(id=>typeof id!=='string'||!ids.has(id)||id==='D0')){errors.push(`Route ${v+1} contains invalid customer IDs.`);continue;}
  let t=0,prev=0,drive=0,wait=0,load=0;const stops=[];
  for(const id of r){const j=ids.get(id),l=d.locations[j],leg=d.effective_travel_minutes[prev][j],arrival=t+leg,start=Math.max(arrival,l.open_minute),finish=start+l.service_minutes;drive+=leg;wait+=start-arrival;load+=d.effective_demand[j];seen.push(id);if(finish>l.close_minute)errors.push(`${id}: service ends after its window closes.`);stops.push({id,arrival_minute:arrival,start_minute:start,finish_minute:finish,wait_minutes:start-arrival,demand:d.effective_demand[j]});t=finish;prev=j;}
  drive+=d.effective_travel_minutes[prev][0];t+=d.effective_travel_minutes[prev][0];
  if(load>c.capacity)errors.push(`Route ${v+1}: capacity exceeded (${load}>${c.capacity}).`);
  if(t>Math.min(c.shift_minutes,d.locations[0].close_minute))errors.push(`Route ${v+1}: returns after shift/depot closing time.`);
  let remaining=load;for(const s of stops){remaining-=s.demand;s.load_remaining=remaining;}
  output.push({vehicle:v+1,customers:r,load,return_minute:t,drive_minutes:drive,wait_minutes:wait,service_minutes:stops.reduce((a,s)=>a+s.finish_minute-s.start_minute,0),cost_dkk:c.fixed_cost_dkk+c.minute_cost_dkk*t,stops});
 }
 const missing=d.locations.slice(1).map(l=>l.id).filter(id=>!seen.includes(id)),duplicates=[...new Set(seen.filter((id,i)=>seen.indexOf(id)!==i))];if(missing.length)errors.push('Missing customers: '+missing.join(', '));if(duplicates.length)errors.push('Duplicate visits: '+duplicates.join(', '));
 return {valid:errors.length===0,errors,routes:output,used_vehicles:output.length,customers_served:new Set(seen).size,total_cost_dkk:output.reduce((a,r)=>a+r.cost_dkk,0),total_drive_minutes:output.reduce((a,r)=>a+r.drive_minutes,0),total_paid_minutes:output.reduce((a,r)=>a+r.return_minute,0),total_wait_minutes:output.reduce((a,r)=>a+r.wait_minutes,0)};
}
export function makePrompt(p,extra=''){
 return `Plan Northline deliveries. Minimise total DKK cost subject to ALL rules. Every customer exactly once. No split orders or reloads. Each used van leaves D0 at minute 0 (08:00). Return to D0 by min(shift_minutes,depot close_minute). Full service must finish within the customer's window; wait if early. Each van's starting load is the sum of its deliveries and must not exceed capacity. Cost per used van = fixed_cost_dkk + minute_cost_dkk * return minute (includes driving, waiting, service and depot return). Unused vans cost zero. Travel and demand below are ALREADY multiplied and rounded up; do NOT scale again. Do not use coordinates to estimate travel. Return JSON only: {"routes":[["C01",...],...],"reason":"brief explanation"}. Omit unused vans and D0 from routes. If no feasible plan can be found, return routes:[] and explain; do not claim a proof unless you provide a valid bound. No code or tools are available.\nSETTINGS\n${JSON.stringify(p.config)}\nLOCATIONS (demand replaced by effective demand)\n${JSON.stringify(p.dataset.locations.map((l,i)=>({...l,demand:p.dataset.effective_demand[i]})))}\nTRAVEL MATRIX in location order above\n${JSON.stringify(p.dataset.effective_travel_minutes)}${extra?'\nADDITIONAL PLANNING GUIDANCE\n'+extra:''}`;
}
export async function runExperiment(payload,data,env,fetcher=fetch){
 const started=performance.now(),p=prepare(payload,data),method=payload.method??'llm';
 if(!['llm','baseline'].includes(method))throw Error('Unknown method.');
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({config:p.config,dataset:p.dataset})));
 const base={...p,recorded_at:new Date().toISOString(),method,input_sha256:[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join(''),optimality_proven:false,routes:[],explanation:[],errors:[]};
 if(method==='baseline'){const check=evaluate(data.current_plan,p);return {...base,...check,status:check.valid?'FEASIBLE_BASELINE':'INVALID_BASELINE',explanation:['Replay of the supplied three-van dispatch, without redesign.'],elapsed_seconds:(performance.now()-started)/1000};}
 if(!env.GEMINI_API_KEY)throw Error('Gemini is not configured. Set GEMINI_API_KEY on the server.');
 const extra=payload.extra_prompt??'';if(typeof extra!=='string'||extra.length>3000)throw Error('Planning guidance must be at most 3000 characters.');
 const model=env.GEMINI_MODEL||'gemini-3.1-flash-lite';if(!/^[a-zA-Z0-9._-]+$/.test(model))throw Error('Invalid server model configuration.');
 const prompt=makePrompt(p,extra),request={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0,maxOutputTokens:8192,responseMimeType:'application/json'}};
 const result={...base,api:{provider:'Google Gemini',model,request,raw_response:null,http_status:null},prompt,status:'API_ERROR',valid:false};
 try{
  const res=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
  result.api.http_status=res.status;const raw=await res.text();result.api.raw_response=raw;
  if(!res.ok){result.explanation=['Gemini API returned HTTP '+res.status+'. This attempt is retained; no automatic retry was made.'];}
  else{
   const body=JSON.parse(raw),text=(body.candidates?.[0]?.content?.parts||[]).filter(x=>!x.thought).map(x=>x.text||'').join('');result.model_text=text;
   try{const parsed=JSON.parse(text);result.model_proposal=parsed;if(!parsed||!Array.isArray(parsed.routes)||parsed.routes.some(r=>!Array.isArray(r)||r.some(id=>typeof id!=='string')))throw Error('Expected an object with customer-ID arrays under routes.');const check=evaluate(parsed.routes,p);Object.assign(result,check);result.status=check.valid?'FEASIBLE_NOT_PROVEN_OPTIMAL':parsed.routes.length?'INVALID_LLM_PLAN':'NO_PLAN_RETURNED';result.explanation=[typeof parsed.reason==='string'?parsed.reason:'Model supplied no explanation.','All schedules and costs were recalculated from the supplied inputs. Invalid-plan costs are excluded from savings comparisons.'];}
   catch(e){result.status='MALFORMED_RESPONSE';result.errors=[e.message];result.explanation=['The raw Gemini response is retained without repair.'];}
  }
 }catch(e){result.explanation=['API request failed: '+e.message+'. No automatic retry was made.'];}
 const demand=p.dataset.effective_demand.reduce((a,b)=>a+b,0);if(demand>p.config.vehicles*p.config.capacity)result.independent_bound=`Total demand ${demand} exceeds fleet capacity ${p.config.vehicles*p.config.capacity}. This proves infeasibility regardless of the model response.`;
 result.elapsed_seconds=Math.round((performance.now()-started))/1000;return result;
}
