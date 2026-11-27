RUN THE REFERENCE SOLUTION

Keep Reference_Solution beside Student_Materials, which supplies the two CSVs.
Run the commands below from Reference_Solution unless stated otherwise.

1. LOCAL PYTHON / OR-TOOLS (Python 3.12; OR-Tools 9.15.6755)

python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r Code/OR_Tools/requirements.txt
python Code/Examples/run_examples.py --output new_example_outputs
python Code/OR_Tools/benchmark.py --output new_results

These commands write new outputs rather than overwrite submitted evidence.
The benchmark tests normal-three, normal-two and two vans at capacity 125.
It never reads LLM routes. Bounded-search results/timings can vary.

2. WEBSITE (Node 22 or later; no npm dependencies)

Website: https://dispatch-lab-northline.atleks.chatgpt.site
GitHub: https://github.com/AeronTekle/accounting-lab/tree/dispatch-lab-case/dispatch-lab

For a local run, change into Code/Website. Set GEMINI_API_KEY in the server
shell environment and GEMINI_MODEL=gemini-3.1-flash-lite. Then run:

node scripts/dev.mjs --port 4173

Open http://localhost:4173 (do not open the HTML file directly).
The hosted site already has its key configured. New requests depend on
Gemini availability/quota. No key is included in these files.

Click Load reference experiments to inspect the saved case results without
making new API calls. JSON saves raw evidence; CSV saves schedules; TXT
saves readable findings. Experiments/notes are local to the current browser.
The only presets are normal-three, normal-two and the chosen capacity change.

node scripts/test.mjs checks constraints and failure handling without API calls.
node scripts/build.mjs builds the website as a Worker module in dist/server.

The two-page report contains the required writing. Evidence contains the
original sample outputs, actual API downloads, solver results and comparison.
The baseline API records are from 26 November; the capacity follow-up and
local solver benchmark are from 27 November 2026. The comparison retains
one relevant failed API request as well as invalid plans. Older scenarios
outside the revised case are excluded from this reference submission.
