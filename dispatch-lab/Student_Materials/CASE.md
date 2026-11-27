Dispatch Lab: Can one fewer van still deliver the day?

THE BUSINESS PROBLEM

Northline Deliveries serves 25 customers using three vans. Could two vans complete the day more cheaply while meeting customer commitments?

Investigate routing models, build a website that requests plans through an LLM API, compare its results with Google OR-Tools, and recommend an operating plan.

STARTING MATERIALS

locations.csv: Depot, customers, demand, service times and delivery windows

travel_minutes.csv: Journey times between locations

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

1. Run and compare the OR-Tools examples

Run Google's capacity and time-window examples locally in Python:

Capacity constraints: https://developers.google.com/optimization/routing/cvrp
Time windows: https://developers.google.com/optimization/routing/vrptw

Write one paragraph comparing their objectives and restrictions.

2. Build your website with AI and an API

Use AI to build a website that calls a hosted or local LLM API to propose customer visit orders as JSON, using the supplied data and rules.

The website must:

- Load the data and allow changes to vehicle availability, capacity and scenario settings.
- Display routes, schedules, costs and violations through a drawing or clear tables.
- Independently check customer coverage, loads and delivery windows, and calculate waiting, service, depot return and costs using code.
- Save inputs, prompts, raw responses, model/settings and findings; download full JSON evidence, schedule CSV and a readable report. Preserve earlier experiments when settings change.

Publish the code on GitHub and provide a working website link. Keep API keys on the server and out of the repository.

3. Run an OR-Tools benchmark locally

Adapt the time-window example by adding capacity constraints. Use Northline's data, rules and cost objective, including service durations and depot return.

Run locally in Python, separately from the website and independently of the LLM's routes. Save route schedules and a scenario-summary CSV showing solution status, vans used, cost and runtime. Include runnable code, solver version and search settings. Keep unsuccessful runs in the summary.

4. Compare the results and recommend a decision

Test both methods with three vans available and then two. After comparing these results, identify one weakness or limitation in a specific plan. Choose one change to the data or operating conditions that addresses it, and test both methods using the same changed settings. State exactly what you changed, explain why you chose it and show whether it helped.

Use identical inputs, costs and constraints for each comparison. Present a comparison table showing customers served, violations, vans used, paid minutes, cost and runtime. Keep failed runs and invalid plans in the results, but compare costs only between valid plans. A failure to find a plan does not by itself prove impossibility, and a feasible plan is not necessarily optimal.

Explain the main differences between the methods. Recommend whether two vans are sufficient, how your chosen change affects that decision and when a third van makes sense. Include one limitation of your conclusion.

DELIVERABLES

- Working website URL and GitHub repository.
- Outputs from the two OR-Tools examples.
- Website experiment downloads and local OR-Tools code, schedules and scenario-summary CSV.
- One report of no more than two pages containing your Step 1 paragraph and your Step 4 comparison, explanation and recommendation. Include source links and the website/GitHub links. No separate written explanations of Steps 2 and 3 are required.

Submit detailed outputs and evidence as separate files, outside the two-page report.
