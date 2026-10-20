"""Rebuild course-derived assets and checked answers from the supplied extracted ZIP.
Usage: python build_course_content.py /path/to/extracted/ExamStudio
Needs openpyxl, numpy and scipy for this authoring step only; website needs no Python.
"""
from pathlib import Path
import sys,json,sqlite3,shutil,hashlib
from collections import defaultdict,Counter
import numpy as np
from scipy import stats
from openpyxl import load_workbook

ROOT=Path(sys.argv[1]);OUT=Path(__file__).resolve().parent/'dist';ASSET=OUT/'assets';MAT=OUT/'materials';MAT.mkdir(exist_ok=True)
def find(n):return next(ROOT.rglob(n))
def wb(n):return load_workbook(find(n),read_only=True,data_only=True)
def write(name,obj): (ASSET/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf8')
sources=[]
for name,dest,label in [
 ('NYC_Film_Permits.xlsx','film.xlsx','NYC Film Permits'),
 ('Analytics_mindset_case_studies_ETL_Case1.csv','etl-case1.csv','ETL Case 1'),
 ('Analytics_mindset_case_studies_ETL_Case2_Excel.xlsx','etl-case2.xlsx','ETL Case 2'),
 ('Analytics_mindset_case_studies_ETL_Case3_Excel.xlsx','etl-case3.xlsx','ETL Case 3'),
 ('Analytics_mindset_case_studies_ETL_Case4_Excel.xlsx','journal.xlsx','ETL Case 4 Journal entries'),
 ('Analytics_mindset_case_studies_IntegrateCo_2015payroll.xlsx','payroll2015.xlsx','IntegrateCo 2015'),
 ('Analytics_mindset_case_studies_IntegrateCo_2016payroll.xlsx','payroll2016.xlsx','IntegrateCo 2016'),
 ('Analytics_mindset_case_studies_IntegrateCo_jobcodes.csv','jobcodes.csv','IntegrateCo job codes'),
 ('Analytics_mindset_case_studies_IntegrateCo_locations.csv','locations.csv','IntegrateCo locations'),
 ('data.xlsm','restaurant.xlsm','Restaurant regression source workbook')]:
 src=find(name);shutil.copyfile(src,MAT/dest);sources.append({'title':label,'file':'materials/'+dest,'origin':str(src.relative_to(ROOT)),'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'note':'Original supplied file, unchanged.'})

# Small, explicitly identified practice subsets, preserving original rows and relationships.
movie_src=sqlite3.connect('file:'+str(find('movies.db'))+'?mode=ro',uri=True)
movie_out=ASSET/'movies-practice.db'
if movie_out.exists():movie_out.unlink()
d=sqlite3.connect(movie_out)
for t in ['movies','ratings','stars','directors','people']:d.execute(movie_src.execute("select sql from sqlite_master where name=?",(t,)).fetchone()[0])
ids=[r[0] for r in movie_src.execute('SELECT movie_id FROM ratings ORDER BY votes DESC,movie_id LIMIT 2000')]
marks=','.join('?' for _ in ids);person_ids=set()
for t,col in [('movies','id'),('ratings','movie_id'),('stars','movie_id'),('directors','movie_id')]:
 rows=movie_src.execute(f'SELECT * FROM {t} WHERE {col} IN ({marks})',ids).fetchall()
 if rows:d.executemany('INSERT INTO '+t+' VALUES ('+','.join('?' for _ in rows[0])+')',rows)
 if t in ['stars','directors']:person_ids.update(r[1] for r in rows)
rows=movie_src.execute('SELECT * FROM people WHERE id IN ('+','.join('?' for _ in person_ids)+')',list(person_ids)).fetchall()
d.executemany('INSERT INTO people VALUES (?,?,?)',rows);d.commit();d.close();movie_src.close()
p=sqlite3.connect('file:'+str(find('pcards.db'))+'?mode=ro',uri=True);target=ASSET/'pcards-practice.db'
if target.exists():target.unlink()
d=sqlite3.connect(target);d.execute(p.execute("select sql from sqlite_master where name='pcards'").fetchone()[0]);rows=p.execute("SELECT * FROM pcards WHERE AgencyName='OKLAHOMA STATE UNIVERSITY' AND Year=2014 ORDER BY ID LIMIT 2000").fetchall();d.executemany('INSERT INTO pcards VALUES ('+','.join('?' for _ in rows[0])+')',rows);d.commit();d.close();p.close()
extra_datasets={
 'movies':{'name':'Movies · 2.000-filmudsnit','file':'assets/movies-practice.db','meta':'2.000 film · reduceret kursusudsnit','source':'CS50 Movies · top 2.000 efter stemmetal; ikke hele databasen','schema':{'movies':'id INTEGER · title TEXT · year NUMERIC','ratings':'movie_id INTEGER · rating REAL · votes INTEGER','stars':'movie_id INTEGER · person_id INTEGER','directors':'movie_id INTEGER · person_id INTEGER','people':'id INTEGER · name TEXT · birth NUMERIC'}},
 'pcards':{'name':'P-cards · OSU-udsnit','file':'assets/pcards-practice.db','meta':'2.000 transaktioner · reduceret kursusudsnit','source':'P-card case · første 2.000 OSU-rækker med Year=2014 efter ID','schema':{'pcards':'Year INTEGER · Month INTEGER · FullName TEXT · ID INTEGER · AgencyNumber INTEGER · AgencyName TEXT · CardholderLastName TEXT · CardholderFirstInitial TEXT · Description TEXT · Amount REAL · Vendor TEXT · TransactionDate TEXT · PostedDate TEXT · MCC TEXT'}}}
def sqlq(id,title,desc,answer,hint,skill):return {'id':id,'title':title,'desc':desc,'answer':answer,'starter':answer.split('WHERE')[0].split('GROUP BY')[0].rstrip().rstrip(';')+'\n-- Færdiggør forespørgslen','hint':hint,'skill':skill,'explain':'Svaret kontrolleres på det downloadbare, reducerede kursusudsnit. Resultatet kan afvige fra den fulde kursusdatabase.','ordered':False}
extra_exercises={
 'movies':[
 sqlq('m1','Film fra 2007','Vis titlerne på film udgivet i 2007 i det valgte udsnit. Vis kun title; rækkefølgen er valgfri.','SELECT title FROM movies WHERE year=2007;','Filtrér movies.year med WHERE.','WHERE'),
 sqlq('m2','Gennemsnitlig filmrating','Find den gennemsnitlige rating for film fra 2013 i udsnittet. Returnér ét tal.','SELECT AVG(r.rating) FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE m.year=2013;','Forbind movie_id med movies.id før du filtrerer på år.','JOIN · AVG'),
 sqlq('m3','Hvem er med i Harry Potter?','Vis personnavne for skuespillere i Harry Potter and the Sorcerer\'s Stone i udsnittet. Vis hvert person-ID én gang. Rækkefølgen er valgfri.',"SELECT p.name FROM people p WHERE p.id IN (SELECT s.person_id FROM stars s JOIN movies m ON m.id=s.movie_id WHERE m.title='Harry Potter and the Sorcerer''s Stone');",'Du skal forbinde movies, stars og people. En IN-subquery undgår at gentage person-ID.','RELATIONER')],
 'pcards':[
 sqlq('a1','Køb over beløbsgrænsen','Hvor mange transaktioner i dette OSU-udsnit har Amount strengt over 5000? Det er undersøgelsesflag, ikke bevis for regelbrud. Returnér ét tal.','SELECT COUNT(*) FROM pcards WHERE Amount>5000;','Brug > 5000, ikke >= 5000. Undtagelser kan kræve ekstra dokumentation.','COUNT · KONTROL'),
 sqlq('a2','Beløb fordelt på leverandør','Vis Vendor og summen af Amount for hver leverandør i udsnittet. Bevar krediteringer. Rækkefølgen er valgfri.','SELECT Vendor,SUM(Amount) AS NetAmount FROM pcards GROUP BY Vendor;','GROUP BY Vendor. Negative beløb skal med i nettosummen.','GROUP BY · SUM'),
 sqlq('a3','De største enkeltkøb','Vis ID, Vendor og Amount for de fem største positive transaktioner i udsnittet. Sortér Amount faldende og ID stigende ved samme beløb.','SELECT ID,Vendor,Amount FROM pcards WHERE Amount>0 ORDER BY Amount DESC,ID ASC LIMIT 5;','Filtrér positive beløb, sortér og begræns til fem.','ORDER BY · LIMIT')]
};extra_exercises['pcards'][2]['ordered']=True
verified_sql={}
for key,qs in extra_exercises.items():
 con=sqlite3.connect(ASSET/(key+'-practice.db'))
 for q in qs:
  result=con.execute(q['answer']).fetchall();assert result
  verified_sql[q['id']]={'rows':len(result),'preview':result[:5]}
 con.close()
(OUT/'course-extra.js').write_text('window.COURSE_EXTRA = '+json.dumps({'datasets':extra_datasets,'exercises':extra_exercises},ensure_ascii=False)+';\n')

questions=[]
def manual(id,title,category,prompt,answer,hint,files,checks):
 questions.append({'id':id,'title':title,'category':category,'kind':'Excel','prompt':prompt,'answer':answer,'hint':hint,'files':files,'checks':checks})
w=wb('NYC_Film_Permits.xlsx');v=list(w.active.values);h=v[0];fr=[dict(zip(h,r)) for r in v[1:] if r[0] is not None];w.close()
shoot=[r for r in fr if r['EventType']=='Shooting Permit'];brook=[r for r in shoot if r['Borough']=='Brooklyn'];duration=sum((r['EndDateTime']-r['StartDateTime']).total_seconds()/3600 for r in shoot)/len(shoot)
manual('f1','Import og datatyper','NYC Film Permits','Import the film-permit workbook. How many data records and columns are there? Explain why date/time fields must be recognised as dates, not text.',f'{len(fr):,} records and {len(h)} columns, excluding the header. StartDateTime, EndDateTime and EnteredOn must retain date/time meaning; numeric date arithmetic on text is unreliable. In a text import, explicitly select the correct delimiter and date/number locale.','Do not count the header. Check StartDateTime after import.',['materials/film.xlsx'],['Exclude the header','Identify 33,502 records and 14 fields','Explain date and locale handling'])
manual('f2','Filtrering og optælling','NYC Film Permits','How many Shooting Permit records are in Brooklyn? Show an Excel method, not just a number.',f'{len(brook):,}. One method is COUNTIFS with EventType="Shooting Permit" and Borough="Brooklyn". A filtered pivot table counting EventID also works. Count permits, not unique dates.','Apply both criteria at the same time.',['materials/film.xlsx'],['Filter both EventType and Borough','Count records, not dates','Keep the formula or pivot table visible'])
manual('f3','Varighed i timer','NYC Film Permits','Find the mean permit duration in hours for Shooting Permit records. Give the unrounded mean to two decimals and explain the Excel conversion.',f'{duration:.2f} hours. In a helper column use =(EndDateTime-StartDateTime)*24; Excel date differences are days. Filter EventType="Shooting Permit", then average the helper. Do not average only Brooklyn for this question.','Excel date differences are measured in days.',['materials/film.xlsx'],['Use end minus start','Multiply days by 24','Filter Shooting Permit','Average all matching records'])
manual('t1','Ryd op uden at gætte','ETL Case 1','Identify four data-quality problems in the balance-sheet CSV and explain what you would do before analysis.','Examples: inconsistent missing inventories (blank, spaces, hyphens); inconsistent ticker spacing; duplicated APVO 2018 record; K/M suffixes; parentheses for negative depreciation; an unquoted comma inside Apple, Inc. disrupts CSV columns. Standardise missing values without replacing unknowns with zero, normalise identifiers, investigate duplicates, and parse units/signs. Do not guess the units of Total Current Assets from its magnitude: obtain metadata.','Look at identifiers, missing markers, units, duplicate records and CSV delimiters.',['materials/etl-case1.csv'],['Give four real source examples','Separate missing from zero','Do not invent Total Current Assets units','Document transformations'])
w=wb('Analytics_mindset_case_studies_ETL_Case4_Excel.xlsx');j=list(w['JELineItems'].values);jh=j[0];jr=j[1:];pre=list(w['PreparerInfo'].values);print('preparer schema:',pre[:3]);w.close()
manual('j1','Sammenkobl journaldata','ETL Case 4','Explain how to add BusinessUnit and account information to every journal line without dropping journal lines. Which identifiers should be used?','Use BusinessUnitID to match BusinessUnits and GLAccountNumber to match ChartOfAccounts. Use a lookup or left join from JELineItems. Preserve each journal line, flag unmatched IDs, and check that reference keys are unique so joins cannot multiply rows. A JENumber can occur on multiple journal lines; it is not a unique line identifier by itself.','Start with the journal lines as the table you must preserve.',['materials/journal.xlsx'],['Name the correct matching keys','Preserve journal-line count','Check duplicate and unmatched reference keys','Do not assume JENumber is unique per line'])
manual('j2','Bevar et revisionsspor','ETL Case 4','Why should the repeatable journal-data solution retain formulas rather than replace all outputs with pasted values?','Formulas retain the mapping logic and dependencies, making the transformation easier to review and repeat on a consistently structured replacement dataset. Keep source worksheets intact, populate the requested solution columns, and test both successful matches and unmatched IDs. A pasted number alone does not show how it was derived.','Think about review, re-performance and future refreshes.',['materials/journal.xlsx'],['Explain traceability','Explain repeatability','Keep source data intact'])
w=wb('Analytics_mindset_case_studies_IntegrateCo_2015payroll.xlsx');rows15=list(w.active.values)[1:];w.close();w=wb('Analytics_mindset_case_studies_IntegrateCo_2016payroll.xlsx');rows16=list(w.active.values)[1:];w.close()
pay15=sum((r[10] or 0)+(r[11] or 0) for r in rows15);pay16=sum(r[6] or 0 for r in rows16);phantom=[r for r in rows16 if r[2] is None or str(r[2]).strip()=='']
manual('i1','Sammenlign to lønsystemer','IntegrateCo','Compare total gross wages in the supplied 2015 and 2016 extracts. Define the measure consistently, and compute 2016 minus 2015.',f'2015 gross wages: {pay15:,.2f}; 2016: {pay16:,.2f}; increase: {pay16-pay15:,.2f}. 2015 uses Reg_Pay + OT_Pay; 2016 uses Gross_Wages. Do not add overtime twice in 2016. Both extracts cover the first six months; row counts and aggregation levels differ. Keep all supplied rows for these totals.','Gross_Wages already includes overtime in 2016.',['materials/payroll2015.xlsx','materials/payroll2016.xlsx'],['Consistent gross-pay definition','Same six-month period','2016 minus 2015','Explain different row granularity'])
manual('i2','Manglende medarbejdernummer','IntegrateCo','How many 2016 rows have a missing Employee_Number, and what total Gross_Wages do those rows contain? What can you conclude?',f'{len(phantom)} rows, with total gross wages {sum(r[6] or 0 for r in phantom):,.2f}. These are data-quality exceptions requiring follow-up. The extract alone does not establish fraud or prove that an employee does not exist. Employee_ID is a separate field and is not the requested Employee_Number.','Test Employee_Number, not Employee_ID or Employee_Name.',['materials/payroll2016.xlsx'],['Use the correct field','Count missing rows','Sum their gross wages','Separate an exception from proof of fraud'])

# Refit models from daily aggregated restaurant data. No invented coefficients.
w=wb('data.xlsm');sales=list(w['salesData'].values);h=sales[0];daily=defaultdict(lambda:[0.,0.])
for r in sales[1:]:
 if r[0] is not None:daily[r[0]][0]+=float(r[h.index('netTotal')] or 0);daily[r[0]][1]+=float(r[h.index('netTotal_364')] or 0)
weather={r[0]:r[3] for r in list(w['weatherData'].values)[1:] if r[0] is not None};games={r[0]:r[4] for r in list(w['gameData'].values)[1:] if r[0] is not None};w.close()
dates=sorted(d for d in daily if d in weather and weather[d] is not None);y=np.array([daily[d][0] for d in dates]);models={}
for key,names,X in [('temperature',['Intercept','tmax (Fahrenheit)'],[[1,weather[d]] for d in dates]),('interaction',['Intercept','L: sales 364 days earlier','G: game day (0/1)','L × G'],[[1,daily[d][1],games.get(d,0),daily[d][1]*games.get(d,0)] for d in dates])]:
 X=np.array(X,dtype=float);b=np.linalg.lstsq(X,y,rcond=None)[0];assert np.linalg.matrix_rank(X)==X.shape[1];res=y-X@b;df=len(y)-X.shape[1];se=np.sqrt(np.diag(np.linalg.inv(X.T@X))*float(res@res)/df);p=2*stats.t.sf(np.abs(b/se),df);r2=1-float(res@res)/float((y-y.mean())@(y-y.mean()))
 models[key]={'n':len(y),'r2':r2,'coefficients':[{'term':n,'estimate':float(bb),'standardError':float(ss),'pValue':float(pp)} for n,bb,ss,pp in zip(names,b,se,p)],'b':b.tolist()}
t=models['temperature']['b'];b=models['interaction']['b'];reg=[]
def regq(id,title,prompt,model,answer,hint,checks,expected=None):reg.append({'id':id,'kind':'Regression','category':'Restaurant','title':title,'prompt':prompt,'model':model,'answer':answer,'hint':hint,'files':['materials/restaurant.xlsm'],'checks':checks,'expected':expected})
regq('r1','Forudsig salg','Using the temperature model, predict daily sales when tmax is 70°F. Give dollars to two decimals.','temperature',f'{t[0]+70*t[1]:.2f}. Prediction = intercept + temperature coefficient × 70. Include the intercept. This is a fitted conditional mean, not a guaranteed outcome.','Do not omit the intercept.',['Include intercept','Use 70°F, not 70°C','Describe a model prediction'],float(t[0]+70*t[1]))
regq('r2','Fortolk temperatur','Interpret the temperature coefficient. What change does the model predict for a 10°F increase? Does this demonstrate causality?','temperature',f'The model associates a 1°F increase with {t[1]:.6f} additional dollars of predicted daily sales. A 10°F increase corresponds to {10*t[1]:.2f}. Observational association alone does not establish causality; season, holidays and other omitted factors may matter.','Multiply the slope by 10.',['State units','Distinguish association from causality','Hold model specification fixed'],float(10*t[1]))
regq('r3','Vurder statistisk evidens','Using the reported p-value, assess the temperature slope at the 5% level. What does R² tell you, and what does it not tell you?','temperature',f'The temperature p-value is {models["temperature"]["coefficients"][1]["pValue"]:.6g}; compare it with 0.05. The slope is '+('statistically significant' if models['temperature']['coefficients'][1]['pValue']<.05 else 'not statistically significant')+f' under the OLS assumptions. R²={models["temperature"]["r2"]:.4f} describes in-sample explained variation, not causal proof, a guarantee of forecast accuracy, or the probability the model is true.','Statistical significance and practical forecasting usefulness are different.',['Compare actual p-value to .05','Interpret R² as in-sample variation','Do not claim causality or certain forecasts'])
regq('r4','Kampdag med interaktion','In the interaction model, let L=5000. Find predicted sales without a game and with a game, then the difference. For the numeric check, enter only the difference in dollars.','interaction',f'No game: {b[0]+b[1]*5000:.2f}. Game: {b[0]+b[1]*5000+b[2]+b[3]*5000:.2f}. Difference = b_G + b_LG × 5000 = {b[2]+b[3]*5000:.2f}. It is not just the game coefficient.','Switching G from 0 to 1 changes the G term and L×G term.',['Include interaction','Hold L constant','Interpret model comparison, not a proven causal effect'],float(b[2]+b[3]*5000))
regq('r5','Hældningen på en kampdag','What is the slope on L for game days? Explain how it differs from the slope on non-game days. Enter the game-day slope for the numeric check.','interaction',f'Non-game slope: {b[1]:.9f}. Game-day slope: b_L + b_LG = {b[1]+b[3]:.9f}. The interaction changes how current predicted sales relate to sales 364 days earlier. L is a sales amount, not elapsed days.','Collect the terms multiplying L when G=1.',['Add main and interaction slopes','Explain G=0 reference group','Interpret L correctly'],float(b[1]+b[3]))
regq('r6','Forudsig syv dage frem','Bob wants a sales forecast seven days after the last observed date. Explain what additional predictor information and validation you need before using these models for that forecast.','interaction','Identify the future target date. For the interaction model, obtain sales 364 days before that target date and the scheduled game-day status. For the temperature model, obtain a forecast of tmax, not the realised future weather. Evaluate predictions on a chronological holdout and communicate forecast uncertainty. In-sample fit alone is insufficient. The case workbook does not justify inventing missing future inputs.','Which values must be known at the time the forecast is made?',['Specify target-date inputs','Avoid future-data leakage','Use chronological validation','Communicate uncertainty'])
sources += [{'title':v['name'],'file':v['file'],'origin':('SQL part 1 / CS50 Movies' if k=='movies' else 'SQL part 2 / Pcards'),'note':v['source']} for k,v in extra_datasets.items()]
sources += [{'title':'Songs full database','file':'assets/songs.db','origin':'SQL part 1 / CS50 Songs','note':'Complete original database.'},{'title':'Chinook full database','file':'assets/chinook.sqlite','origin':'SQL part 1 / PwC','note':'Complete original database.'}]
write('practice.json',{'questions':questions+reg,'models':models,'materials':sources,'verification':{'film_records':len(fr),'shooting_records':len(shoot),'brooklyn_shoots':len(brook),'duration_hours':duration,'gross2015':pay15,'gross2016':pay16,'phantom_rows':len(phantom),'phantom_pay':sum(r[6] or 0 for r in phantom),'sql':verified_sql},'modelMethod':'Daily sum(netTotal) and sum(netTotal_364); date join to weather; absent dates in the supplied complete football schedule coded G=0; 312 observed sales dates; OLS with intercept; conventional homoskedastic standard errors. Not a validated forecasting model.'})
print(json.dumps({'manual_questions':len(questions),'regression_questions':len(reg),'extra_sql':len(verified_sql),'verification':{'film':len(fr),'brooklyn':len(brook),'duration':duration,'gross15':pay15,'gross16':pay16,'phantom':len(phantom)}},indent=2))
