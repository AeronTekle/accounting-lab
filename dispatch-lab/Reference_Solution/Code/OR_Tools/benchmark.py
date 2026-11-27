"""Local-only OR-Tools benchmark. Run: python benchmark.py. Never imports LLM routes."""
import csv,json,platform,argparse
from pathlib import Path
import ortools
from engine import solve
OUT=None
SCENARIOS=[('normal_three',{'vehicles':3}),('normal_two',{'vehicles':2}),('capacity_125_two',{'vehicles':2,'capacity':125})]
def main():
    global OUT
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='new_results');args=parser.parse_args();OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
    results=[];summary=[];schedules=[]
    for name,config in SCENARIOS:
        payload={'config':config}
        r=solve(payload);r.update(scenario_id=name,request=payload);results.append(r)
        served=len({s['id'] for route in r['routes'] for s in route['stops']})
        summary.append({'scenario':name,'method':'OR-Tools','status':r['status'],'valid':r.get('valid',False),'customers_served':served,'violations':len(r.get('errors',[])) if r.get('valid') is not None else '', 'used_vans':r.get('used_vehicles',''),'paid_minutes':r.get('total_paid_minutes',''),'valid_cost_dkk':r.get('total_cost_dkk','') if r.get('valid') else '', 'runtime_seconds':r['elapsed_seconds'],'ortools_version':ortools.__version__,'search_seconds':r['config']['search_seconds'],'first_solution_strategies':'; '.join(r.get('first_solution_strategies_tried',[])),'search_status_code':r.get('search_status_code',''),'explanation':' '.join(r['explanation'])})
        for route in r['routes']:
            for stop in route['stops']:schedules.append({'scenario':name,'vehicle':route['vehicle'],**stop,'route_load':route['load'],'route_return_minute':route['return_minute'],'route_cost_dkk':route['cost_dkk']})
        print(name,r['status'],r.get('total_cost_dkk',''),flush=True)
    (OUT/'ortools_evidence.json').write_text(json.dumps({'python':platform.python_version(),'ortools':ortools.__version__,'search_settings':{'first_solution':'PARALLEL_CHEAPEST_INSERTION','local_search':'GUIDED_LOCAL_SEARCH','requested_limit_seconds':3,'fallback':'Alternative first-solution strategies; independently searched spare-vehicle seed only if it uses <= requested vehicles. All elapsed time reported.','objective':'500 per used van + 4 per minute of each route span; start fixed at zero; no optional customers'},'experiments':results},indent=2)+'\n')
    for filename,rows in [('ortools_summary.csv',summary),('ortools_schedules.csv',schedules)]:
        with (OUT/filename).open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
if __name__=='__main__':main()
