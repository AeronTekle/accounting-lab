# Run the completed solution

Website: https://dispatch-lab-northline.atleks.chatgpt.site

GitHub: https://github.com/AeronTekle/accounting-lab/tree/dispatch-lab-case/dispatch-lab

Read `Report.md` for the full answer. `results/comparison.csv` contains the paired scenario results; `results/website_evidence.json` includes all actual Gemini responses, including errors. `results/ortools_evidence.json` contains the independent local benchmark.

## Local OR-Tools benchmark

Use Python 3.12 (tested: 3.12.14).

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python benchmark.py
python check_results.py
```

Run these commands from `Reference_Solution`. They read the supplied CSV files in `../Student_Materials`. OR-Tools is pinned to 9.15.6755. The benchmark writes its actual results, schedules and summary to `results/`; rerunning overwrites these generated benchmark files. Preserve the submitted evidence before rerunning. Bounded search results and runtimes can vary between machines.

Run `python examples/run_examples.py` to repeat the original and changed Google samples. It changes one data field per example through the wrapper; Google's downloaded source files remain unchanged.

`check_results.py` independently replays valid solver plans, writes a step-by-step route check and compares the website's JavaScript calculations with Python on real LLM proposals. The changed-window two-route witness is retained separately; a failed search is not a proof of impossibility.

## Website

See `website/README.md`. Run with Node 22+ from the `website` directory. No npm dependencies. Set the Gemini key in the server environment, then run:

```bash
node scripts/dev.mjs --port 4173
```

Open the resulting HTTP address, rather than opening the HTML file directly. The hosted site already has its Gemini key configured. Do not copy a key into source files, the browser or exports.

To repeat the eight Gemini scenarios automatically through the same website backend, run from `website`:

```bash
node scripts/run-llm.mjs --output ../results
```

This requires the Gemini environment variables. It preserves existing records and skips scenarios already attempted with the configured model. To start a new run, choose a fresh output directory. API errors are retained without automatic retries. The submitted hosted-interface attempt is also retained in the evidence.

The saved reference experiments can be loaded from the website without issuing new model requests. Browser notes are local to that browser; download JSON to keep a backup. A new model request needs the configured provider to be available and within quota.
