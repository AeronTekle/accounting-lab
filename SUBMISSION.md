# Practice Website Case submission

Website: https://aerontekle.github.io/accounting-lab/exams.html

Source code: https://github.com/AeronTekle/accounting-lab

## Added functionality and why it is useful

I added an Examiner Follow-up Mode to rehearse explaining and defending a result during oral exam preparation. Suggestions 13–15 concern conversation history and tutor replies. My feature provides 24 authored follow-ups, eight each for Excel, SQL and regression, attached to specific completed exercises, each with up to 60 seconds to answer aloud and three review points. The payroll follow-up asks whether missing employee numbers justify excluding recorded wages. The SQL follow-up asks how to handle repeated directors and different people sharing a name. The regression follow-up asks whether weekday differences could explain higher game-day sales and how to investigate. These questions probe an assumption or a limitation of the student's result. The prompts and criteria run directly in the browser without an AI service or API key, so the practice is repeatable. I checked that all 24 follow-ups point to the intended exercises and that their review points agree with the data and worked methods. This demonstrates what the feature does; its effect on student learning has yet to be measured.

## Why the starting materials make this case harder

Compared with simply solving an individual previous case, this assignment requires turning several cases into a coherent practice website. The starting materials contain Word instructions, spreadsheets, text/CSV extracts and SQLite databases, but no finished question bank, answer schema or website source. I therefore had to identify the skills, determine what each row represents, map questions to exact files and independently verify the answers. Payroll extracts have different structures, employee codes vary in length, and one-to-many joins can change totals. Regression also requires joining and aggregating sales, weather and game information before interpreting results. The extra difficulty is combining reliable course interpretation with software design and choosing an improvement whose usefulness can be demonstrated.

Regression follow-up: https://aerontekle.github.io/accounting-lab/exams.html?question=r15


## Browser storage

The site uses this browser’s local storage for written answers, SQL and formula drafts, attempted/completed-question marks, the current question selection and timer state. Formula drafts include the selected calculation mode. Follow-up checklists are temporary. Work stays with the browser profile on the device and can be removed through browser settings.
