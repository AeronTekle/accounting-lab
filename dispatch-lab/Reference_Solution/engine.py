"""Vehicle routing with hard delivery windows. No paid API or map service."""
import csv
import io
import json
import math
import hashlib
import time
from datetime import datetime, timezone
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / 'Student_Materials'

def read_inputs(locations_text=None, matrix_text=None):
    locations_text = locations_text if locations_text is not None else (DATA / 'locations.csv').read_text()
    matrix_text = matrix_text if matrix_text is not None else (DATA / 'travel_minutes.csv').read_text()
    rows = list(csv.DictReader(io.StringIO(locations_text)))
    if not 2 <= len(rows) <= 40:
        raise ValueError('Supply 1 depot and between 1 and 39 customers.')
    locations = []
    fields = ['demand','service_minutes','open_minute','close_minute','x','y']
    for row in rows:
        if set(row) != {'id','name',*fields}:
            raise ValueError('Unexpected location columns. Use the supplied CSV header.')
        if not row['id'] or not row['name']:
            raise ValueError('Every location needs an ID and a name.')
        loc = {'id':row['id'],'name':row['name']}
        try:
            for field in fields:
                loc[field] = int(row[field])
        except (TypeError, ValueError):
            raise ValueError('Location numeric fields must be whole numbers.')
        if loc['demand'] < 0 or loc['service_minutes'] < 0 or not 0 <= loc['open_minute'] <= loc['close_minute'] <= 1440:
            raise ValueError('Invalid demand, service duration, or delivery window.')
        if abs(loc['x']) > 1000 or abs(loc['y']) > 1000:
            raise ValueError('Schematic coordinates must be between -1000 and 1000.')
        locations.append(loc)
    ids = [r['id'] for r in locations]
    if len(set(ids)) != len(ids) or ids[0] != 'D0':
        raise ValueError('IDs must be unique, with D0 in the first row.')
    if locations[0]['demand'] or locations[0]['service_minutes'] or locations[0]['open_minute']:
        raise ValueError('The depot must have zero demand, service duration, and opening minute.')
    if any(r['demand'] <= 0 or r['service_minutes'] <= 0 for r in locations[1:]):
        raise ValueError('Each customer needs positive demand and service duration.')
    table = list(csv.reader(io.StringIO(matrix_text)))
    if len(table) != len(ids)+1 or table[0] != ['id',*ids]:
        raise ValueError('Matrix header/order must exactly match the location IDs.')
    matrix = []
    for i,row in enumerate(table[1:]):
        if len(row) != len(ids)+1 or row[0] != ids[i]:
            raise ValueError('Matrix row IDs/order must match the location file.')
        try:
            values = [int(v) for v in row[1:]]
        except ValueError:
            raise ValueError('Travel times must be whole minutes.')
        if any(v < 0 or v > 1440 for v in values) or values[i] != 0 or any(v <= 0 for j,v in enumerate(values) if j != i):
            raise ValueError('Use zero on the diagonal and positive travel times elsewhere (maximum 1440).')
        matrix.append(values)
    return locations,matrix

def integer(value, name, lo, hi):
    if isinstance(value,bool) or not isinstance(value,int) or not lo <= value <= hi:
        raise ValueError(f'{name} must be an integer from {lo} to {hi}.')
    return value

def configuration(overrides=None):
    cfg = {'vehicles':3,'capacity':100,'shift_minutes':240,'travel_multiplier':1.0,
           'demand_multiplier':1.0,'fixed_cost_dkk':500,'minute_cost_dkk':4,'search_seconds':3}
    overrides = overrides or {}
    if not isinstance(overrides,dict) or set(overrides)-set(cfg):
        raise ValueError('Unknown settings supplied.')
    cfg.update(overrides)
    for name,lo,hi in [('vehicles',1,5),('capacity',1,500),('shift_minutes',30,480),
                       ('fixed_cost_dkk',0,5000),('minute_cost_dkk',1,50),('search_seconds',1,10)]:
        cfg[name] = integer(cfg[name],name,lo,hi)
    for name in ['travel_multiplier','demand_multiplier']:
        v = cfg[name]
        if isinstance(v,bool) or not isinstance(v,(float,int)) or not math.isfinite(v) or not .5 <= v <= 3:
            raise ValueError(name+' must be a finite number from 0.5 to 3.')
        cfg[name] = float(v)
    return cfg

def prepare(payload=None):
    payload = payload or {}
    if not isinstance(payload,dict) or set(payload)-{'config','locations_csv','matrix_csv','window_change'}:
        raise ValueError('Unexpected request fields.')
    if ('locations_csv' in payload) != ('matrix_csv' in payload):
        raise ValueError('Upload both CSV files together.')
    if 'locations_csv' in payload and not all(isinstance(payload[k],str) for k in ['locations_csv','matrix_csv']):
        raise ValueError('CSV content must be text.')
    locations,matrix = read_inputs(payload.get('locations_csv'),payload.get('matrix_csv'))
    cfg = configuration(payload.get('config'))
    change = payload.get('window_change')
    if change is not None:
        if not isinstance(change,dict) or set(change) != {'id','open_minute','close_minute'}:
            raise ValueError('Window change must specify id, open_minute and close_minute.')
        op=integer(change['open_minute'],'open_minute',0,1440)
        cl=integer(change['close_minute'],'close_minute',0,1440)
        matches=[r for r in locations[1:] if r['id']==change['id']]
        if not matches or op>cl:
            raise ValueError('Invalid customer/window change.')
        matches[0].update(open_minute=op,close_minute=cl)
    effective = [[math.ceil(v*cfg['travel_multiplier']) for v in row] for row in matrix]
    demands = [math.ceil(r['demand']*cfg['demand_multiplier']) for r in locations]
    return locations,matrix,cfg,effective,demands

def evaluate_routes(routes, locations, travel, demand, cfg):
    """Independent replay of raw route IDs. Does not use OR-Tools time variables."""
    errors=[]; seen=[]; output=[]
    ids={r['id']:i for i,r in enumerate(locations)}
    if len(routes)>cfg['vehicles']:
        errors.append('Too many vehicle routes.')
    for number,route in enumerate(routes,1):
        if not isinstance(route,list) or not route or any(x not in ids or x=='D0' for x in route):
            errors.append(f'Route {number} contains invalid/empty customer IDs.');continue
        clock=0; current=0; drive=0; waiting=0; service=0; load=0; stops=[]
        for customer in route:
            j=ids[customer];loc=locations[j];leg=travel[current][j];drive+=leg
            arrival=clock+leg;begin=max(arrival,loc['open_minute']);wait=begin-arrival;finish=begin+loc['service_minutes']
            if finish>loc['close_minute']:
                errors.append(f'{customer}: service ends after its window closes.')
            load+=demand[j];waiting+=wait;service+=loc['service_minutes'];seen.append(customer)
            stops.append({'id':customer,'arrival_minute':arrival,'start_minute':begin,'finish_minute':finish,
                          'wait_minutes':wait,'demand':demand[j],'load_remaining':None})
            clock=finish;current=j
        clock+=travel[current][0];drive+=travel[current][0]
        if load>cfg['capacity']:
            errors.append(f'Route {number}: capacity exceeded ({load}>{cfg["capacity"]}).')
        if clock>min(cfg['shift_minutes'],locations[0]['close_minute']):
            errors.append(f'Route {number}: returns after shift/depot closing time.')
        remaining=load
        for stop in stops:
            remaining-=stop['demand'];stop['load_remaining']=remaining
        cost=cfg['fixed_cost_dkk']+cfg['minute_cost_dkk']*clock
        output.append({'vehicle':number,'customers':route,'load':load,'return_minute':clock,'drive_minutes':drive,
                       'wait_minutes':waiting,'service_minutes':service,'cost_dkk':cost,'stops':stops})
    expected=set(ids)-{'D0'}
    missing=sorted(expected-set(seen));duplicates=sorted({c for c in seen if seen.count(c)>1})
    if missing:errors.append('Missing customers: '+', '.join(missing))
    if duplicates:errors.append('Duplicate visits: '+', '.join(duplicates))
    return {'valid':not errors,'errors':errors,'routes':output,'used_vehicles':len(output),
            'total_cost_dkk':sum(r['cost_dkk'] for r in output),'total_drive_minutes':sum(r['drive_minutes'] for r in output),
            'total_wait_minutes':sum(r['wait_minutes'] for r in output),'total_paid_minutes':sum(r['return_minute'] for r in output)}

def solve(payload=None,method='optimized'):
    import ortools
    from ortools.constraint_solver import pywrapcp,routing_enums_pb2
    start=time.perf_counter();locations,matrix,cfg,travel,demands=prepare(payload)
    if method not in {'optimized','baseline'}:raise ValueError('Unknown method.')
    digest=hashlib.sha256(json.dumps({'locations':locations,'matrix':matrix,'config':cfg},sort_keys=True).encode()).hexdigest()
    base={'recorded_at':datetime.now(timezone.utc).isoformat(),'method':method,'config':cfg,
          'input_sha256':digest,'ortools_version':ortools.__version__,
          'dataset':{'locations':locations,'travel_minutes':matrix,'effective_travel_minutes':travel,'effective_demand':demands},
          'optimality_proven':False,'routes':[]}
    reasons=[]
    if sum(demands)>cfg['vehicles']*cfg['capacity']:
        reasons.append(f'Total demand {sum(demands)} exceeds fleet capacity {cfg["vehicles"]*cfg["capacity"]}.')
    if sum(r['service_minutes'] for r in locations)>cfg['vehicles']*min(cfg['shift_minutes'],locations[0]['close_minute']):
        reasons.append('Service minutes alone exceed the available fleet shift minutes.')
    for i,loc in enumerate(locations[1:],1):
        if demands[i]>cfg['capacity']:reasons.append(loc['id']+' exceeds one vehicle capacity.')
        if loc['open_minute']+loc['service_minutes']>loc['close_minute']:
            reasons.append(loc['id']+' has a window shorter than its service duration.')
    if reasons:
        return {**base,'status':'PROVEN_INFEASIBLE_BY_BOUND','explanation':reasons,'elapsed_seconds':round(time.perf_counter()-start,3)}
    if method=='baseline':
        # Replay the supplied existing three-van dispatch; never silently redesign it.
        raw=json.loads((DATA/'current_plan.json').read_text())['routes']
        replay=evaluate_routes(raw,locations,travel,demands,cfg)
        return {**base,**replay,'status':'FEASIBLE_BASELINE' if replay['valid'] else 'INVALID_BASELINE',
                'explanation':['Replay of the supplied current three-van dispatch. An invalid plan is not a usable cost-saving comparator.'],
                'elapsed_seconds':round(time.perf_counter()-start,3)}
    manager=pywrapcp.RoutingIndexManager(len(locations),cfg['vehicles'],0)
    routing=pywrapcp.RoutingModel(manager)
    time_cb=routing.RegisterTransitCallback(lambda a,b:travel[manager.IndexToNode(a)][manager.IndexToNode(b)]+locations[manager.IndexToNode(a)]['service_minutes'])
    routing.AddDimension(time_cb,cfg['shift_minutes'],cfg['shift_minutes'],True,'Time')
    dimension=routing.GetDimensionOrDie('Time')
    for i,loc in enumerate(locations[1:],1):
        latest=loc['close_minute']-loc['service_minutes']
        if loc['open_minute']>cfg['shift_minutes'] or latest<loc['open_minute']:
            return {**base,'status':'PROVEN_INFEASIBLE_BY_BOUND','explanation':[loc['id']+' cannot begin service within its window and the shift.'],'elapsed_seconds':round(time.perf_counter()-start,3)}
        dimension.CumulVar(manager.NodeToIndex(i)).SetRange(loc['open_minute'],min(latest,cfg['shift_minutes']))
    demand_cb=routing.RegisterUnaryTransitCallback(lambda a:demands[manager.IndexToNode(a)])
    routing.AddDimensionWithVehicleCapacity(demand_cb,0,[cfg['capacity']]*cfg['vehicles'],True,'Capacity')
    zero=routing.RegisterTransitCallback(lambda a,b:0)
    routing.SetArcCostEvaluatorOfAllVehicles(zero)
    routing.SetFixedCostOfAllVehicles(cfg['fixed_cost_dkk'])
    dimension.SetSpanCostCoefficientForAllVehicles(cfg['minute_cost_dkk'])
    for v in range(cfg['vehicles']):
        dimension.CumulVar(routing.End(v)).SetMax(min(cfg['shift_minutes'],locations[0]['close_minute']))
        routing.AddVariableMinimizedByFinalizer(dimension.CumulVar(routing.End(v)))
    params=pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy=routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    params.local_search_metaheuristic=routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    params.time_limit.seconds=cfg['search_seconds']
    solution=routing.SolveWithParameters(params)
    tried=['PARALLEL_CHEAPEST_INSERTION']
    # A spare-vehicle search can discover a seed that uses only the requested
    # fleet. Import it into the genuinely constrained model, never accept an
    # extra route. This helps when direct two-vehicle insertion gets stuck.
    if solution is None and cfg['vehicles']==2 and cfg['search_seconds']>=2:
        seed_payload=dict(payload or {})
        seed_payload['config']={**cfg,'vehicles':3,'search_seconds':max(1,cfg['search_seconds']//2)}
        seed_result=solve(seed_payload)
        base['seed_search_used']=True
        if seed_result.get('valid') and seed_result['used_vehicles']<=2:
            seed_routes=[[next(i for i,l in enumerate(locations) if l['id']==cid) for cid in r['customers']] for r in seed_result['routes']]
            seed_routes += [[] for _ in range(2-len(seed_routes))]
            assignment=routing.ReadAssignmentFromRoutes(seed_routes,True)
            if assignment:
                params.time_limit.FromMilliseconds(max(1,int((cfg['search_seconds']-(time.perf_counter()-start))*1000)))
                solution=routing.SolveFromAssignmentWithParameters(assignment,params)
                tried.append('VALIDATED_SPARE_VEHICLE_SEED')
    if solution is None:
        for strategy in ['PATH_CHEAPEST_ARC','LOCAL_CHEAPEST_INSERTION','GLOBAL_CHEAPEST_ARC']:
            remaining=cfg['search_seconds']-(time.perf_counter()-start)
            if remaining<.05:break
            params.time_limit.FromMilliseconds(max(1,int(remaining*1000)))
            params.first_solution_strategy=getattr(routing_enums_pb2.FirstSolutionStrategy,strategy)
            tried.append(strategy)
            solution=routing.SolveWithParameters(params)
            if solution is not None:break
    base['first_solution_strategies_tried']=tried
    if solution is None:
        return {**base,'status':'NO_SOLUTION_FOUND_WITHIN_LIMIT','search_status_code':routing.status(),
                'explanation':['No route set found within the search limit. This is not proof of infeasibility. Try a longer limit or investigate the constraints.'],
                'elapsed_seconds':round(time.perf_counter()-start,3)}
    raw=[]
    for v in range(cfg['vehicles']):
        idx=routing.Start(v);route=[]
        while not routing.IsEnd(idx):
            node=manager.IndexToNode(idx)
            if node:route.append(locations[node]['id'])
            idx=solution.Value(routing.NextVar(idx))
        if route:raw.append(route)
    replay=evaluate_routes(raw,locations,travel,demands,cfg)
    if not replay['valid']:
        raise RuntimeError('Independent route validation failed: '+'; '.join(replay['errors']))
    if replay['total_cost_dkk']!=solution.ObjectiveValue():
        raise RuntimeError('Independent cost does not match solver objective.')
    return {**base,**replay,'status':'FEASIBLE_NOT_PROVEN_OPTIMAL','search_status_code':routing.status(),
            'solver_objective_dkk':solution.ObjectiveValue(),
            'explanation':['All customers served exactly once. Capacity, complete-service delivery windows and depot return independently replayed. Search-limited solution; no global optimum claimed.'],
            'elapsed_seconds':round(time.perf_counter()-start,3)}

def summary_text(result):
    cfg=result['config'];lines=['ROUTE PLAN',result['status'],f'Input SHA-256: {result["input_sha256"]}',
      f'Available vehicles: {cfg["vehicles"]}; capacity per vehicle: {cfg["capacity"]}',
      f'Travel multiplier: {cfg["travel_multiplier"]}; demand multiplier: {cfg["demand_multiplier"]}',
      'Clock times are minutes after 08:00. All amounts are fictional DKK, excluding VAT.']
    lines.extend(result['explanation'])
    if 'total_cost_dkk' in result:
        lines.append(f'Total cost: DKK {result["total_cost_dkk"]}; used vehicles: {result["used_vehicles"]}; paid minutes: {result["total_paid_minutes"]}')
    for r in result['routes']:
        lines.append(f'Van {r["vehicle"]}: D0 -> '+ ' -> '.join(r['customers'])+f' -> D0; load {r["load"]}; return minute {r["return_minute"]}; cost DKK {r["cost_dkk"]}')
    lines.extend(result.get('errors',[]))
    return '\n'.join(lines)+'\n'
