"""Rebuild course-derived assets and checked answers from the supplied extracted ZIP.
Usage: python build_course_content.py /path/to/extracted/ExamStudio
Needs openpyxl, numpy and scipy for this authoring step only; website needs no Python.
"""
from pathlib import Path
import sys,json,sqlite3,shutil,hashlib
from collections import defaultdict,Counter
from datetime import timedelta
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
 'movies':{'name':'Movies · 2,000-film subset','file':'assets/movies-practice.db','meta':'2,000 films · course subset','source':'CS50 Movies · 2,000 films with the most votes','schema':{'movies':'id INTEGER · title TEXT · year NUMERIC','ratings':'movie_id INTEGER · rating REAL · votes INTEGER','stars':'movie_id INTEGER · person_id INTEGER','directors':'movie_id INTEGER · person_id INTEGER','people':'id INTEGER · name TEXT · birth NUMERIC'}},
 'pcards':{'name':'P-cards · OSU subset','file':'assets/pcards-practice.db','meta':'2,000 transactions · course subset','source':'P-card case · first 2,000 OSU rows for 2014 by ID','schema':{'pcards':'Year INTEGER · Month INTEGER · FullName TEXT · ID INTEGER · AgencyNumber INTEGER · AgencyName TEXT · CardholderLastName TEXT · CardholderFirstInitial TEXT · Description TEXT · Amount REAL · Vendor TEXT · TransactionDate TEXT · PostedDate TEXT · MCC TEXT'}}}
def sqlq(id,title,desc,answer,hint,skill):return {'id':id,'title':title,'desc':desc,'answer':answer,'starter':answer.split('WHERE')[0].split('GROUP BY')[0].rstrip().rstrip(';')+'\n-- Complete the query','hint':hint,'skill':skill,'explain':'The checker uses the downloadable course subset. Results can differ on the full course database.','ordered':False}
extra_exercises={
 'movies':[
 sqlq('m1','Find films from 2007','Show the titles of films released in 2007 in this subset. Return only title. Row order is optional.','SELECT title FROM movies WHERE year=2007;','Filter movies.year with WHERE.','WHERE'),
 sqlq('m2','Calculate the average film rating','Find the average rating of films from 2013 in this subset. Return one number.','SELECT AVG(r.rating) FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE m.year=2013;','Match movie_id to movies.id before filtering by year.','JOIN · AVG'),
 sqlq('m3','Who is in Harry Potter?','Show the names of actors in Harry Potter and the Sorcerer\'s Stone in this subset. Include each person ID once. Row order is optional.',"SELECT p.name FROM people p WHERE p.id IN (SELECT s.person_id FROM stars s JOIN movies m ON m.id=s.movie_id WHERE m.title='Harry Potter and the Sorcerer''s Stone');",'Connect movies, stars and people. An IN subquery avoids repeating person IDs.','RELATIONSHIPS')],
 'pcards':[
 sqlq('a1','Count purchases above the threshold','How many transactions in this OSU subset have Amount strictly greater than 5,000? Treat these as flags for follow-up. Return one number.','SELECT COUNT(*) FROM pcards WHERE Amount>5000;','Use > 5000 for the strict threshold. Exceptions may need supporting documentation.','COUNT · AUDIT CHECK'),
 sqlq('a2','Calculate net amounts by vendor','Return Vendor and the sum of Amount per vendor in this subset. Include credits. Row order is optional.','SELECT Vendor,SUM(Amount) AS NetAmount FROM pcards GROUP BY Vendor;','Group by Vendor and include negative amounts in the net total.','GROUP BY · SUM'),
 sqlq('a3','Find the largest purchases','Return ID, Vendor and Amount for the five largest positive transactions in this subset. Sort by Amount descending and ID ascending for ties.','SELECT ID,Vendor,Amount FROM pcards WHERE Amount>0 ORDER BY Amount DESC,ID ASC LIMIT 5;','Filter for positive amounts, sort, then limit to five.','ORDER BY · LIMIT')]
};extra_exercises['pcards'][2]['ordered']=True

extra_exercises['movies'] += [
 sqlq('m4','Find top-rated films with substantial vote counts','Return title and rating for the five highest-rated films with at least 50,000 votes. Sort by rating descending, then movie ID ascending.','SELECT m.title,r.rating FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE r.votes>=50000 ORDER BY r.rating DESC,m.id LIMIT 5;','Filter on votes before ranking by rating.','JOIN · ORDER BY'),
 sqlq('m5','Count films released in each year','Return year and film count for releases from 2000 through 2009 inclusive. Sort by year ascending.','SELECT year,COUNT(*) FROM movies WHERE year BETWEEN 2000 AND 2009 GROUP BY year ORDER BY year;','Apply the year range before grouping.','BETWEEN · GROUP BY'),
 sqlq('m6','Find the directors of Inception','Return the names of directors credited on Inception (2010). Row order is optional.',"SELECT p.name FROM movies m JOIN directors d ON d.movie_id=m.id JOIN people p ON p.id=d.person_id WHERE m.title='Inception' AND m.year=2010;",'Follow movies.id to directors.movie_id and people.id to directors.person_id.','THREE-TABLE JOIN')
]
extra_exercises['pcards'] += [
 sqlq('a4','Separate credits from purchases','Return the number of transactions whose Amount is negative as one number.','SELECT COUNT(*) FROM pcards WHERE Amount<0;','Use Amount < 0 to identify credits.','WHERE · COUNT'),
 sqlq('a5','Compare net spend by month','Return Month and net Amount for each observed month in the subset. Include credits and sort by Month ascending.','SELECT Month,SUM(Amount) FROM pcards GROUP BY Month ORDER BY Month;','Group by Month and sum signed amounts.','GROUP BY · SUM'),
 sqlq('a6','Find potential duplicate charge groups','Return Vendor, TransactionDate, Amount and the count for groups with more than one positive charge sharing those three fields. Row order is optional.','SELECT Vendor,TransactionDate,Amount,COUNT(*) FROM pcards WHERE Amount>0 GROUP BY Vendor,TransactionDate,Amount HAVING COUNT(*)>1;','Group the three fields, then apply HAVING to the group count. Identical fields are a flag for review.','GROUP BY · HAVING')
]
for name,indexes in [('movies',[3,4]),('pcards',[4])]:
 for index in indexes:extra_exercises[name][index]['ordered']=True
extra_exercises['movies'] += [
 sqlq('m7', 'Look up Johnny Depp’s birth year', 'Return Johnny Depp’s birth year in one row and one column.', "SELECT birth FROM people WHERE name='Johnny Depp';", 'The people table contains name and birth.', 'WHERE'),
 sqlq('m8', 'List films released from 2017 onwards', 'Return titles for films released in 2017 or later. Sort by title ascending.', 'SELECT title FROM movies WHERE year>=2017 ORDER BY title;', 'Use an inclusive year filter and sort by title.', 'WHERE · ORDER BY'),
 sqlq('m9', 'Count ratings above 9.0', 'Return the number of films with a rating strictly above 9.0 in this subset.', 'SELECT COUNT(*) FROM ratings WHERE rating>9.0;', 'Use > 9.0 rather than an inclusive comparison.', 'COUNT · WHERE'),
 sqlq('m10', 'Put the Toy Story films in release order', 'Return title and year for every title beginning with Toy Story. Sort by year ascending, then title ascending.', "SELECT title,year FROM movies WHERE title LIKE 'Toy Story%' ORDER BY year,title;", 'Use a prefix match and sort by year first.', 'LIKE · ORDER BY'),
 sqlq('m11', 'Rank the rated films released in 2011', 'Return title and rating for rated 2011 releases. Sort by rating descending, then title ascending.', 'SELECT m.title,r.rating FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE m.year=2011 ORDER BY r.rating DESC,m.title;', 'Join ratings to films, filter the release year, then sort.', 'JOIN · ORDER BY'),
 sqlq('m12', 'Find performers in films from 2003', 'Return the names of people credited as stars in at least one 2003 film. Include each person ID once. Sort by birth year ascending (missing years first), then name and person ID ascending.', 'SELECT p.name FROM people p WHERE p.id IN (SELECT s.person_id FROM stars s JOIN movies m ON m.id=s.movie_id WHERE m.year=2003) ORDER BY p.birth,p.name,p.id;', 'Find eligible person IDs first, then sort the matching people.', 'SUBQUERY · ORDER BY'),
 sqlq('m13', 'Find directors of films rated 8.0 or higher', 'Return the names of people who directed at least one film rated 8.0 or higher. Include each person ID once. Row order is optional.', 'SELECT p.name FROM people p WHERE p.id IN (SELECT d.person_id FROM directors d JOIN ratings r ON r.movie_id=d.movie_id WHERE r.rating>=8.0);', 'Filter by rating before selecting distinct directors.', 'SUBQUERY · JOIN'),
 sqlq('m14', 'Rank Helena Bonham Carter’s films', 'Return the titles of the five highest-rated films in which Helena Bonham Carter is credited as a star. Sort by rating descending, then title ascending and film ID ascending.', "SELECT m.title FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE m.id IN (SELECT s.movie_id FROM stars s JOIN people p ON p.id=s.person_id WHERE p.name='Helena Bonham Carter') ORDER BY r.rating DESC,m.title,m.id LIMIT 5;", 'First find the relevant film IDs, then rank them by rating.', 'JOIN · LIMIT'),
 sqlq('m15', 'Find films starring both Depp and Bonham Carter', 'Return film titles where Johnny Depp and Helena Bonham Carter are both credited as stars. Row order is optional.', "SELECT m.title FROM movies m WHERE m.id IN (SELECT s.movie_id FROM stars s JOIN people p ON p.id=s.person_id WHERE p.name='Johnny Depp') AND m.id IN (SELECT s.movie_id FROM stars s JOIN people p ON p.id=s.person_id WHERE p.name='Helena Bonham Carter');", 'Find the intersection of the two sets of movie IDs.', 'SUBQUERY · AND'),
 sqlq('m16', 'Find Kevin Bacon’s co-stars', 'Return the names of all stars who share a film with Kevin Bacon born in 1958. Include each person ID once and exclude Bacon. Row order is optional.', "WITH bacon AS (SELECT id FROM people WHERE name='Kevin Bacon' AND birth=1958) SELECT p.name FROM people p WHERE p.id IN (SELECT person_id FROM stars WHERE movie_id IN (SELECT movie_id FROM stars WHERE person_id IN (SELECT id FROM bacon))) AND p.id NOT IN (SELECT id FROM bacon);", 'Use the birth year to identify the correct person ID before finding shared films.', 'CTE · SUBQUERY'),
]
for question in extra_exercises['movies']:
 if question['id'] in ['m8', 'm10', 'm11', 'm12', 'm14']:question['ordered']=True
for question in extra_exercises['movies']:
 if question['id'] in ['m12','m13','m14','m15','m16']:question['starter']='-- Write your query using the course tables.\nSELECT '
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
manual('f1','Import data with the correct types','NYC Film Permits','Import the film-permit workbook. How many data records and columns are there? Explain why date/time fields must be recognised as dates, not text.',f'{len(fr):,} records and {len(h)} columns, excluding the header. StartDateTime, EndDateTime and EnteredOn must retain date/time meaning; numeric date arithmetic on text is unreliable. In a text import, explicitly select the correct delimiter and date/number locale.','Do not count the header. Check StartDateTime after import.',['materials/film.xlsx'],['Exclude the header','Identify 33,502 records and 14 fields','Explain date and locale handling'])
manual('f2','Filter and count permits','NYC Film Permits','How many Shooting Permit records are in Brooklyn? Show an Excel method, not just a number.',f'{len(brook):,}. One method is COUNTIFS with EventType="Shooting Permit" and Borough="Brooklyn". A filtered pivot table counting EventID also works. Count permits, not unique dates.','Apply both criteria at the same time.',['materials/film.xlsx'],['Filter both EventType and Borough','Count records, not dates','Keep the formula or pivot table visible'])
manual('f3','Calculate permit duration in hours','NYC Film Permits','Find the mean permit duration in hours for Shooting Permit records. Give the unrounded mean to two decimals and explain the Excel conversion.',f'{duration:.2f} hours. In a helper column use =(EndDateTime-StartDateTime)*24; Excel date differences are days. Filter EventType="Shooting Permit", then average the helper. Do not average only Brooklyn for this question.','Excel date differences are measured in days.',['materials/film.xlsx'],['Use end minus start','Multiply days by 24','Filter Shooting Permit','Average all matching records'])
film_file=['materials/film.xlsx']
missing_zip=sum(r['ZipCode'] is None or str(r['ZipCode']).strip().upper() in {'','N/A'} for r in fr)
first_entry=min(r['EnteredOn'] for r in fr if r['EnteredOn'] is not None)
last_entry=max(r['EnteredOn'] for r in fr if r['EnteredOn'] is not None)
top_category,top_count=Counter(r['Category'] for r in shoot if r['Category']).most_common(1)[0]
manual('f4','Count missing ZIP codes','NYC Film Permits','How many permit records have a missing ZIP code? Inspect the column and explain how the source represents missing values.',f'The source contains {missing_zip} missing ZIP codes recorded as the text N/A. Filter ZipCode to N/A or use COUNTIF on that marker. COUNTBLANK would skip those text values.','Look for a text placeholder as well as empty cells.',film_file,['Use the full permit table','Identify the missing-value marker','Distinguish missing from invalid'])
manual('f5','Find the earliest and latest entry times','NYC Film Permits','Give the oldest and newest EnteredOn timestamps. Include the date and time.',f'Earliest {first_entry:%Y-%m-%d %H:%M}. Latest {last_entry:%Y-%m-%d %H:%M}. MIN and MAX work on the imported date/time field.','Use EnteredOn and format the results to include time.',film_file,['Use EnteredOn','Report both date and time'])
manual('f6','Find the most common shooting-permit category','NYC Film Permits','Among Shooting Permit records, find the category with the most records and give its count.',f'{top_category}, with {top_count:,} records. Filter EventType to Shooting Permit, then count EventID by Category and sort descending.','Apply the event-type filter before grouping.',film_file,['Filter EventType','Group by Category','Report the top count'])
case2=wb('Analytics_mindset_case_studies_ETL_Case2_Excel.xlsx')
case2_rows=case2['Case 2'].values
next(case2_rows)
example_code=next(case2_rows)[0]
case2.close()
location,plant=example_code[:3],example_code.split('-')[1][:-1]
manual('t2','Build a location and plant key','ETL Case 2','Using the Case 2 source sheet, derive a location and plant key such as USA-12. Explain why PlantID by itself can repeat across locations.',f'For {example_code}, the key is {location}-{plant}. Use LEFT(A2,3) for the location and MID(A2,FIND("-",A2)+1,2) for the two-digit plant. Join them with a hyphen and fill down. A plant number can recur in different countries.','Combine the country code and the plant number, leaving out the pay-period letter.',['materials/etl-case2.xlsx'],['Use the Case 2 source sheet','Keep both parts of the key','Explain why location matters'])
manual('t1','Resolve data quality issues','ETL Case 1','Identify four data-quality problems in the balance-sheet CSV and explain what you would do before analysis.','Examples: inconsistent missing inventories (blank, spaces, hyphens); inconsistent ticker spacing; duplicated APVO 2018 record; K/M suffixes; parentheses for negative depreciation; an unquoted comma inside Apple, Inc. disrupts CSV columns. Standardise missing values without replacing unknowns with zero, normalise identifiers, investigate duplicates, and parse units/signs. Do not guess the units of Total Current Assets from its magnitude: obtain metadata.','Look at identifiers, missing markers, units, duplicate records and CSV delimiters.',['materials/etl-case1.csv'],['Give four real source examples','Separate missing from zero','Do not invent Total Current Assets units','Document transformations'])
w=wb('Analytics_mindset_case_studies_ETL_Case4_Excel.xlsx');j=list(w['JELineItems'].values);jh=j[0];jr=j[1:];pre=list(w['PreparerInfo'].values);print('preparer schema:',pre[:3]);w.close()
manual('j1','Join journal data','ETL Case 4','Explain how to add BusinessUnit and account information to every journal line without dropping journal lines. Which identifiers should be used?','Use BusinessUnitID to match BusinessUnits and GLAccountNumber to match ChartOfAccounts. Use a lookup or left join from JELineItems. Preserve each journal line, flag unmatched IDs, and check that reference keys are unique so joins cannot multiply rows. A JENumber can occur on multiple journal lines; it is not a unique line identifier by itself.','Start with the journal lines as the table you must preserve.',['materials/journal.xlsx'],['Name the correct matching keys','Preserve journal-line count','Check duplicate and unmatched reference keys','Do not assume JENumber is unique per line'])
manual('j2','Preserve an audit trail','ETL Case 4','Why should the repeatable journal-data solution retain formulas rather than replace all outputs with pasted values?','Formulas retain the mapping logic and dependencies, making the transformation easier to review and repeat on a consistently structured replacement dataset. Keep source worksheets intact, populate the requested solution columns, and test both successful matches and unmatched IDs. A pasted number alone does not show how it was derived.','Think about review, re-performance and future refreshes.',['materials/journal.xlsx'],['Explain traceability','Explain repeatability','Keep source data intact'])
w=wb('Analytics_mindset_case_studies_IntegrateCo_2015payroll.xlsx');rows15=list(w.active.values)[1:];w.close();w=wb('Analytics_mindset_case_studies_IntegrateCo_2016payroll.xlsx');rows16=list(w.active.values)[1:];w.close()
pay15=sum((r[10] or 0)+(r[11] or 0) for r in rows15);pay16=sum(r[6] or 0 for r in rows16);phantom=[r for r in rows16 if r[2] is None or str(r[2]).strip()=='']
manual('i1','Compare two payroll systems','IntegrateCo','Compare total gross wages in the supplied 2015 and 2016 extracts. Define the measure consistently, and compute 2016 minus 2015.',f'2015 gross wages: {pay15:,.2f}; 2016: {pay16:,.2f}; increase: {pay16-pay15:,.2f}. 2015 uses Reg_Pay + OT_Pay; 2016 uses Gross_Wages. Do not add overtime twice in 2016. Both extracts cover the first six months; row counts and aggregation levels differ. Keep all supplied rows for these totals.','Gross_Wages already includes overtime in 2016.',['materials/payroll2015.xlsx','materials/payroll2016.xlsx'],['Consistent gross-pay definition','Same six-month period','2016 minus 2015','Explain different row granularity'])
manual('i2','Investigate missing employee numbers','IntegrateCo','How many 2016 rows have a missing Employee_Number, and what total Gross_Wages do those rows contain? What can you conclude?',f'{len(phantom)} rows, with total gross wages {sum(r[6] or 0 for r in phantom):,.2f}. These are data-quality exceptions requiring follow-up. The extract alone does not establish fraud or prove that an employee does not exist. Employee_ID is a separate field and is not the requested Employee_Number.','Test Employee_Number, not Employee_ID or Employee_Name.',['materials/payroll2016.xlsx'],['Use the correct field','Count missing rows','Sum their gross wages','Separate an exception from proof of fraud'])

hours15=sum((r[8] or 0)+(r[9] or 0) for r in rows15)
hours16=sum((r[4] or 0)+(r[5] or 0) for r in rows16)
jan_pay=sum((r[10] or 0)+(r[11] or 0) for r in rows15 if r[0] and r[0].month==1)
both_payrolls=['materials/payroll2015.xlsx','materials/payroll2016.xlsx']
manual('i3','Compare average gross pay per hour','IntegrateCo','Calculate company-wide gross pay per hour for each extract, including overtime. Explain why an average of individual row rates can differ.',f'2015: USD {pay15/hours15:,.2f} using {hours15:,.2f} hours. 2016: USD {pay16/hours16:,.2f} using {hours16:,.2f} hours. Divide total pay by total hours, which weights the result by hours.','Sum regular and overtime hours for each year and use the corresponding gross-wage total.',both_payrolls,['Include overtime hours','Use company-wide totals','Explain weighting'])
manual('i4','Estimate January 2016 payroll from the 2015 pattern','IntegrateCo','Use January’s share of the first six months of 2015 gross wages to estimate January 2016 gross wages from the 2016 six-month total.',f'January 2015 gross pay is USD {jan_pay:,.2f}, or {jan_pay/pay15:.2%} of the six-month total. Applying the share at full precision gives estimated January 2016 gross pay of USD {pay16*jan_pay/pay15:,.2f}. This assumes the monthly pattern carries over.','Divide January 2015 gross pay by the 2015 six-month gross pay first.',both_payrolls,['Filter 2015 pay dates to January','Use the six-month 2015 denominator','Apply the share to 2016 gross pay'])
# Refit models from daily aggregated restaurant data. No invented coefficients.
w=wb('data.xlsm')
sales=list(w['salesData'].values)
sales_indexes=[sales[0].index(name) for name in ['netTotal','netTotal_364','netTotal_28','netTotal_7']]
daily=defaultdict(lambda:[0.,0.,0.,0.])
for row in sales[1:]:
 if row[0] is not None:
  for i,column in enumerate(sales_indexes):daily[row[0]][i]+=float(row[column] or 0)
weather={r[0]:r[3] for r in list(w['weatherData'].values)[1:] if r[0] is not None}
game_rows=[r for r in list(w['gameData'].values)[1:] if r[0] is not None]
games={r[0]:r[4] for r in game_rows}
home_games={r[0]:r[1] for r in game_rows}
w.close()
dates=sorted(d for d in daily if d in weather and weather[d] is not None)
y=np.array([daily[d][0] for d in dates])
models={}
specs=[
 ('temperature',['Intercept','tmax (Fahrenheit)'],[[1,weather[d]] for d in dates]),
 ('interaction',['Intercept','L: sales 364 days earlier','G: game day (0/1)','L × G'],[[1,daily[d][1],games.get(d,0),daily[d][1]*games.get(d,0)] for d in dates]),
 ('lagged',['Intercept','Sales 7 days earlier','Sales 28 days earlier','Sales 364 days earlier'],[[1,daily[d][3],daily[d][2],daily[d][1]] for d in dates]),
 ('quadratic',['Intercept','tmax (Fahrenheit)','tmax squared'],[[1,weather[d],weather[d]**2] for d in dates]),
 ('game',['Intercept','G: game day (0/1)'],[[1,games.get(d,0)] for d in dates]),
 ('home',['Intercept','L: sales 364 days earlier','H: home game (0/1)','L × H'],[[1,daily[d][1],home_games.get(d,0),daily[d][1]*home_games.get(d,0)] for d in dates])]
for key,names,X in specs:
 X=np.array(X,dtype=float);b=np.linalg.lstsq(X,y,rcond=None)[0];assert np.linalg.matrix_rank(X)==X.shape[1];res=y-X@b;df=len(y)-X.shape[1];se=np.sqrt(np.diag(np.linalg.inv(X.T@X))*float(res@res)/df);p=2*stats.t.sf(np.abs(b/se),df);r2=1-float(res@res)/float((y-y.mean())@(y-y.mean()))
 models[key]={'n':len(y),'r2':r2,'coefficients':[{'term':n,'estimate':float(bb),'standardError':float(ss),'pValue':float(pp)} for n,bb,ss,pp in zip(names,b,se,p)],'b':b.tolist()}
t=models['temperature']['b'];b=models['interaction']['b'];reg=[]
def regq(id,title,prompt,model,answer,hint,checks,expected=None):reg.append({'id':id,'kind':'Regression','category':'Restaurant','title':title,'prompt':prompt,'model':model,'answer':answer,'hint':hint,'files':['materials/restaurant.xlsm'],'checks':checks,'expected':expected})
regq('r1','Predict sales','Using the temperature model, predict daily sales when tmax is 70°F. Give dollars to two decimals.','temperature',f'{t[0]+70*t[1]:.2f}. Prediction = intercept + temperature coefficient × 70. Include the intercept. This is a fitted conditional mean, not a guaranteed outcome.','Do not omit the intercept.',['Include intercept','Use 70°F, not 70°C','Describe a model prediction'],float(t[0]+70*t[1]))
regq('r2','Interpret the temperature coefficient','Interpret the temperature coefficient. What change does the model predict for a 10°F increase? Does this demonstrate causality?','temperature',f'The model associates a 1°F increase with {t[1]:.6f} additional dollars of predicted daily sales. A 10°F increase corresponds to {10*t[1]:.2f}. Observational association alone does not establish causality; season, holidays and other omitted factors may matter.','Multiply the slope by 10.',['State units','Distinguish association from causality','Hold model specification fixed'],float(10*t[1]))
regq('r3','Assess statistical evidence','Using the reported p-value, assess the temperature slope at the 5% level. What does R² tell you, and what does it not tell you?','temperature',f'The temperature p-value is {models["temperature"]["coefficients"][1]["pValue"]:.6g}; compare it with 0.05. The slope is '+('statistically significant' if models['temperature']['coefficients'][1]['pValue']<.05 else 'not statistically significant')+f' under the OLS assumptions. R²={models["temperature"]["r2"]:.4f} describes in-sample explained variation, not causal proof, a guarantee of forecast accuracy, or the probability the model is true.','Statistical significance and practical forecasting usefulness are different.',['Compare actual p-value to .05','Interpret R² as in-sample variation','Do not claim causality or certain forecasts'])
regq('r4','Compare game-day predictions','In the interaction model, let L=5000. Find predicted sales without a game and with a game, then the difference. For the numeric check, enter only the difference in dollars.','interaction',f'No game: {b[0]+b[1]*5000:.2f}. Game: {b[0]+b[1]*5000+b[2]+b[3]*5000:.2f}. Difference = b_G + b_LG × 5000 = {b[2]+b[3]*5000:.2f}. It is not just the game coefficient.','Switching G from 0 to 1 changes the G term and L×G term.',['Include interaction','Hold L constant','Interpret model comparison, not a proven causal effect'],float(b[2]+b[3]*5000))
regq('r5','Calculate the game-day slope','What is the slope on L for game days? Explain how it differs from the slope on non-game days. Enter the game-day slope for the numeric check.','interaction',f'Non-game slope: {b[1]:.9f}. Game-day slope: b_L + b_LG = {b[1]+b[3]:.9f}. The interaction changes how current predicted sales relate to sales 364 days earlier. L is a sales amount, not elapsed days.','Collect the terms multiplying L when G=1.',['Add main and interaction slopes','Explain G=0 reference group','Interpret L correctly'],float(b[1]+b[3]))
regq('r6','Forecast seven days ahead','Bob wants a sales forecast seven days after the last observed date. Explain what additional predictor information and validation you need before using these models for that forecast.','interaction','Identify the future target date. For the interaction model, obtain sales 364 days before that target date and the scheduled game-day status. For the temperature model, obtain a forecast of tmax, not the realised future weather. Evaluate predictions on a chronological holdout and communicate forecast uncertainty. In-sample fit alone is insufficient. The case workbook does not justify inventing missing future inputs.','Which values must be known at the time the forecast is made?',['Specify target-date inputs','Avoid future-data leakage','Use chronological validation','Communicate uncertainty'])

regq('r7','Compare predictions at two temperatures','Using the temperature model, calculate the change in predicted daily sales when tmax rises from 60°F to 80°F. Enter the dollar difference to two decimals.','temperature',f'{20*t[1]:.2f}. The intercept cancels, leaving the slope multiplied by 20°F.','Subtract the prediction at 60°F from the prediction at 80°F.',['Use a 20°F difference','Report dollars','Explain why the intercept cancels'],float(20*t[1]))
regq('r8','Read the game-day coefficient','In the interaction model, what comparison does the coefficient on G represent? Explain how to estimate the game-day difference at a realistic value of L.','interaction','The coefficient on G is the predicted difference when L=0. At a specified L, the difference is b_G + b_LG × L. Assess that combined effect at a value of L relevant to the question.','Set G to 0 and 1 while holding L constant.',['Identify the comparison at L=0','Include the interaction','Hold L constant'])
regq('r9','Explain the intercept and extrapolation','In the temperature model, explain the intercept. Is a prediction at tmax=0°F supported by the observed temperature range?','temperature','The intercept is predicted daily sales at 0°F. The observed daily highs range from 28.94°F to 104°F, so 0°F requires extrapolation. The algebra still produces a number, but the sample provides limited evidence for that prediction.','Compare 0°F with the range shown under the model.',['Define the intercept','Use the observed range','Identify extrapolation'])
regq('r10','Measure a change in prior sales on game days','For a game day, calculate how much predicted sales change when L increases by $1,000. Report the change in dollars to two decimals.','interaction',f'{1000*(b[1]+b[3]):.2f}. Multiply the game-day slope b_L + b_LG by 1,000.','Combine the terms that multiply L when G=1.',['Use the game-day slope','Multiply by 1,000','Keep G fixed'],float(1000*(b[1]+b[3])))
regq('r11','Predict a non-game day','Use the interaction model to predict sales on a non-game day with L equal to $4,000. Give your answer in dollars to two decimals.','interaction',f'{b[0]+4000*b[1]:.2f}. Set G=0, which removes both G terms. Add the intercept to b_L × 4,000.','Both the game-day term and the interaction vanish when G=0.',['Set G to zero','Include the intercept','Use the correct L value'],float(b[0]+4000*b[1]))
regq('r12','Design a fair forecast comparison','How would you use the restaurant sales dates to compare the temperature and interaction models on forecast accuracy? Give one error measure and explain the split.','temperature','Use an earlier training window and a later common test window, or rolling-origin evaluation. Fit both models on the same training dates, predict the same later dates using inputs available when each forecast was made, and compare mean absolute error in dollars.','Think about which dates would have been in the past when a prediction was made.',['Use chronological validation','Compare predictions on the same dates','Choose and explain an error measure','Use only information available at forecast time'])
target=max(daily)+timedelta(days=7)
lag_dates=[target-timedelta(days=lag) for lag in (7,28,364)]
lag_sales=[daily[day][0] for day in lag_dates]
lag_forecast=float(np.dot(models['lagged']['b'],[1,*lag_sales]))
quadratic=models['quadratic']
game_effect=models['game']['b'][1]
home_model=models['home']['b']
home_slope=home_model[1]+home_model[3]
regq('r13','Forecast seven days ahead using prior sales',f'Use the prior-sales regression to forecast sales on {target:%Y-%m-%d}. The 7-day, 28-day and 364-day inputs in dollars are {lag_sales[0]:,.2f}, {lag_sales[1]:,.2f} and {lag_sales[2]:,.2f}, respectively. Give your result to two decimals.','lagged',f'USD {lag_forecast:,.2f}. Use the intercept and multiply each prior sales amount by its matching coefficient. The input dates are '+', '.join(d.strftime('%Y-%m-%d') for d in lag_dates)+'.','Match the 7-, 28- and 364-day coefficients to their own inputs.',['Include the intercept','Match each lag to its own sales amount','Round the final forecast'],lag_forecast)
regq('r14','Interpret a squared temperature term','Use the model with tmax and tmax squared. Is the fitted curve concave or convex? Can its temperature effect be represented by one constant slope?','quadratic',f'The squared term is {quadratic["b"][2]:.6f}, so the fitted curve is concave. The local slope changes with temperature and equals b₁ + 2 × b₂ × tmax. Interpret this association within the observed range.','Look at the sign on tmax squared.',['Use the sign of the squared term','Explain that the slope depends on temperature','Treat the relationship as an association'])
regq('r15','Compare sales on game and non-game days','Use the game-day model to find the predicted dollar difference between a game day and a non-game day. Give the difference to two decimals and explain what it measures.','game',f'USD {game_effect:,.2f}. Changing G from 0 to 1 adds the G coefficient. This is an unadjusted difference between the groups. Other differences, including day of week, may explain part of it.','Set G to 1 and 0, then subtract.',['Report the G coefficient in dollars','Interpret the difference in predictions','Avoid a causal claim'],game_effect)
regq('r16','Compare the prior-sales slope on home-game days','In the home-game model, calculate the slope on L for home games. Give the slope to four decimal places and explain how it differs from the slope on days without a home game.','home',f'On days without a home game the slope is {home_model[1]:.6f}. On home-game days it is {home_slope:.6f}, found by adding the interaction coefficient {home_model[3]:.6f}. The comparison describes the fitted association.','Collect the coefficients multiplying L when H=1.',['Add the main and interaction slopes','Distinguish home games from all games','Interpret the fitted relationship'],home_slope)
sources += [{'title':v['name'],'file':v['file'],'origin':('SQL part 1 / CS50 Movies' if k=='movies' else 'SQL part 2 / Pcards'),'note':v['source']} for k,v in extra_datasets.items()]
sources += [{'title':'Songs full database','file':'assets/songs.db','origin':'SQL part 1 / CS50 Songs','note':'Complete original database.'},{'title':'Chinook full database','file':'assets/chinook.sqlite','origin':'SQL part 1 / PwC','note':'Complete original database.'}]
write('practice.json',{'questions':questions+reg,'models':models,'materials':sources,'verification':{'film_records':len(fr),'shooting_records':len(shoot),'brooklyn_shoots':len(brook),'duration_hours':duration,'gross2015':pay15,'gross2016':pay16,'phantom_rows':len(phantom),'phantom_pay':sum(r[6] or 0 for r in phantom),'sql':verified_sql},'modelMethod':'Aggregate sales and lagged sales fields by date, join to weather, and code dates absent from the football schedule as non-game days. The six models use the same 312 observed sales dates, OLS with intercept, and conventional homoskedastic standard errors. Forecast accuracy has not been measured on held-out dates.'})
print(json.dumps({'manual_questions':len(questions),'regression_questions':len(reg),'extra_sql':len(verified_sql),'verification':{'film':len(fr),'brooklyn':len(brook),'duration':duration,'gross15':pay15,'gross16':pay16,'phantom':len(phantom)}},indent=2))
