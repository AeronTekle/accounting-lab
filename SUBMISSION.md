# Practice Website Case submission

Website: https://aerontekle.github.io/accounting-lab/exams.html

Source code: https://github.com/AeronTekle/accounting-lab

## Added functionality and why it is useful

I added Exam Replay so students can review the steps they took during a timed practice exam. The teacher’s question pages I inspected provide questions, downloads and AI help. My replay adds a record of the student’s own SQL/formula submissions, short result previews and time spent viewing each question. After finishing, the student can compare saved versions and reopen one in guided practice. In a functional test, a query summing invoice totals after joining to invoice lines returned 20,848.62. The corrected query returned 2,328.60. Replay retained both queries and their outputs and distinguished a SQL execution error from a query that ran but produced a different result. It also identified three questions with no recorded work. This gives students evidence they can use to review mistakes and time allocation. The five latest completed replays stay in the browser. Recording covers work entered on the site, and the usefulness argument rests on demonstrated functionality rather than measured learning outcomes.

## Why the starting materials make this case harder

Compared with simply solving an individual previous case, this assignment requires turning several cases into a coherent practice website. The starting materials contain Word instructions, spreadsheets, text/CSV extracts and SQLite databases, but no finished question bank, answer schema or website source. I therefore had to identify the skills, determine what each row represents, map questions to exact files and independently verify the answers. Payroll extracts have different structures, employee codes vary in length, and one-to-many joins can change totals. Regression also requires joining and aggregating sales, weather and game information before interpreting results. The extra difficulty is combining reliable course interpretation with software design and choosing an improvement whose usefulness can be demonstrated.

Regression follow-up: https://aerontekle.github.io/accounting-lab/exams.html?question=r15


## Browser storage

The site uses this browser’s local storage for written answers, SQL and formula drafts, attempted/completed-question marks, the current question selection and timer state. Formula drafts include the selected calculation mode. The five latest completed exam replays store submitted SQL/formulas, result checks, short output previews, final drafts and time spent viewing each question. Follow-up checklists are temporary. Work stays with the browser profile on the device and can be removed through browser settings.
