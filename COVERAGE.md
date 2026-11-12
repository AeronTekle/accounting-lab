# Content coverage comparison

Checked against the public teacher catalogue on 12 November 2026.

| Area | Teacher catalogue | Accounting Lab |
|---|---:|---:|
| Excel questions | 200 | 359 |
| SQL questions | 200 | 332 |
| Regression questions | 120 | 160 |
| Excel + SQL exam combinations | 800 | 800 |
| Four-question regression sets | 30 | 44 |

Counts include practice variants. Different filters or inputs do not represent entirely different skills. Exam combinations reuse the question bank, as in the teacher catalogue.

## Methods covered

| Source family | Covered methods |
|---|---|
| Film permits | Text/locale import; filters/sorts; conditional and text counts; duration and lead time; year filters; modes/rankings; two-dimensional pivots |
| Employee codes | Variable-length suffix extraction; numeric conversion and intervals; monthly/weekly classification; one/two-letter suffixes; extracted-field filters and pivots |
| Journal entries | Account, business unit, source and compound preparer lookups; line preservation; unmatched references; signed Debit/Credit/Amount summaries and counts |
| Payroll 2015 | Original CSV import; job extraction and numeric bands; regular/OT hours and pay; zero-denominator rates; employer tax fields; employee/job/division summaries; two-way and monthly grouping; date boundaries |
| Payroll 2016 | Original CSV import; project/job extraction and bands; hours and gross pay; employee cost and taxes; multiple employee identifiers; project filters; two-way summaries; missing-identifier groups |
| Songs | Filters/patterns; joins; aggregate ranges and means; artist counts; filtered aggregates; HAVING; deterministic sorting |
| Movies | Year/rating/vote filters; patterns; aggregates and yearly summaries; HAVING; distinct person identities; actor/director relationship chains |
| Chinook | Customer/invoice joins; country conditions; grouped counts/totals/means; price filters; purchased-unit analysis by track, album and genre; HAVING |
| Purchasing cards | Positive purchases versus signed refunds; positive refund values; vendor patterns; FullName identity; thresholds; year/month and two-dimensional grouping |
| Regression | Predictions with all terms; continuous and dummy coefficients; 5% tests and p-value meaning; squared terms/local slopes/turning points; all interaction coefficients/reference groups; extrapolation and forecasting limits |

`coverage-audit.json` maps all 400 manipulation questions by source/topic to representative local exercises, plus all 120 regression questions by task type. It stores IDs and topic metadata, not copied prompts or solutions. Rebuild with `node audit_coverage.cjs <public-manipulation-catalogue.json> <public-regression-catalogue.json>`.

## Differences retained

The site is an original practice implementation. Local questions, parameter values and reduced SQL data samples differ. The teacher uses synthetic regression contexts; the additional local outputs are fitted to the supplied restaurant case across 30 predictor/indicator settings. This covers the same regression methods, without claiming identical context diversity or difficulty. The teacher provides embedded AI help; Accounting Lab provides fixed hints, executed result checks, worked solutions, oral follow-ups and Exam Replay. It has no server AI tutor. Workbook tasks that need pivots, imports or arbitrary Excel functionality use the downloaded files in Excel; the in-page formula lab remains a limited interpreter. Neither topic mapping nor question counts prove a learning improvement.
