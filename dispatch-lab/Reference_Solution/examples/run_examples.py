"""Run the downloaded official examples, then change exactly one data input."""
import contextlib, importlib.util, io, json, platform, time
from pathlib import Path
import ortools
ROOT=Path(__file__).resolve().parent
runs=[]
for name,field,value in [('vrp_capacity','vehicle_capacities',[20,20,20,20]),('vrp_time_windows','time_windows[9]',(0,10))]:
    spec=importlib.util.spec_from_file_location(name,ROOT/(name+'.py'))
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    original=m.create_data_model
    before=original()['vehicle_capacities' if name=='vrp_capacity' else 'time_windows'][9] if name=='vrp_time_windows' else original()['vehicle_capacities']
    for changed in [False,True]:
        def data_model():
            d=original()
            if changed:
                if name=='vrp_capacity':d['vehicle_capacities']=value[:]
                else:d['time_windows'][9]=value
            return d
        m.create_data_model=data_model
        captured=io.StringIO();start=time.perf_counter()
        with contextlib.redirect_stdout(captured):m.main()
        output=captured.getvalue();filename=f'{name}_{"after" if changed else "before"}.txt'
        (ROOT/filename).write_text(output or '[The official example printed no solution.]\n')
        runs.append({'example':name,'phase':'after' if changed else 'before','changed_field':field if changed else None,'old_value':before if changed else None,'new_value':value if changed else None,'elapsed_seconds':round(time.perf_counter()-start,4),'printed_solution':bool(output),'output_file':filename})
(ROOT/'runs.json').write_text(json.dumps({'ortools_version':ortools.__version__,'python':platform.python_version(),'runs':runs},indent=2)+'\n')
print(json.dumps(runs,indent=2))
