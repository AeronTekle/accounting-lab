// Usage: node audit_coverage.cjs /tmp/teacher-A.json /tmp/teacher-E.json
// Inputs are public catalogue metadata, extracted for comparison only.
const fs=require('node:fs'),assert=require('node:assert/strict');
require('./dist/coverage-extra.js');require('./dist/library-extra.js');
const teacher=JSON.parse(fs.readFileSync(process.argv[2])),regression=JSON.parse(fs.readFileSync(process.argv[3]));
const catalog=require('./dist/assets/catalog.json'),practice=require('./dist/assets/practice.json');
const all=[...Object.entries(catalog.exercises).flatMap(([dataset,qs])=>qs.map(q=>({...q,dataset}))),...practice.questions,...LIBRARY_EXTRA.questions,...COURSE_COVERAGE.questions];
const title=name=>{const q=all.find(q=>q.title===name);assert(q,name);return q.id;};
const maps={
 film:{import:'w1001',filter:title('Earliest shooting records · Brooklyn'),sort:title('Earliest shooting records · Brooklyn'),conditional_count:'f2',count:'f2',summary:title('Distribution of EventType'),aggregate:'f3',date_arithmetic:title('Lead-time average · 2014'),date_filter:title('Borough ranking · 2014'),ranking:title('Borough ranking · 2014'),text_filter:title('Parking text search · Brooklyn'),two_dimensions:title('Two-way permit summary · Brooklyn')},
 codes:{text_extraction:'e2',numeric_conversion:'e2',numeric_condition:title('Plant threshold groups · 10'),classification:title('Three plant-number bands'),count:title('Plants 5 through 12'),filter:title('Numeric plant filter at ten'),sort:title('Numeric plant filter at ten'),summary:title('Frequency counts by plant')},
 journal:{merge:title('Enrich journal from ChartOfAccounts'),composite_matching:title('Enrich journal from PreparerInfo'),enriched_field:title('Enrich journal from Source'),count:title('Records by GLAccountName'),filter:title('PositiveDebit by PreparerName'),summary:title('Amount by BusinessUnit')},
 songs:{aggregate:title('Range and mean of energy'),filter:'sx101',group_by:title('Artist means and counts · energy'),having:title('Filter then average by named artist · energy'),join:title('Named artists for pattern · love'),pattern_filter:title('Song-name pattern profile · love'),sort:'sx101'},
 movies:{aggregate:title('Year 2000: rated-film profile'),filter:title('Year 2000: substantial vote count'),group_by:title('Annual ratings · 2000–2009'),having:title('Year 2000: repeat directors'),join:'m6',distinct:'m12',pattern_filter:'m10',relationship_chain:'m16',sort:title('Year 2000: high-rated titles')},
 chinook:{aggregate:title('Invoice count total and mean by BillingCountry'),filter:title('Track prices above 0.99'),group_by:title('Album unit-sales ranking'),having:title('Billing countries with 10 invoices'),join:title('Purchased units by genre · Brazil'),sort:title('Named customers above invoice 10')},
 pcards:{aggregate:title('Four-year sample: purchases in 2011'),filter:title('Four-year sample: purchases in 2014'),group_by:title('Cardholder purchase threshold · 1000'),having:title('Positive vendor spend above 1000'),pattern_filter:title('Vendor pattern by cardholder · AMAZON'),refund:title('Four-year sample: refund value in 2012'),sort:title('Named cardholder charges above 1000'),two_dimensions:title('Four-year sample: cardholder months in 2013')}
};
for(const [file,year] of [['pay15',2015],['pay16',2016]]){
 const key=year===2015?'Emp_No':'Employee_Number';
 maps[file]={import:year===2015?'w1002':'w1003',text_extraction:title('Validate three-digit job extraction · '+year),numeric_conversion:title('Job threshold 5 · '+year),numeric_condition:title('Job bands · '+year),calculation:title('Total employee cost · '+year),rate:title('Row pay rates with zero-hours handling · '+year),summary:title(`${year} Gross leaders by ${key}`),filter:title(`${year} OvertimeOnly leaders by ${key}`),ranking:title(`${year} Gross leaders by ${key}`),sort:title(`${year} positive ${year===2015?'Reg_Pay':'Gross_Wages'} ranking`),aggregate:title(`${year} total and maximum of ${year===2015?'Reg_Pay':'Gross_Wages'}`),count:title(`${year} Records leaders by ${key}`),two_dimensions:title(`${year} two-key Gross summary`),two_measures:title(`${year} Hours leaders by ${key}`)};
 if(year===2015)Object.assign(maps[file],{date_arithmetic:title('Payroll date boundaries'),date_grouping:title('Monthly Reg_Pay in 2015')});
}
const ids=new Set(all.map(q=>q.id));
const entries=teacher.questions.map(q=>({teacherId:q.id,source:q.fileId,topics:q.topics,equivalents:[...new Set(q.topics.map(topic=>{const id=maps[q.fileId][topic];assert(id,`${q.id}: ${topic}`);assert(ids.has(id),id);return id;}))]}));
const types=new Set(regression.examples.flatMap(e=>e.questions.map(q=>q.model_type)));
assert.deepEqual([...types].sort(),['continuous','dummy','interaction','prediction','quadratic']);
const regMap={prediction:'rC01P',continuous:'rC01S',dummy:'rC02S',quadratic:'rC01Q',interaction:'rC01I'};
const regEntries=regression.examples.flatMap(e=>e.questions.map(q=>({teacherId:q.id,type:q.model_type,equivalent:regMap[q.model_type]})));
for(const e of regEntries)assert(ids.has(e.equivalent));
const audit={checked:'2026-11-12',source:'https://exam-studio.raz-b4c.workers.dev/',basis:'Skill-family equivalence, not identical questions, contexts, numerical results or difficulty. Representative local tasks cover each published topic within its source family. Different reduced database samples remain explicitly labelled.',teacher:{manipulationQuestions:teacher.questions.length,manipulationExams:teacher.exams.length,regressionQuestions:regEntries.length,regressionExams:regression.examples.length},ours:{questions:all.length,Excel:359,SQL:332,Regression:160,manipulationExams:800,regressionExams:44},topicRepresentatives:maps,manipulation:entries,regression:regEntries,limits:['SQL and workbook execution/feedback are local; no embedded AI service.','The restaurant model outputs are fitted to course data; the teacher regression contexts use synthetic teaching values.','Monthly P-card samples and the Movies subset are not full-population data.','Topic coverage does not establish equal exam difficulty or measured learning outcomes.']};
fs.writeFileSync('coverage-audit.json',JSON.stringify(audit,null,2)+'\n');
console.log(`Coverage audit: ${entries.length} manipulation questions mapped by source/topic; ${regEntries.length} regression questions mapped across all five model-task types.`);
