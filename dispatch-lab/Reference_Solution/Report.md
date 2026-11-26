# Dispatch Lab — completed case report

Website: https://dispatch-lab-northline.atleks.chatgpt.site  
Source: https://github.com/AeronTekle/accounting-lab/tree/dispatch-lab-case/dispatch-lab  
Experiments performed: 26 November 2026.

## 1. Investigation

Google's simple vehicle-routing example assigns customers to depot-return routes and strongly favours shortening the longest route: its coded objective combines total distance with 100 times the maximum route distance, and each route is limited to 3,000 distance units. The capacity example instead minimises total distance while restricting each vehicle's accumulated demand; it has no customer delivery windows. The time-window example minimises travel time while allowing waiting and requiring visits within specified windows; it has no capacity restriction or Northline service durations. Northline needs capacity and time windows together, fixed 08:00 departures, complete service before closing, depot returns within 240 minutes, and the specified fixed-plus-paid-time cost. None of the examples can be used unchanged for that objective. [1–3]

The capacity and time-window Python samples were downloaded from Google's official repository and executed with OR-Tools 9.15.6755. Their original files, source URLs, SHA-256 hashes, run metadata and unedited console outputs are in `examples/`.

| Experiment | One input change | Before | After | Observed effect |
|---|---|---|---|---|
| Capacity | `vehicle_capacities`: [15,15,15,15] → [20,20,20,20] | Distance 6,208; loads 15,15,15,15 | Distance 5,912; loads 18,8,15,19 | More capacity allowed different groupings and a shorter route set in this run. Four vans were still used. |
| Time windows | Customer 9: (0,3) → (0,10) | Objective 71; printed total route-end time 82 | Objective 71; printed total route-end time 82 | Route order stayed the same. The feasible time interval printed at customer 9 widened from (2,3) to (2,5). |

The second change increased scheduling flexibility without improving the objective. The time-window example's objective of 71 counts travel; its printed total of 82 is not that objective. The official samples use their own example units, not Northline's DKK costs. These outputs describe the runs and do not establish global optimality.

## 2. Website and experiment method

The website calls Gemini on the server and requests customer visit orders as JSON. It sends the complete customer data, effective travel matrix, effective demand, operating rules and cost objective. The final model is `gemini-3.1-flash-lite`, temperature 0, maximum output tokens 8,192, with a 120-second request timeout. No OR-Tools routes, existing dispatch routes or expected answers were included in its prompts. All comparison runs used the same prompt template and no additional planning guidance.

The website independently computes earliest feasible service starts, waiting, complete service, return journeys, loads and costs. It checks duplicates, missing customers, vehicle count and all operating restrictions. It does not use model-written schedules or prices. Each returned attempt is preserved with original CSV inputs, exact prompt/request, raw provider response, model/settings, computed checks and findings. Notes and previous experiments survive settings changes and browser reloads. JSON, CSV and readable TXT downloads are provided.

The eight main Gemini scenarios were executed locally through the website's actual API handler, making real external Gemini requests. A further normal-day two-van request was made by clicking the published website; its JSON, CSV and TXT were downloaded and checked. The comparison uses this later two-van result and retains its earlier API failure. The website has no OR-Tools endpoint; `benchmark.py` runs separately in local Python and never reads the LLM results.

The benchmark combines a Time dimension and Capacity dimension. Service time is added at departure from each customer, latest service start is closing minus service duration, starts are fixed at zero, and return times are bounded. The objective is DKK 500 per used vehicle plus DKK 4 times each vehicle's route duration. Unused vehicles cost zero. Every returned solution was replayed outside the solver and its cost checked against the solver objective.

OR-Tools used a nominal three-second search with parallel cheapest insertion and guided local search. Settings, status codes, versions, elapsed times and fallback strategies are recorded. A two-vehicle run can use an independently searched spare-vehicle model to discover a seed only if that seed uses at most two vehicles; the final two-vehicle model and checker enforce the actual limit. No LLM proposal supplies a seed. Runtime includes this work. The API and solver have different time budgets, and API runtime includes network/provider time; these timings are not a controlled speed comparison.

## 3. Scenario comparison

Both methods received identical data, effective demands, travel times, available vans, capacities, windows and cost rules for each paired scenario. This equality was checked directly when generating `results/comparison.csv`. Traffic and demand changes were tested separately. The additional change moves C23's full-service window from minutes 90–210 to 30–75. All other inputs stay the same.

| Scenario | Method | Customers | Violations | Vans | Paid min | Valid cost DKK | Seconds | Result |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Normal · 3 available | OR-Tools | 25 | 0 | 2 | 424 | 2696 | 3.005 | Valid |
| Normal · 3 available | Gemini | 25 | 0 | 3 | 438 | 3252 | 4.843 | Valid |
| Normal · 2 available | OR-Tools | 25 | 0 | 2 | 424 | 2696 | 3.0 | Valid |
| Normal · 2 available | Gemini | 25 | 8 | 2 | 431 | — | 0.917 | Invalid |
| Travel ×1.5 · 3 | OR-Tools | 25 | 0 | 3 | 506 | 3524 | 3.002 | Valid |
| Travel ×1.5 · 3 | Gemini | 25 | 0 | 3 | 560 | 3740 | 117.761 | Valid |
| Travel ×1.5 · 2 | OR-Tools | 0 | — | — | — | — | 3.0 | Search limit |
| Travel ×1.5 · 2 | Gemini | 25 | 10 | 2 | 545 | — | 12.113 | Invalid |
| Demand ×1.3 · 3 | OR-Tools | 25 | 0 | 3 | 400 | 3100 | 3.003 | Valid |
| Demand ×1.3 · 3 | Gemini | 25 | 0 | 3 | 481 | 3424 | 14.129 | Valid |
| Demand ×1.3 · 2 | OR-Tools | 0 | — | — | — | — | 0.001 | Proven infeasible |
| Demand ×1.3 · 2 | Gemini | 25 | 8 | 2 | 431 | — | 4.844 | Invalid |
| C23 changed · 3 | OR-Tools | 25 | 0 | 2 | 439 | 2756 | 3.001 | Valid |
| C23 changed · 3 | Gemini | 25 | 1 | 3 | 466 | — | 5.63 | Invalid |
| C23 changed · 2 | OR-Tools | 0 | — | — | — | — | 3.0 | Search limit |
| C23 changed · 2 | Gemini | 25 | 10 | 2 | 464 | — | 4.634 | Invalid |

“Customers” counts distinct customer IDs in proposed routes, including invalid routes. It does not mean all were served on time. Paid minutes and vans on invalid rows describe the rejected candidate. A dash means no route-based value exists; search failures and infeasibility proofs do not have zero-cost plans. Costs are compared only on valid rows. None of the full-case plans is proved optimal.

The supplied current dispatch is valid at **DKK 3,264**, using three vans and 441 paid minutes. The normal-day OR-Tools plan uses two vans and 424 paid minutes, costing **DKK 2,696**. The saving is **DKK 568 (17.4%)**: DKK 500 for one fewer van and DKK 68 for 17 fewer paid minutes. Gemini's valid normal-day three-van plan costs DKK 3,252, saving DKK 12 against the existing dispatch. OR-Tools is DKK 556 cheaper than that valid Gemini plan.

In heavy traffic, the valid three-van plans cost DKK 3,524 with OR-Tools and DKK 3,740 with Gemini. With increased demand, they cost DKK 3,100 and DKK 3,424 respectively. These are within-scenario comparisons, not savings against an unchanged normal-day workload.

### Failures that change the interpretation

The hosted Gemini two-van response said total demand was 173, although the actual total is 175. Its second route carries 117 units and returns at minute 291 (12:51). Its DKK 2,724 candidate cost is therefore unusable. The higher-demand two-van response is also invalid, with one route carrying 161 units. Independent arithmetic establishes that the entire higher-demand two-van problem is impossible: rounding each customer's 30% increase up gives **240 units**, exceeding **2 × 100 = 200**. Scaling the total 175 by 1.3 would incorrectly miss the per-customer rounding rule.

The changed-window experiment shows why a failed search is not an impossibility proof. The explicit two-van search found no plan within three seconds, while the three-available-van search found a valid plan using only **two** vans at **DKK 2,756**. Replaying those two routes under the two-van configuration succeeds; the witness is saved in `results/window_two_witness.json`. Two vans can therefore serve this changed-window case, despite that search failure. No corresponding feasibility or impossibility proof was obtained for two vans in heavy traffic.

There are six retained API errors: two retired-model 404 responses for `gemini-2.5-flash`, three temporary 503 responses for `gemini-3.8-flash`, and one 503 for `gemini-3.1-flash-lite`. These motivated the documented model change and later hosted two-van attempt. They are preserved in the full JSON and API-attempt CSV, rather than counted as routing failures. No malformed JSON occurred in the actual experiment set. Error-handling unit tests use labelled fixtures and are excluded from the results. Fifteen records are retained: one baseline and fourteen actual API responses. This is a small descriptive experiment, not an estimate of general model reliability.

## 4. Worked route check

The normal-day OR-Tools two-van plan's first route is:

`D0 → C16 → C12 → C11 → C10 → C15 → C09 → C13 → C14 → C22 → C23 → C25 → C18 → C21 → C24 → D0`

The following arithmetic uses the original matrix and customer windows, independently of the solver's time variables. Each service lasts eight minutes.

| Customer | Travel from previous | Arrival | Service | Window | Demand |
|---|---:|---|---|---|---:|
| C16 | 12 | 08:12 | 08:12–08:20 | 08:00–11:30 | 8 |
| C12 | 8 | 08:28 | 08:28–08:36 | 08:00–11:30 | 6 |
| C11 | 6 | 08:42 | 08:42–08:50 | 08:00–11:30 | 8 |
| C10 | 5 | 08:55 | 08:55–09:03 | 08:00–09:15 | 5 |
| C15 | 3 | 09:06 | 09:06–09:14 | 08:00–11:30 | 5 |
| C09 | 4 | 09:18 | 09:18–09:26 | 08:00–11:30 | 7 |
| C13 | 4 | 09:30 | 09:30–09:38 | 08:00–11:30 | 9 |
| C14 | 5 | 09:43 | 09:43–09:51 | 09:30–11:30 | 7 |
| C22 | 21 | 10:12 | 10:12–10:20 | 08:00–11:30 | 6 |
| C23 | 5 | 10:25 | 10:25–10:33 | 09:30–11:30 | 9 |
| C25 | 3 | 10:36 | 10:36–10:44 | 08:00–11:30 | 5 |
| C18 | 7 | 10:51 | 10:51–10:59 | 08:00–11:30 | 9 |
| C21 | 5 | 11:04 | 11:04–11:12 | 08:00–11:30 | 8 |
| C24 | 7 | 11:19 | 11:19–11:27 | 08:00–11:30 | 7 |

Starting load: **8 + 6 + 8 + 5 + 5 + 7 + 9 + 7 + 6 + 9 + 5 + 9 + 8 + 7 = 99 ≤ 100**. Driving is **12 + 8 + 6 + 5 + 3 + 4 + 4 + 5 + 21 + 5 + 3 + 7 + 5 + 7 + 14 = 109 minutes**, including the 14-minute return from C24. Service totals **14 × 8 = 112 minutes** and waiting is zero. Return is **109 + 112 = 221 minutes**, or **11:41**, inside the 12:00 limit. Every full service in the table fits its window. Route cost is **500 + 4 × 221 = DKK 1,384**.

The other route carries 76 units and returns at minute 203, costing DKK 1,312. Together the routes contain exactly C01–C25: 25 visits, 25 distinct customers, no omissions and no duplicates. Total load is **99 + 76 = 175** and total cost is **1,384 + 1,312 = DKK 2,696**. The step-by-step values are also in `results/worked_route_check.csv`.

## 5. Recommendation and limitations

Use the validated two-van OR-Tools plan for the normal day under these fictional assumptions. Retain access to a third van rather than treating a single day's result as evidence that it can always be removed. A third standard van is necessary for the higher-demand day because of the capacity bound, and a valid three-van plan was found for heavy traffic. The changed C23 window can still be served with two vans, as the validated witness demonstrates.

Gemini can produce usable proposals, but its explanations and apparent savings need independent checking. In this experiment it gave feasible three-van plans for the normal, traffic and demand scenarios, while the two-van proposals and changed-window proposals were invalid. OR-Tools more directly represents the restrictions and objective, but a bounded search can still fail to find an existing feasible plan.

The matrix assumes fixed journey times and omits uncertain traffic, breaks and employment rules. The cost model also assumes that a van's DKK 500 cost and all paid minutes are avoidable when unused. Actual staffing or leasing contracts may make those costs fixed in the short run. The result supports a decision within the case model, not an unconditional staffing reduction.

## Implementation, checks and AI assistance

Plain HTML, CSS and JavaScript keep the website runnable without npm packages. The same request handler runs locally and as a hosted Worker. Gemini credentials remain server secrets and are absent from the repository, prompts and exports. OR-Tools 9.15.6755 and Python 3.12.14 were used for the benchmark; Node 24.22.3 was used for the website. Source code is in the `dispatch-lab` folder on a separate `dispatch-lab-case` branch of the existing accounting-lab repository; its main branch is unchanged.

AI assisted with the code, prompts, model investigation, experiment execution, checking and report drafting. The worked route is a transparent arithmetic check prepared with that assistance, not a claim that the student performed it unaided. Actual runtime outputs support the numerical statements. No student learning outcome, independent authorship, peer trial or feedback is claimed from these artifacts alone.

Website checks include baseline cost, complete-service timing, return travel, waiting, coverage, duplicate/unknown IDs, capacity, malformed responses and API errors. Python independently agrees with the JavaScript checker on the actual returned route proposals. In the published interface, a genuine Gemini response was saved with a finding and downloaded as JSON, CSV and TXT: the JSON retained its prompt/raw response, the CSV retained all 25 customer rows and invalid status, and the TXT retained the finding. The full-set download was also checked: 15 records, 225 customer rows and six failure rows, with all raw responses, findings and the conclusion preserved. All 15 records remained after browser reload. The final experiment set can be restored with **Load reference experiments**. Validation details are in `results/validation.json` and `results/download_checks.json`.

## Sources

1. [Google: vehicle routing](https://developers.google.com/optimization/routing/vrp).
2. [Google: capacity constraints](https://developers.google.com/optimization/routing/cvrp).
3. [Google: time windows](https://developers.google.com/optimization/routing/vrptw).
4. [Official Python capacity sample](https://github.com/google/or-tools/blob/stable/ortools/constraint_solver/samples/vrp_capacity.py) and [time-window sample](https://github.com/google/or-tools/blob/stable/ortools/constraint_solver/samples/vrp_time_windows.py). Download hashes are in `examples/sources.json`.
5. [Google: routing search options](https://developers.google.com/optimization/routing/routing_options).
6. [Gemini content-generation API](https://ai.google.dev/api/generate-content) and [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output). Model access and availability were checked through the actual API; error responses remain in the evidence.
