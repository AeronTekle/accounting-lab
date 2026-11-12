# Verification and requirement review

## Required deliverables

1. Working website: linked in README.md and SUBMISSION.md and hosted on GitHub Pages.
2. Source repository: https://github.com/AeronTekle/accounting-lab
3. One paragraph about the useful added functionality: SUBMISSION.md.
4. One paragraph about why the starting materials are harder: SUBMISSION.md.

## Content and behaviour

- 82 distinct course-based questions: 40 SQL, 26 Excel/ETL and 16 regression.
- 26 authored practice sets: 18 data manipulation exams (five questions each) and eight regression exams (four questions each). Every question appears in at least one set.
- Original downloaded case files are byte-preserved; source hashes are recorded. Movies and P-cards use explicitly defined 2,000-record subsets; their checked answers use those exact subsets.
- Restaurant models were calculated from the supplied workbook, not invented. The authoring script documents aggregation, date joins, ordinary least squares and standard-error assumptions.
- All 22 supported formula functions and the 12 employee-code/payroll exercise answers passed the independent checks in node check.cjs.
- All question IDs, exam compositions, downloadable files, original hashes, regression arithmetic, 22 additional SQL answers and subset database integrity passed node check-course.cjs.
- node demonstrate-improvement.cjs confirms that an alternative correct SQL query returns 2328.60, whereas the invoice-line duplication query returns 20848.62. This is functional evidence, not evidence of improved learning or a promised grade.

## Submission review on 12 November 2026

`node check.cjs`, `node check-course.cjs` and `node demonstrate-improvement.cjs` passed. `node check-loading.cjs` checks the static fallback, successful and delayed content loading, HTTP failure, invalid JSON and a pending request aborted at the 12-second deadline. The static fallback includes course-file links and the three original exercises with their follow-ups and review points.

A separate Python audit read the actual published workbooks using pandas, compared ten workbooks/CSV files and the two complete SQL databases byte-for-byte with the original uploaded ZIP, and checked the employee and payroll JSON rows against the source worksheets. It executed all 40 SQL reference queries and independently checked the director result by person ID. The six regression models were refitted from the restaurant sales, weather and game worksheets using QR decomposition, checking coefficients, standard errors, p-values and R² against the displayed output on 312 dates. The existing formula checks cover every supplied employee-code and payroll row.

| Source calculation | Verified result |
| --- | --- |
| 2015 gross wages | $1,086,734.19 |
| 2016 gross wages | $1,352,789.75 |
| Wage increase | $266,055.56 |
| Missing Employee_Number in 2016 | 68 rows, $32,951.29 gross wages |
| Gross wages per hour, 2015 and 2016 | $33.05 and $33.20 |
| Brooklyn shooting permits | 10,367 |
| Mean shooting-permit duration | 16.98 hours |
| Game-day difference in the simple regression | $1,436.30 |

The permit-duration prompt was clarified to request calculation from unrounded durations and a final mean reported to two decimals. No numerical answer changed during this review.

## Follow-up mapping and evidence

| Exercise | Follow-up tests | Review criterion |
| --- | --- | --- |
| i2, missing employee numbers | Whether incomplete identification justifies removing recorded wages | Retain and flag the wages pending reconciliation |
| m13, qualifying directors | Duplicate join rows and different people sharing a name | Deduplicate by person ID before displaying names |
| r15, game-day sales | A possible weekday explanation for the group difference | Investigate weekday composition and avoid claiming causality |

These are authored prompts with self-review criteria. The 60-second limit is a practice design choice. The teacher’s page labels its exercises as oral exam practice, but these follow-ups are not presented as official examiner questions. No educational-effectiveness study or student feedback has been invented.

## Browser storage

`accountingLab.v1` holds completed exercise IDs and SQL/formula drafts, including calculation mode and attempt-specific draft keys. `accountingLab.exam.v1` holds the current exam session, written answers, attempted-question marks, question selection and timer state. Follow-up timer and checklist state are held in memory. The exam-page footer and lab help describe browser storage. Clearing site storage removes saved drafts and progress.

## Practical limits

The Excel interpreter implements a documented subset, not all Excel features. Advanced spreadsheet cases use downloadable original workbooks. Free-text explanations use published assessment criteria and student self-review; there is no invented automatic grade. The practice exams are not guaranteed official exam questions. The optional Fiftyville case is not included. No empirical educational-effectiveness study has been claimed.

## Live usability review on 12 November 2026

The live site accepted a correct invoice-revenue SQL query and an alternative payroll formula returning 33.05. The full mock could be started, paused, refreshed, resumed and completed through both sections into the combined review. Question search and examiner follow-up review/retry also worked.

Two live failures were reproduced and fixed. Refreshing a guided regression question erased its written answer, and switching to the home screen left the question URL unchanged so refresh reopened the question. Guided written answers and attempted-question marks now survive reopening, refresh and switching guided questions. URLs now reflect the visible page, guided question or timed exam, including browser Back and Forward. A finished exam review can also be reopened by refresh.

Numeric checks now accept English thousands separators, including the displayed game-day result 1,436.30. Editing SQL or a formula while a calculation is running cancels that calculation and preserves the new draft, avoiding feedback for an older editor value. `node check-navigation.cjs` covers the saved-answer and URL regressions, finished-review restoration and formatted numeric entry.

An individual timed set initially exposed its questions before Start and while paused, although full mock sections hid them. Both formats now show downloads before starting, reveal questions while the timer runs, and hide the question workspace while paused. Written work and lab drafts remain available on resume.

## Simpler browsing

The home page now offers three study routes. Topic practice, timed exams, oral practice and course files have separate navigation destinations. Topic practice has subject buttons and case/search filters. Previous and Next move through the filtered questions and retain guided drafts. Oral exercises return to the oral page. The embedded lab uses the outer question’s hint and solution controls and adjusts its height to its content.

## Expanded oral practice

The oral library now contains 24 authored follow-ups, with eight each for Excel, SQL and regression. Subject buttons keep the list to eight exercises at a time. New prompts cover variable-length codes, weighted payroll rates, missing-value markers, journal joins, invoice totals, distinct counting, ranking ties, audit flags, forecast inputs, extrapolation and nonlinear temperature effects. Each is linked to its original exercise and has three specific review criteria. Course checks validate all 24 question IDs, the eight-per-subject distribution and the three distinct criteria per prompt. The static loading fallback retains its three examples.

## Exam replay

New timed attempts record SQL and formula submissions through messages validated against the active embedded workspace, origin, question and attempt. Result comparisons use the same output checks as guided practice, with their outcomes shown after finishing. Query text, formula mode and short output previews are retained as separate run snapshots. Written answers and unsubmitted editor text appear as drafts. Viewing time excludes pauses, other site pages and hidden browser tabs and is capped at the section deadline. A restored page begins a fresh viewing segment. Detailed records are available for attempts created after the update.

The review table shows viewing time, run counts, the latest result or a no-work status. A replay dialog compares saved versions and opens a chosen version in guided practice. An archive on the timed-exam page keeps the five latest completed replays in this browser. Existing attempts without replay data retain their normal review. `node check-replay.cjs` verifies timing segments, deadlines, duplicate messages, run snapshots, interruptions, legacy sessions and archive retention.

Live replay verification recorded two Excel runs and three SQL runs in M02. The SQL sequence contained an invalid-column error, the join query returning 20,848.62 and the corrected query returning 2,328.60. The review displayed three untouched questions. Selecting the incorrect query in replay restored its exact text in guided practice. A second regression attempt retained its written explanation after refresh. Both completed attempts remained available in the recent-replay archive. The standalone Excel sandbox also continued to calculate SUM(1,2) as 3.
