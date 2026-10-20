# Accounting Lab

A Danish browser-based practice website for selected Data Analytics in Accounting skills. Students run SQL or Excel-style formulas directly against attached course data, inspect results, and check answers. No AI API key is required.

## Run and verify

Serve `dist/` with a static HTTP server. File URLs do not support the Worker and fetch workflow. All JavaScript, SQLite WebAssembly and datasets are hosted with the application; no external scripts, fonts or analytics are required.

Run `node check.cjs` for independent data and formula verification. It exercises all 22 supported functions, both SQL databases, every reference answer, all employee-code outputs and every gross-pay row. SQLite writes are blocked with `PRAGMA query_only`.

## Source data

All data come from the user's supplied `1. ExamStudio.zip`:

- `materials/2. SQL part 1/Assignments/cs50 assignment/songs/songs.db`: complete original database, unchanged, copied to `dist/assets/songs.db`.
- `materials/2. SQL part 1/Assignments/pwc assignment/Chinook_Sqlite.sqlite`: complete original database, unchanged, copied to `dist/assets/chinook.sqlite`.
- `materials/1. Excel part 2/ETL Assignment/data/case 3/Analytics_mindset_case_studies_ETL_Case3_Excel.xlsx`, `Case 3 data`: all 597 data rows and three source fields, serialized as `employees.json`.
- `materials/1. Excel part 3/IntegrateCo Assignment/Analytics_mindset_case_studies_IntegrateCo_2015payroll.xlsx`: all 4,981 data rows; original Reg_Hrs, OT_Hrs, Reg_Pay, OT_Pay plus First_Name and Last_Name concatenated for display. These selected fields are serialized as `payroll.json`. Payroll amounts are preserved, including seven zero-hour lines with nonzero pay.

The exercises are based on the supplied CS50 songs requirements, PwC SQL questions, ETL employee-code instructions and IntegrateCo payroll measures. This is a focused practice studio, not a claim to cover the entire course. Regression practice and full timed exams have not been added.

## Distinctive functionality

The site's proposed improvement is an integrated execution workspace: students can run actual read-only SQLite queries and a limited set of Excel-style formulas immediately within practice questions. The checker compares output values rather than requiring identical source code. SQL answers can use alternative queries; ordering is checked only when requested, and duplicate rows are preserved during comparison. Excel exercises check every supplied source row or a single aggregate, as appropriate.

This reduces setup for short practice sessions. It does not replace practising in Microsoft Excel or prove readiness for an oral exam. Claimed educational benefit is a design rationale, not a measured learning-effectiveness result.

## Deliberate limits

- Formula support is a bounded interpreter, not the full Excel engine. No arbitrary JavaScript evaluation is used. There are no arrays, dates, cross-sheet references, charts, pivot tables, output-column references or arbitrary workbook uploads. English function names, dot decimals and comma/semicolon argument separators are supported. SEARCH has no wildcard support. Unsupported functions produce explicit errors.
- SQL runs one prepared statement in a fresh read-only in-memory database per run. It is bounded to 10,000 result rows, with 200 displayed. Workers are terminated after eight seconds to keep the page responsive. Large or costly queries can time out.
- Formula results have a tolerance for floating point comparisons. Final payroll-rate exercises explicitly round to two decimals. Matching the supplied dataset is not a proof of algorithmic correctness for every dataset.
- Drafts and completed-exercise status are stored only in this browser's localStorage. There is no shared progress database or AI tutor.
- Data downloads and semicolon-delimited CSV exports are available. The original SQL databases are complete; the Excel sandbox uses explicitly documented selected fields.

## Files and licensing

`dist/app.js` defines questions, reference solutions and UI behaviour. `dist/formula.js` implements the bounded expression parser. `dist/sql-worker.js` and `dist/excel-worker.js` run calculations off the UI thread. `dist/style.css` provides responsive styling.

SQLite execution uses sql.js 1.15.1, bundled from npm with its MIT license retained at `dist/assets/sql-js-LICENSE.txt`. Course data are retained for the user's educational assignment; no new ownership or redistribution license is asserted.
