# Practice Website Case submission

Website: https://aerontekle.github.io/accounting-lab/exams.html

Source code: https://github.com/AeronTekle/accounting-lab

## Added functionality and why it is useful

I added a two-sample SQL challenge to the Chinook exercise. The teacher’s practice question I reviewed provided a data download and AI help. In Accounting Lab, students run the same query on two samples from the supplied database and immediately compare both results. For example, SUM(DISTINCT Total) correctly returns $5.94 when the two invoices have different values. On the second sample, two separate invoices are each worth $1.98, so the same query returns $1.98 instead of $3.96. The site reveals both invoice IDs and asks students how they would identify a unique invoice. This helps them see why a correct answer on one sample can hide an accounting error and gives them a concrete way to test their revised method.

## Why the starting materials make this case harder

Compared with simply solving an individual previous case, this assignment requires turning several cases into a coherent practice website. The starting materials contain Word instructions, spreadsheets, text/CSV extracts and SQLite databases, but no finished question bank, answer schema or website source. I therefore had to identify the skills, determine what each row represents, map questions to exact files and independently verify the answers. Payroll extracts have different structures, employee codes vary in length, and one-to-many joins can change totals. Regression also requires joining and aggregating sales, weather and game information before interpreting results. The extra difficulty is combining reliable course interpretation with software design and choosing an improvement whose usefulness can be demonstrated.

Chinook challenge: https://aerontekle.github.io/accounting-lab/exams.html?question=c2
