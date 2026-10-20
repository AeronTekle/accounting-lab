# Practice Website Case submission

Website: https://rawcdn.githack.com/AeronTekle/accounting-lab/8a36cefcf8739197286bbeea61fc30a1ed0dac51/exams.html

Source code: https://github.com/AeronTekle/accounting-lab

## Added functionality and why it is useful

My website adds an executable workspace inside practice questions, so students can run read-only SQL or selected Excel formulas against the attached data and inspect the result immediately. In the teacher's version I reviewed, manipulation questions instead provide downloadable files and an AI-help form. This addresses a specific accounting problem: a query can execute successfully while duplicating transactions. In my reproducible Chinook check, summing invoice totals after joining invoice lines returns $20,848.62 instead of $2,328.60; the checker rejects that result while accepting an alternative correct query that sums line prices times quantities. This makes feedback about data granularity concrete rather than judging SQL wording. The Excel workspace similarly checks every source row. The benefit is immediate, verifiable feedback during short practice sessions; improved learning has not been measured.

## Why the starting materials make this case harder

Compared with simply solving an individual previous case, this assignment requires turning several cases into a coherent practice website. The starting materials contain Word instructions, spreadsheets, text/CSV extracts and SQLite databases, but no finished question bank, answer schema or website source. I therefore had to identify the skills, determine what each row represents, map questions to exact files and independently verify the answers. Payroll extracts have different structures, employee codes vary in length, and one-to-many joins can change totals. Regression also requires joining and aggregating sales, weather and game information before interpreting results. The extra difficulty is combining reliable course interpretation with software design and choosing an improvement whose usefulness can be demonstrated.

Hosting: GitHub-backed static CDN, outside Sites. This immutable link serves the published gh-pages snapshot. A brief host confirmation screen may appear on first opening. GitHub Pages branch is prepared but the GitHub Pages setting is not yet enabled.
