"""Verify the submitted evidence without making any model/API calls."""
import csv,json,collections
from pathlib import Path
from engine import prepare,evaluate_routes
REF=Path(__file__).resolve().parents[2];E=REF/'Evidence';checks=[]
def check(ok,text):
 if not ok:raise AssertionError(text)
 checks.append(text)
def main():
 web=json.loads((E/'Website/website_evidence.json').read_text());ort=json.loads((E/'OR_Tools/ortools_evidence.json').read_text())['experiments'];llms={x['id']:x for x in web['experiments']};ors={x['scenario_id']:x for x in ort}
 check(len(web['experiments'])==14,'14 actual API attempts retained; no existing-dispatch replay.')
 check(all(x['result']['method']=='llm'for x in web['experiments']),'All website evidence records are LLM API attempts.')
 for x in web['experiments']:
  r=x['result'];req={k:v for k,v in x['request'].items()if k not in ['method','extra_prompt']};ls,_,cfg,travel,demand=prepare(req)
  check(ls==r['dataset']['locations']and travel==r['dataset']['effective_travel_minutes']and demand==r['dataset']['effective_demand'],x['id']+': stored inputs match student CSVs and scenario settings.')
  check(bool(r['prompt'])and bool(r['api']['request'])and bool(r['api']['raw_response']),x['id']+': prompt, exact request and raw response retained.')
  raw=json.loads(r['api']['raw_response'])
  if r['api']['http_status']==200:
   text=''.join(p.get('text','')for p in raw['candidates'][0]['content']['parts']if not p.get('thought'));check(text==r['model_text'],x['id']+': saved model text matches raw provider response.')
   proposal=json.loads(text);check(proposal==r['model_proposal'],x['id']+': proposal is the actual returned JSON.')
   replay=evaluate_routes(proposal['routes'],ls,travel,demand,cfg)
   check(replay['valid']==r['valid']and replay['total_cost_dkk']==r['total_cost_dkk']and replay['total_paid_minutes']==r['total_paid_minutes'],x['id']+': Python independently agrees with website validity, paid time and cost.')
  else:check(r['status']=='API_ERROR'and not r['routes'],x['id']+': service failure retained without inventing a route.')
 for x in ort:
  if x.get('valid'):
   ls,_,cfg,travel,demand=prepare(x['request']);replay=evaluate_routes([r['customers']for r in x['routes']],ls,travel,demand,cfg)
   check(replay['valid']and replay['total_cost_dkk']==x['total_cost_dkk']==x['solver_objective_dkk'],x['scenario_id']+': independent validation agrees with solver objective.')
 rows=list(csv.DictReader((E/'Comparison/comparison.csv').open()))
 check(len(rows)==16,'Comparison contains eight scenarios for both methods.')
 for row in rows:
  r=llms[row['record_id']]['result']if row['method']=='Gemini'else ors[row['scenario']]
  check(row['status']==r['status']and float(row['runtime_seconds'])==round(r['elapsed_seconds'],3),'Comparison status/runtime match original evidence: '+row['scenario']+' '+row['method'])
  check(row['valid_cost_dkk']==(str(r['total_cost_dkk'])if r.get('valid')else''),'Invalid costs excluded from comparison: '+row['scenario']+' '+row['method'])
  if row['method']=='Gemini':
   o=ors[row['scenario']];check(o['config']==r['config']and o['dataset']==r['dataset'],'Identical paired inputs: '+row['scenario'])
 w=json.loads((E/'Comparison/window_two_witness.json').read_text());ls,_,cfg,travel,demand=prepare(w['request']);q=evaluate_routes([r['customers']for r in w['evaluation']['routes']],ls,travel,demand,cfg)
 check(q['valid']and q['used_vehicles']==2 and q['total_cost_dkk']==2756,'Changed-window two-route witness remains feasible under a two-van limit.')
 ls,_,cfg,travel,demand=prepare(ors['normal_two']['request']);chosen=ors['normal_two']['routes'][0];ids={l['id']:i for i,l in enumerate(ls)};t=0;prev=0;load=0;drive=0;service=0;wait=0
 for cid in chosen['customers']:
  i=ids[cid];arrival=t+travel[prev][i];begin=max(arrival,ls[i]['open_minute']);t=begin+ls[i]['service_minutes'];check(t<=ls[i]['close_minute'],'Worked route full service fits window: '+cid);drive+=travel[prev][i];wait+=begin-arrival;service+=ls[i]['service_minutes'];load+=demand[i];prev=i
 t+=travel[prev][0];drive+=travel[prev][0]
 check((load,drive,service,wait,t,500+4*t)==(99,109,112,0,221,1384),'Worked route independent arithmetic: load99, drive109, service112, waiting0, return221, cost1384.')
 allids=[cid for r in ors['normal_two']['routes']for cid in r['customers']];check(len(allids)==25 and set(allids)==set(ids)-{'D0'} and len(set(allids))==25,'Normal two-van solution covers all 25 customers exactly once.')
 check(sum(prepare({'config':{'demand_multiplier':1.3}})[4])==240,'Rounded higher demand is 240; two 100-unit vans cannot carry it.')
 counts=collections.Counter(x['result']['status']for x in web['experiments']);check(counts['API_ERROR']==6 and counts['INVALID_LLM_PLAN']==5 and counts['FEASIBLE_NOT_PROVEN_OPTIMAL']==3,'Actual API outcomes: 3 valid, 5 invalid, 6 service errors.')
 data=json.loads((REF/'Code/Website/data.json').read_text());student=REF.parent/'Student_Materials'
 check(data['locations_csv']==(student/'locations.csv').read_text()and data['matrix_csv']==(student/'travel_minutes.csv').read_text(),'Website bundled input data exactly matches the student CSVs.')
 prior=json.loads((E/'Verification.json').read_text()) if (E/'Verification.json').exists() else {};result={**prior,'status':'PASS','checks':checks,'count':len(checks),'scope':'Submitted historical results independently recomputed. No live API call or new student/peer feedback claimed.'};(E/'Verification.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS:',len(checks),'evidence and arithmetic checks.')
if __name__=='__main__':main()
