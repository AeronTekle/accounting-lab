# Practice Website Case submission

Website: https://aerontekle.github.io/accounting-lab/exams.html

Source code: https://github.com/AeronTekle/accounting-lab

## Added functionality and why it is useful

My website adds an executable workspace inside practice questions, so students can run read-only SQL or selected Excel formulas against the attached data and inspect the result immediately. In the teacher's version I reviewed, manipulation questions instead provide downloadable files and an AI-help form. This addresses a specific accounting problem: a query can execute successfully while duplicating transactions. In my reproducible Chinook check, summing invoice totals after joining invoice lines returns $20,848.62 instead of $2,328.60; the checker rejects that result while accepting an alternative correct query that sums line prices times quantities. A walkthrough shows the same invoice once in the invoice table and twice after the join, so students can see exactly where the extra amount comes from before revising their query. Students can also download the same practice data and review their method against the worked solution.

## Why the starting materials make this case harder

Compared with simply solving an individual previous case, this assignment requires turning several cases into a coherent practice website. The starting materials contain Word instructions, spreadsheets, text/CSV extracts and SQLite databases, but no finished question bank, answer schema or website source. I therefore had to identify the skills, determine what each row represents, map questions to exact files and independently verify the answers. Payroll extracts have different structures, employee codes vary in length, and one-to-many joins can change totals. Regression also requires joining and aggregating sales, weather and game information before interpreting results. The extra difficulty is combining reliable course interpretation with software design and choosing an improvement whose usefulness can be demonstrated.

Chinook walkthrough: https://aerontekle.github.io/accounting-lab/exams.html?question=c2
