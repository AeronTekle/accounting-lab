Dispatch Lab: Can one fewer van still deliver the day?

THE BUSINESS PROBLEM

Northline Deliveries serves 25 customers using three vans. Could two vans complete the day more cheaply while meeting customer commitments?

Investigate routing models, build a website that requests plans through an LLM API, compare its results with Google OR-Tools, and recommend an operating plan.

STARTING MATERIALS

locations.csv: Depot, customers, demand, service times and delivery windows
travel_minutes.csv: Journey times between locations
current_plan.json: The existing three-van dispatch
scenarios.json: Example experiment settings

All data and costs are fictional. Times are minutes after 08:00; open_minute and close_minute define delivery windows. Match files by location ID. Use the supplied matrix for journeys; coordinates are for drawing only.

OPERATING RULES

Deliveries: Serve every customer exactly once. No split orders or depot reloads.

Vehicles: Each used van leaves D0 at 08:00 and returns within 240 minutes and before depot closing. Available vans may remain unused.

Capacity: Maximum 100 units per van, loaded before departure.

Windows: Complete service must fit within the customer's window. Early arrivals may wait.

Cost: DKK 500 per used van plus DKK 4 per minute until depot return, including driving, waiting and service. Unused vans cost zero.

Changes: Apply multipliers to original journey times or individual demands, rounding each result up to a whole minute/unit.

Minimise total cost while meeting every rule. Plans violating constraints are invalid. Overtime, breaks and employment regulations are excluded.

TASKS

1. Investigate the OR-Tools examples

Explore Google's examples for simple vehicle routing (https://developers.google.com/optimization/routing/vrp), capacity constraints (https://developers.google.com/optimization/routing/cvrp) and time windows (https://developers.google.com/optimization/routing/vrptw).

Write one paragraph comparing their objectives and restrictions, and explain which features are needed for Northline's problem.

Run the capacity and time-window examples in Python, using Colab or a local environment. For each, save the original output, change one input and rerun. Record the exact change and explain its observed effect. An unsuccessful search does not automatically prove impossibility.

2. Build your website with AI and an API

Use AI to build a website that calls a hosted or local LLM API to propose customer visit orders as JSON, using the supplied data and rules. Use actual API responses.

The website must:

- Load the data and allow changes to vehicle availability, capacity and scenario settings.
- Display routes, schedules, costs and violations through a drawing or clear tables.
- Independently check customer coverage, loads and delivery windows, and calculate waiting, service, depot return and costs using code.
- Save inputs, prompts, raw responses, model/settings and findings; download full JSON evidence, schedule CSV and a readable report. Preserve earlier experiments when settings change.

Publish the code on GitHub and provide a working website link. Keep API keys on the server and out of the repository.

3. Run an OR-Tools benchmark locally

Adapt the time-window example by adding capacity constraints. Use Northline's data, rules and cost objective, including service durations and depot return.

Run locally in Python, separately from the website and independently of the LLM's routes. Save route schedules and a scenario-summary CSV showing solution status, vans used, cost and runtime. Include runnable code, solver version and search settings. Keep unsuccessful runs in the summary.

4. Compare and challenge the plans

Compare both methods with three vans available and then two. Also test 50% longer journeys, 30% higher demand and one additional change you choose. Running every entry in scenarios.json is unnecessary.

Use identical inputs, costs and constraints. Report customers served, violations, vans used, paid minutes, cost and runtime. Compare savings only between valid plans. Manually check one generated route's load, timing and cost, and verify complete customer coverage. Explain one finding using a specific route or failed run.

Retain malformed responses and unsuccessful searches. Distinguish a feasible plan, proven impossibility and failure to find a solution within a search limit. A feasible plan is not necessarily a proven optimum.

5. Recommend a decision

Explain whether two vans are sufficient, how disruptions affect that conclusion and when a third van makes sense. Discuss differences between the methods and one model limitation. Check that website downloads preserve the actual inputs, results and findings.

DELIVERABLES

- Working website URL and GitHub repository with setup instructions, API configuration and dependency versions.
- Website experiment downloads and local OR-Tools code, schedules and scenario-summary CSV.

Submit one report containing:

- Your Step 1 paragraph and before-and-after results.
- Your manual route check, comparison table and recommendation.
- Source links and a brief explanation of your implementation choices and use of AI.
