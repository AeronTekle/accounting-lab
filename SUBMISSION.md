# Practice Website Case submission

Website: https://aerontekle.github.io/accounting-lab/exams.html

Source code: https://github.com/AeronTekle/accounting-lab

## Added functionality and why it is useful

I added an Examiner Follow-up Mode to help students practise explaining their work aloud. After a practice question, the student has up to 60 seconds to answer a follow-up, then checks their response against three key points. For example, after comparing restaurant sales on game and non-game days, the student has to explain whether the difference could be due to the day of the week and how they would check. The teacher’s site lets students practise solving the original questions and ask for help. This feature gives them a separate chance to rehearse defending their result and responding to a follow-up, as they would in an oral exam.

## Why the starting materials make this case harder

Compared with simply solving an individual previous case, this assignment requires turning several cases into a coherent practice website. The starting materials contain Word instructions, spreadsheets, text/CSV extracts and SQLite databases, but no finished question bank, answer schema or website source. I therefore had to identify the skills, determine what each row represents, map questions to exact files and independently verify the answers. Payroll extracts have different structures, employee codes vary in length, and one-to-many joins can change totals. Regression also requires joining and aggregating sales, weather and game information before interpreting results. The extra difficulty is combining reliable course interpretation with software design and choosing an improvement whose usefulness can be demonstrated.

Regression follow-up: https://aerontekle.github.io/accounting-lab/exams.html?question=r15
