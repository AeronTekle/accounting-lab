"""Independently recompute stored schedules and worked route arithmetic."""
import csv,json
from pathlib import Path
from engine import prepare,evaluate_routes
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'results'
def main():
 d=json.loads((OUT/'ortools_evidence.json').read_text());checks=[]
 for r in d['experiments']:
  if r.get('valid'):
   ls,_,cfg,travel,demand=prepare(r['request']);replay=evaluate_routes([x['customers']for x in r['routes']],ls,travel,demand,cfg)
   assert replay['valid'] and replay['total_cost_dkk']==r['solver_objective_dkk']==r['total_cost_dkk'];checks.append(r['scenario_id']+': independent replay agrees with solver objective')
 chosen=next(r for r in d['experiments']if r['scenario_id']=='normal_two');route=chosen['routes'][0];locations,matrix,cfg,travel,demands=prepare(chosen['request']);lookup={l['id']:i for i,l in enumerate(locations)}
 rows=[];time=0;previous=0;load=0
 for cid in route['customers']:
  j=lookup[cid];l=locations[j];leg=travel[previous][j];arrival=time+leg;begin=max(arrival,l['open_minute']);finish=begin+l['service_minutes'];assert finish<=l['close_minute'];load+=demands[j]
  rows.append({'from':locations[previous]['id'],'customer':cid,'journey_minutes':leg,'arrival_minute':arrival,'window_open':l['open_minute'],'window_close':l['close_minute'],'waiting_minutes':begin-arrival,'service_start':begin,'service_minutes':l['service_minutes'],'service_finish':finish,'demand':demands[j]});time=finish;previous=j
 home=travel[previous][0];returned=time+home;cost=500+4*returned
 assert load==route['load']<=100 and returned==route['return_minute']<=240 and cost==route['cost_dkk']
 coverage=[cid for v in chosen['routes']for cid in v['customers']];assert len(coverage)==25 and len(set(coverage))==25 and set(coverage)==set(lookup)-{'D0'}
 worked={'scenario':'normal_two','vehicle':route['vehicle'],'customer_order':route['customers'],'load_terms':[r['demand']for r in rows],'total_load':load,'outbound_and_between_legs':[r['journey_minutes']for r in rows],'return_leg':home,'total_driving_minutes':sum(r['journey_minutes']for r in rows)+home,'total_service_minutes':sum(r['service_minutes']for r in rows),'total_waiting_minutes':sum(r['waiting_minutes']for r in rows),'return_minute':returned,'cost_arithmetic':f'500 + 4 × {returned} = {cost}','route_cost_dkk':cost,'all_routes_customer_count':len(coverage),'distinct_customers':len(set(coverage)),'missing_customers':[],'duplicate_customers':[],'stops':rows}
 (OUT/'worked_route_check.json').write_text(json.dumps(worked,indent=2)+'\n')
 with (OUT/'worked_route_check.csv').open('w',newline='')as f:w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
 web=OUT/'website_evidence.json'
 if web.exists():
  for e in json.loads(web.read_text())['experiments']:
   r=e['result']
   if 'model_proposal'in r and isinstance(r['model_proposal'].get('routes'),list) and r['status']!='MALFORMED_RESPONSE':
    ls,_,cfg,travel,demand=prepare({k:v for k,v in e['request'].items()if k not in ['method','extra_prompt']});p=evaluate_routes(r['model_proposal']['routes'],ls,travel,demand,cfg)
    assert p['valid']==r['valid'] and p['total_cost_dkk']==r['total_cost_dkk'];checks.append(e['scenario']+': Python independently agrees with website JavaScript checker')
 (OUT/'validation.json').write_text(json.dumps({'status':'PASS','checks':checks,'worked_route':{'load':load,'return_minute':returned,'cost':cost},'limits':'Full-case feasibility and arithmetic checked; full-case optimality is not proved.'},indent=2)+'\n')
 print(json.dumps({'checks':len(checks),'worked_route':worked},indent=2))
if __name__=='__main__':main()
