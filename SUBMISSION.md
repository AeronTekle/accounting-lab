# Practice Website Case submission

Website: https://aerontekle.github.io/accounting-lab/exams.html

Source code: https://github.com/AeronTekle/accounting-lab

## Added functionality and why it is useful

I added an Exam Replay to help students review how they used their preparation time and corrected mistakes. During a timed attempt, the site records submitted SQL queries and Excel formulas, short output previews and time spent viewing each question. After finishing, students can compare earlier and later attempts and reopen a saved version in guided practice. For example, a query that sums invoice totals after a one-to-many join can run successfully and produce an inflated result. Replay preserves that query beside the corrected one, with the result checks and outputs, so the student can investigate which change fixed the mistake. Questions with no recorded work are also visible. The five latest completed replays are saved in the browser. This gives the student a review of their actual problem-solving process and time allocation. The site also includes 24 authored oral follow-ups.

## Why the starting materials make this case harder

Compared with simply solving an individual previous case, this assignment requires turning several cases into a coherent practice website. The starting materials contain Word instructions, spreadsheets, text/CSV extracts and SQLite databases, but no finished question bank, answer schema or website source. I therefore had to identify the skills, determine what each row represents, map questions to exact files and independently verify the answers. Payroll extracts have different structures, employee codes vary in length, and one-to-many joins can change totals. Regression also requires joining and aggregating sales, weather and game information before interpreting results. The extra difficulty is combining reliable course interpretation with software design and choosing an improvement whose usefulness can be demonstrated.

Regression follow-up: https://aerontekle.github.io/accounting-lab/exams.html?question=r15


## Browser storage

The site uses this browser’s local storage for written answers, SQL and formula drafts, attempted/completed-question marks, the current question selection and timer state. Formula drafts include the selected calculation mode. The five latest completed exam replays store submitted SQL/formulas, result checks, short output previews, final drafts and time spent viewing each question. Follow-up checklists are temporary. Work stays with the browser profile on the device and can be removed through browser settings.
