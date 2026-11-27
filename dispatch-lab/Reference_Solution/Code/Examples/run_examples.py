"""Run the two unchanged official samples; retain their actual console outputs."""
import argparse,subprocess,sys,json,time
from pathlib import Path
import ortools
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--output',default='example_outputs');args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
runs=[]
for name in ['vrp_capacity','vrp_time_windows']:
 start=time.perf_counter();r=subprocess.run([sys.executable,str(ROOT/(name+'.py'))],capture_output=True,text=True,check=True);(out/(name+'.txt')).write_text(r.stdout)
 runs.append({'example':name,'output':name+'.txt','seconds':round(time.perf_counter()-start,3)})
(out/'runs.json').write_text(json.dumps({'ortools_version':ortools.__version__,'runs':runs},indent=2)+'\n')
print('Saved outputs to',out)
