# Verification and requirement review

## Required deliverables

1. Working website: linked in README.md and SUBMISSION.md; hosted outside Sites through a GitHub-backed static CDN.
2. Source repository: https://github.com/AeronTekle/accounting-lab
3. One paragraph about the useful added functionality: SUBMISSION.md.
4. One paragraph about why the starting materials are harder: SUBMISSION.md.

## Content and behaviour

- 32 distinct course-based questions: 12 SQL, 14 Excel/ETL, six regression.
- Nine complete authored practice sets: six Excel/SQL exams (five questions each), three regression exams (four questions each).
- Original downloaded case files are byte-preserved; source hashes are recorded. Movies and P-cards use explicitly defined 2,000-record subsets; their checked answers use those exact subsets.
- Restaurant models were calculated from the supplied workbook, not invented. The authoring script documents aggregation, date joins, ordinary least squares and standard-error assumptions.
- All 22 supported formula functions and the six original interactive exercise answers passed the independent checks in node check.cjs.
- All question IDs, exam compositions, downloadable files, original hashes, regression arithmetic, six added SQL answers and subset database integrity passed node check-course.cjs.
- node demonstrate-improvement.cjs confirms that an alternative correct SQL query returns 2328.60, whereas the invoice-line duplication query returns 20848.62. This is functional evidence, not evidence of improved learning or a promised grade.

## Browser and publication checks

Local browser checks exercised question-bank filtering, the embedded exam workspace, hidden review controls during practice exams, start/pause, timer persistence after navigation/refresh, review mode, and regression output. The earlier studio tests checked actual SQL execution, wrong-answer feedback, alternative/correct results, row-wise Excel calculations, the 33.05 payroll result and CSV download.

The browser service disconnected during the final hosting configuration. GitHub Pages remains disabled; its deployable gh-pages branch is prepared. A CDN publication outside Sites was used instead. HTTPS checks then fetched the two HTML pages, scripts, styles, Worker files, WebAssembly, four databases, JSON data/catalog/model files and representative original workbooks. All 22 requested files returned HTTP 200 and exactly matched local bytes. See host-verification.json. Live browser interaction was not repeated after the outage. The CDN may show its standard confirmation page on first opening.

## Practical limits

The Excel interpreter implements a documented subset, not all Excel features. Advanced spreadsheet cases use downloadable original workbooks. Free-text explanations use published assessment criteria and student self-review; there is no invented automatic grade. The practice exams are not guaranteed official exam questions. The optional Fiftyville case is not included. No empirical educational-effectiveness study has been claimed.
