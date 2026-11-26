# Dispatch Lab website

Live website: https://dispatch-lab-northline.atleks.chatgpt.site

The browser requests visit orders from Gemini through a server endpoint. Ordinary JavaScript calculates loads, schedules, violations and costs. This project contains **no OR-Tools integration**. The benchmark is a separate local Python program in the submission.

## Run locally

Node.js 22 or later; tested with 24.22.3. No npm dependencies.

1. Set `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.1-flash-lite` in your shell environment. Keep the key private. `.env.example` lists the names; it is not loaded automatically.
2. Run `node scripts/dev.mjs --port 4173` and open `http://localhost:4173`.
3. Run `node scripts/test.mjs` to check calculations and failure handling.

The hosted site has its key in a server secret. Visitors do not need to install the project or provide a key. New Gemini requests depend on provider availability and the configured account's quota. Saved reference experiments and baseline checking remain usable during an outage. No paid tier was enabled for this project.

## Use the website

Choose a scenario and available vans, then request a Gemini plan. Every returned attempt is saved automatically, including invalid plans, malformed responses and API errors. Select an experiment in history, add a finding, and save the note. Settings changes do not change earlier records. Download JSON for the complete evidence, CSV for schedules and TXT for findings. To inspect the completed experiment set, click **Load reference experiments**. Evidence and notes are stored in the current browser, not a shared database; download a backup.

Input imports require both original CSV files. The window-change preset moves C23 to minutes 30–75. Multipliers are applied once to original demands/journey times, rounding each item up. Invalid candidate costs are displayed as invalid and excluded from savings comparisons.

## Hosting

`node scripts/build.mjs` embeds the HTML, JavaScript, CSS, data and reference evidence into `dist/server/index.js`, a Cloudflare Worker module. `.openai/hosting.json` supplies Sites deployment identity; it contains no credentials. The same handler runs locally and when hosted. Other Worker hosts can deploy the generated module with the two Gemini environment variables. `node scripts/validate-artifact.mjs` checks the built artifact.

`core.js` contains input validation, the prompt, the API request and the independent route checker. `handler.js` exposes only the defined routes and checks request origins. `web/app.js` manages the interface and exports. The server controls the model name; the browser never receives the key. Unit-test fixtures are not experiment results.
