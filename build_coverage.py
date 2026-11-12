"""Fill skill gaps found in the public teacher catalogue, using the supplied data.

No teacher prompts, answers or synthetic coefficients are copied. Workbook
tables are cross-checked with SQLite; SQL outputs with pandas; OLS with scipy.
Run after build_library.py, before build_catalog.cjs.
"""
from pathlib import Path
from collections import defaultdict
import json, math, re, sqlite3, random, hashlib, zipfile
import pandas as pd
import numpy as np
from scipy import stats

ROOT=Path(__file__).resolve().parent; D=ROOT/'dist'; A=D/'assets'
questions=[]; exercises=defaultdict(list); models={}; refs={}; groups=defaultdict(list)
def clean(value):
    if isinstance(value,(pd.Timestamp,)):return value.strftime('%Y-%m-%d %H:%M:%S')
    if value is None or pd.isna(value):return None
    return value.item() if hasattr(value,'item') else value
def rows(frame):return [[clean(v) for v in row] for row in frame.itertuples(index=False,name=None)]
def fmt(v):return f'{v:,.6f}'.rstrip('0').rstrip('.') if isinstance(v,float) else str(v) if v is not None else '(missing)'
def table_answer(frame):
    return ' | '.join(map(str,frame.columns))+'\n'+'\n'.join(' | '.join(fmt(v) for v in row) for row in rows(frame))
def add(title,prompt,file,category,skill,result,method,checks=None):
    ident='w'+str(1001+len(questions))
    expected=float(result) if isinstance(result,(int,float,np.number)) else None
    answer=table_answer(result) if isinstance(result,pd.DataFrame) else fmt(clean(result))
    q={'id':ident,'kind':'Excel','title':title,'prompt':prompt,'category':category,'files':['materials/'+file],
       'answer':answer+'\n\n'+method,'hint':method,'checks':checks or ['Use the stated source fields','Reconcile counts and totals','Explain the transformation'],
       'expected':expected,'tolerance':.00500001,'coverage':True,'skill':skill}
    questions.append(q);groups[category].append(ident)
    refs[ident]={'kind':'Excel','skill':skill,'columns':list(result.columns),'rows':rows(result)} if isinstance(result,pd.DataFrame) else {'kind':'Excel','skill':skill,'value':clean(result)}
    return ident
def read(file,sheet=0):return pd.read_excel(D/'materials'/file,sheet_name=sheet)
def checked_group(df,keys,measures=None,count=False,positive=None):
    """Compute grouped tables by two independent implementations, including NULL keys."""
    data=(df if positive is None else df[df[positive]>0]).copy()
    for key in keys:
        if data[key].dtype==object:data[key]=data[key].map(lambda value: str(value) if pd.notna(value) else None)
    if count:
        p=data.groupby(keys,dropna=False).size().reset_index(name='Records');agg='COUNT(*) AS Records'
    else:
        p=data.groupby(keys,dropna=False)[measures].sum().reset_index();agg=','.join(f'COALESCE(SUM("{m}"),0) AS "{m}"' for m in measures)
    c=sqlite3.connect(':memory:');data.to_sql('source',c,index=False)
    fields=','.join('"'+k+'"' for k in keys)
    actual=pd.read_sql_query('SELECT '+fields+','+agg+' FROM source GROUP BY '+fields,c);c.close()
    def key(row):return json.dumps([None if v is None else str(v) for v in row[:len(keys)]])
    left=sorted(rows(p),key=key);right=sorted(rows(actual),key=key)
    assert len(left)==len(right)
    for a,b in zip(left,right):
        for x,y in zip(a,b):
            if isinstance(x,(int,float)) and isinstance(y,(int,float)):assert math.isclose(x,y,rel_tol=1e-8,abs_tol=1e-6),(x,y)
            else:assert x==y,(x,y)
    return p
def rank(frame,measure,keys):return frame.sort_values([measure,*keys],ascending=[False,*([True]*len(keys))],na_position='last').reset_index(drop=True)

# Import tasks use the actual delimited source files, not workbook substitutes.
archive=ROOT.parent/'upload/1. ExamStudio(2).zip'
source_names={'film.txt':'NYC_Film_Permits.txt','payroll2015.csv':'Analytics_mindset_case_studies_IntegrateCo_2015payroll.csv','payroll2016.csv':'Analytics_mindset_case_studies_IntegrateCo_2016payroll.csv'}
materials=[]
with zipfile.ZipFile(archive) as z:
    for dest,name in source_names.items():
        source=next(n for n in z.namelist() if n.endswith('/'+name));raw=z.read(source)
        output=dest
        if dest=='film.txt':
            output='film-import.zip'
            with zipfile.ZipFile(D/'materials'/output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as packed:
                info=zipfile.ZipInfo('film.txt');info.compress_type=zipfile.ZIP_DEFLATED;packed.writestr(info,raw)
        else:(D/'materials'/output).write_bytes(raw)
        materials.append({'title':dest+' · original text import','file':'materials/'+output,'origin':source,'sha256':hashlib.sha256((D/'materials'/output).read_bytes()).hexdigest(),'note':'Original supplied text/CSV bytes preserved. Film text is inside film-import.zip: extract film.txt first. Import practice includes delimiter and locale checks.'})
        add('Import and reconcile '+dest,('Extract film.txt from film-import.zip, then import it' if dest=='film.txt' else 'Import '+dest)+' into Excel with Data → From Text/CSV. Identify the delimiter and choose a locale that preserves source dates and decimal points. Compare the imported row count and numeric totals with the corresponding workbook. Explain why opening a CSV with a double-click can give a different result.',output,'NYC Film Permits' if dest=='film.txt' else 'IntegrateCo','Text import','Use the preview to identify the delimiter. Set identifiers to text where leading zeros matter, parse dates with the source locale and parse decimal points explicitly. Compare to film.xlsx, payroll2015.xlsx or payroll2016.xlsx, respectively. Retain an unchanged source and document any rejected rows.','Import the file with Power Query and set types explicitly. Do not change Windows settings or turn unknown values into zero.')

# Film permit skills missing from a numeric-variants-only bank.
film=read('film.xlsx').fillna({'ParkingHeld':'','Country':'','SubCategoryName':''})
for col in ['StartDateTime','EndDateTime','EnteredOn']:film[col]=pd.to_datetime(film[col])
film['DurationHours']=(film.EndDateTime-film.StartDateTime).dt.total_seconds()/3600
film['LeadDays']=(film.StartDateTime-film.EnteredOn).dt.total_seconds()/86400
shoot=film[film.EventType=='Shooting Permit']
for borough in ['Brooklyn','Manhattan','Queens','Bronx','Staten Island']:
    b=shoot[shoot.Borough==borough]
    out=b.sort_values(['StartDateTime','EventID'])[['EventID','StartDateTime','Category']].head(10)
    add('Earliest shooting records · '+borough,'Show the first ten Shooting Permit records in '+borough+', ordered by StartDateTime then EventID. Return EventID, StartDateTime and Category.','film.xlsx','NYC Film Permits','Filter and sort',out,'Filter EventType and Borough together. Sort on the actual datetime field and EventID, then keep the first ten records.')
    out=b[b.DurationHours>24].sort_values(['DurationHours','EventID'],ascending=[False,True])[['EventID','DurationHours']].head(10)
    add('Long shooting permits · '+borough,'Calculate permit duration in hours, filter Shooting Permits in '+borough+' longer than 24 hours and return the ten longest EventID/DurationHours pairs. Break ties by EventID.','film.xlsx','NYC Film Permits','Duration and filter',out,'Use (EndDateTime-StartDateTime)*24. Apply >24 after calculating unrounded durations; sort descending, then EventID ascending.')
    add('Parking text search · '+borough,'Count Shooting Permit records in '+borough+' whose ParkingHeld contains BROADWAY, ignoring case.','film.xlsx','NYC Film Permits','Text contains',int(b.ParkingHeld.str.contains('BROADWAY',case=False,regex=False).sum()),'Use COUNTIFS for EventType, Borough and ParkingHeld="*BROADWAY*". Excel COUNTIFS is case-insensitive.')
    out=rank(checked_group(film[film.Borough==borough],['EventType','Category'],count=True),'Records',['EventType','Category'])
    add('Two-way permit summary · '+borough,'Produce permit counts by EventType and Category for '+borough+'. Sort by count descending, then EventType and Category. Include every combination present.','film.xlsx','NYC Film Permits','Two-way pivot',out,'Filter Borough, use EventType and Category as pivot rows and count EventID. Do not sum EventID.')
for year in [2014,2015,2016,2017]:
    b=shoot[shoot.StartDateTime.dt.year==year]
    add('Lead-time average · '+str(year),'For Shooting Permits starting in '+str(year)+', calculate mean lead time in days from EnteredOn to StartDateTime. Keep signed differences and report two decimals.','film.xlsx','NYC Film Permits','Lead time',float(b.LeadDays.mean()),'Use StartDateTime-EnteredOn. Excel differences are days; do not multiply by 24. Filter on start year, not entry year.')
    out=rank(checked_group(b,['Borough'],count=True),'Records',['Borough'])
    add('Borough ranking · '+str(year),'Rank boroughs by Shooting Permit count for permits starting in '+str(year)+'. Break count ties alphabetically.','film.xlsx','NYC Film Permits','Grouped ranking',out,'Filter EventType and start year. Group by Borough and count records before sorting.')
for field in ['EventType','Category','Borough','Country','SubCategoryName']:
    out=rank(checked_group(film,[field],count=True),'Records',[field])
    add('Distribution of '+field,'Count all permit records by '+field+'. Include missing categories as a separate group and sort count descending, then category ascending.','film.xlsx','NYC Film Permits','Frequency and mode',out,'Use a pivot table counting EventID. The first row is a mode, subject to checking ties. Reconcile the group counts to 33,502.')
add('Lead time for long permits','Across all EventTypes, calculate the mean signed lead time in days for permits lasting longer than 12 hours.','film.xlsx','NYC Film Permits','Lead time',float(film.loc[film.DurationHours>12,'LeadDays'].mean()),'Create DurationHours=(EndDateTime-StartDateTime)*24 and LeadDays=StartDateTime-EnteredOn. Filter DurationHours>12, then average LeadDays.')
add('Borough and country cross-tab','Count permit records by Borough and Country, including empty Country values. Sort by Borough and Country.','film.xlsx','NYC Film Permits','Two-way pivot',checked_group(film,['Borough','Country'],count=True).sort_values(['Borough','Country']),'Use both fields as pivot rows and count EventID. Empty strings are retained as a separate category.')

# Employee-code extraction, numeric bins and pay-frequency pivots.
codes=read('etl-case3.xlsx','Case 3 data');suffix=codes.EmployeeCode.str.split('-').str[-1]
codes['Plant']=suffix.str.extract(r'^(\d+)')[0].astype(int);codes['FrequencyCode']=suffix.str.extract(r'([A-Za-z]+)$')[0]
codes['PayFrequency']=codes.FrequencyCode.map({'M':'Monthly','Mo':'Monthly','W':'Weekly','We':'Weekly'})
for threshold in [5,10,15]:
    out=pd.DataFrame({'Group':[f'Below {threshold}',f'{threshold} or above'],'Records':[int((codes.Plant<threshold).sum()),int((codes.Plant>=threshold).sum())]})
    add('Plant threshold groups · '+str(threshold),'Extract the numeric plant after the hyphen and classify every row as Below '+str(threshold)+' or '+str(threshold)+' or above. Return the two group counts.','etl-case3.xlsx','Employee codes · ETL','Numeric classification',out,'Find the hyphen, remove M/Mo/W/We from its suffix, convert the remaining digits to a number and use IF. Numeric comparison is required, not text comparison.')
codes['Band']=pd.cut(codes.Plant,[0,5,10,float('inf')],labels=['1–5','6–10','Above 10']).astype(str)
add('Three plant-number bands','Count records in extracted plant bands 1–5, 6–10 and Above 10, using inclusive boundaries.','etl-case3.xlsx','Employee codes · ETL','Numeric classification',checked_group(codes,['Band'],count=True),'Use IF(Plant<=5,"1–5",IF(Plant<=10,"6–10","Above 10")). Count each group and reconcile to 597.')
add('Plants 5 through 12','Count employees whose extracted plant number is between 5 and 12 inclusive.','etl-case3.xlsx','Employee codes · ETL','Numeric classification',int(codes.Plant.between(5,12).sum()),'Use COUNTIFS on the numeric plant column with >=5 and <=12.')
add('Frequency counts by plant','Count Monthly and Weekly employees for each numeric plant. Treat equal plant numbers across countries as the same group.','etl-case3.xlsx','Employee codes · ETL','Frequency pivot',checked_group(codes,['Plant','PayFrequency'],count=True).sort_values(['Plant','PayFrequency']),'Extract the complete suffix first. M/Mo means Monthly; W/We means Weekly. Pivot Plant × PayFrequency and count EmployeeCode.')
add('One-letter and two-letter frequencies','Classify M/W as One letter and Mo/We as Two letters, then count both classes and the four individual frequency codes.','etl-case3.xlsx','Employee codes · ETL','Suffix classification',checked_group(codes,['FrequencyCode'],count=True).sort_values('FrequencyCode'),'After extracting the plant digits, classify the remaining suffix. One-letter and two-letter totals are obtained by adding the relevant code counts.')
for frequency in ['Monthly','Weekly']:
    out=codes[codes.PayFrequency==frequency].sort_values(['Plant','EmployeeCode'])[['EmployeeCode','Plant','PayFrequency']].head(10)
    add('First ten '+frequency+' plant records','Extract plant and pay frequency, filter to '+frequency+' and return the first ten EmployeeCode/Plant/PayFrequency rows sorted by Plant then EmployeeCode.','etl-case3.xlsx','Employee codes · ETL','Filter extracted fields',out,'Create extracted columns first, then filter and sort the numeric plant. Use the EmployeeCode tie-breaker.')

out=codes[codes.Plant>=10].sort_values(['Plant','EmployeeCode'])[['EmployeeCode','Plant']]
add('Numeric plant filter at ten','Extract numeric Plant, filter to Plant>=10 and show EmployeeCode/Plant ordered by Plant then EmployeeCode.','etl-case3.xlsx','Employee codes · ETL','Filter extracted fields',out,'Extract and numerically convert the plant before filtering. Sort the numeric field so 10 does not come before 2.')
# Journal: in particular preparer identity uses a compound key.
book=pd.ExcelFile(D/'materials/journal.xlsx');lines=pd.read_excel(book,'JELineItems');enriched=lines.copy()
for sheet,keys in [('ChartOfAccounts',['GLAccountNumber']),('BusinessUnits',['BusinessUnitID']),('Source',['SourceID']),('PreparerInfo',['PreparerID','BusinessUnitID'])]:
    reference=pd.read_excel(book,sheet);assert not reference.duplicated(keys).any()
    enriched=enriched.merge(reference,on=keys,how='left',validate='many_to_one');assert len(enriched)==len(lines)
    value={'ChartOfAccounts':'GLAccountName','BusinessUnits':'BusinessUnit','Source':'Source','PreparerInfo':'PreparerName'}[sheet]
    unmatched=int(enriched[value].isna().sum())
    out=enriched[['JENumber',*keys,value]].head(12)
    if sheet=='ChartOfAccounts':out=enriched[['JENumber',*keys,'GLAccountName','AccountType']].head(12)
    add('Enrich journal from '+sheet,'Populate '+value+(' and AccountType' if sheet=='ChartOfAccounts' else '')+' for every JELineItems row. Show the first twelve rows as a reconciliation sample, and explain the matching key(s) and how to preserve the line count.','journal.xlsx','ETL Case 4','Composite lookup' if sheet=='PreparerInfo' else 'Reference lookup',out,'Left-merge on '+', '.join(keys)+'. '+('PreparerID repeats across business units: match BOTH PreparerID and BusinessUnitID. ' if sheet=='PreparerInfo' else '')+'Validate unique reference keys and flag unmatched rows. Never merge on JENumber. Keep all '+str(len(lines))+' source lines. Unmatched reference rows: '+str(unmatched)+'. Retain and flag them; do not invent a preparer name.')
for field in ['GLAccountName','BusinessUnit','Source','PreparerName']:
    for measure in ['Debit','Credit','Amount','Records','PositiveDebit']:
        count=measure=='Records';positive='Debit' if measure=='PositiveDebit' else None;col='Debit' if positive else measure
        out=checked_group(enriched,[field],None if count else [col],count=count,positive=positive)
        out=rank(out,'Records' if count else col,[field])
        add(measure+' by '+field,'Using correctly enriched journal lines, '+('count records' if count else 'sum '+col)+(' using only Debit>0' if positive else '')+' by '+field+'. Sort total descending, then label. Keep the source sign of Credit and Amount.','journal.xlsx','ETL Case 4','Enriched pivot',out,'Enrich the journal with validated left merges first. '+('Match preparer by PreparerID AND BusinessUnitID. ' if field=='PreparerName' else '')+'Use '+('count of lines' if count else 'sum of '+col)+' in the pivot. Blank amounts contribute zero; credits in this source are signed negative.')

# Payroll: both source layouts, all grouping dimensions, taxes, job extraction.
for year in [2015,2016]:
    df=read(f'payroll{year}.xlsx');file=f'payroll{year}.xlsx';category='IntegrateCo'
    hours,ot,gross,job=('Reg_Hrs','OT_Hrs','Reg_Pay','Job') if year==2015 else ('Hours','OT_Hours','Gross_Wages','Project')
    df['TotalHours']=df[hours].fillna(0)+df[ot].fillna(0)
    df['Gross']=df.Reg_Pay.fillna(0)+df.OT_Pay.fillna(0) if year==2015 else df.Gross_Wages
    taxes=['Fica_Medc','Futa','Suta','Work_Comp'] if year==2015 else ['SocSec_Medicare','FUTA','SUTA','Work_Comp']
    df['EmployeeCost']=df.Gross+df[taxes].fillna(0).sum(axis=1)
    df['JobCode']=df[job].astype(str).str.extract(r'^\d{2}[HS]?(\d{3})(?:B|SG|R|SH)?$')[0]
    add(f'Validate three-digit job extraction · {year}',f'Extract a three-digit JobCode from {job}. A valid code is two year digits, optional H or S, three job digits, and optional B/SG/R/SH suffix. Preserve leading zeros. Leave invalid codes blank. Count invalid rows.',file,category,'Payroll job extraction',int(df.JobCode.isna().sum()),'Find the optional department after the year, then take exactly three job digits. Validate the entire remaining suffix; never treat project-year digits as a pay date. Keep 001 as text. Invalid source examples: '+', '.join(df.loc[df.JobCode.isna(),job].astype(str).unique()[:5]))
    for threshold in [5,8,10]:
        numeric=pd.to_numeric(df.JobCode,errors='coerce');out=pd.DataFrame({'Group':[f'Below {threshold}',f'{threshold} or above','Invalid'],'Records':[int((numeric<threshold).sum()),int((numeric>=threshold).sum()),int(numeric.isna().sum())]})
        add(f'Job threshold {threshold} · {year}',f'After extracting valid JobCode from {job}, compare it numerically with {threshold}. Return counts below the threshold, at/above it and invalid. Keep invalid separate.',file,category,'Payroll classification',out,'Convert only validated three-digit codes to numbers for IF comparisons. Retain the displayed code as text. Invalid codes belong in their own group.')
    numeric=pd.to_numeric(df.JobCode,errors='coerce');band=pd.cut(numeric,[0,4,8,12],labels=['001–004','005–008','009–012']);out=pd.DataFrame({'Band':['001–004','005–008','009–012','Other/invalid'],'Records':[(band==x).sum() for x in ['001–004','005–008','009–012']]+[band.isna().sum()]})
    add(f'Job bands · {year}',f'Using extracted {job} job codes, count records in 001–004, 005–008 and 009–012. Report all other or invalid codes separately.',file,category,'Payroll classification',out,'Use inclusive numeric boundaries on validated codes. Reconcile all groups to the original row count.')
    rates=df.Gross.div(df.TotalHours.replace(0,np.nan));out=pd.DataFrame({'WorksheetRow':range(2,len(df)+2),'Gross':df.Gross,'TotalHours':df.TotalHours,'Rate':rates}).head(12)
    add(f'Row pay rates with zero-hours handling · {year}','Create gross pay, total regular plus overtime hours, and row gross pay per hour. Leave rates blank at zero total hours. Show the first twelve worksheet data rows.',file,category,'Payroll rate',out,'Gross='+('Reg_Pay+OT_Pay' if year==2015 else 'Gross_Wages (do not add overtime again)')+'; TotalHours='+hours+'+'+ot+'. Use IF(TotalHours=0,"",Gross/TotalHours). Do not confuse a mean of row rates with total pay divided by total hours.')
    add(f'Total employee cost · {year}','Calculate total recorded employee cost, including gross wages and the four employer tax/insurance fields. Use the entire extract and report two decimals.',file,category,'Employee cost',float(df.EmployeeCost.sum()),'Sum gross wages plus '+', '.join(taxes)+'. Retain recorded signs and do not add Gross_Wages twice.')
    dimensions=['Emp_No','Job','Home_Div','Work_Div'] if year==2015 else ['Employee_Number','Project','Employee_ID','Employee_Name']
    for key in dimensions:
        for operation in ['Gross','Records','Hours','OvertimeOnly']:
            source=df[df[ot]>0] if operation=='OvertimeOnly' else df
            measures=['Gross'] if operation in ['Gross','OvertimeOnly'] else [hours,ot]
            out=checked_group(source,[key],None if operation=='Records' else measures,count=operation=='Records')
            metric='Records' if operation=='Records' else measures[0];out=rank(out,metric,[key]).head(10)
            add(f'{year} {operation} leaders by {key}',f'Group the {year} payroll by {key}, retaining a missing-identifier group. '+({'Gross':'Sum gross wages.','Records':'Count source rows.','Hours':f'Sum {hours} and {ot} separately.','OvertimeOnly':f'Keep only source rows with {ot}>0, then sum gross wages.'}[operation])+f' Return the ten groups with the highest {metric}, breaking ties by {key}.',file,category,'Payroll grouped summary',out,'Use '+key+' as the grouping field; do not substitute another employee identifier. '+('Apply the overtime filter before grouping. ' if operation=='OvertimeOnly' else '')+'Preserve missing identifiers as a separate group. Use sum for amounts and count for source records.')
    for measure in [gross,hours,ot,*taxes[1:]]:
        values=df[measure].fillna(0)
        add(f'{year} total and maximum of {measure}',f'Find the total and largest recorded value of {measure} across the full {year} extract.',file,category,'Payroll totals and extrema',pd.DataFrame({'Measure':['Total','Maximum'],measure:[values.sum(),values.max()]}),'Use SUM and MAX on the requested numeric field, excluding the header. Do not confuse regular pay with gross pay.')
        out=df[df[measure]>0].sort_values(measure,ascending=False,kind='stable')[[job,measure]].head(10).reset_index(drop=True)
        add(f'{year} positive {measure} ranking',f'Show the ten largest positive {measure} records with their {job}. Break equal-value ties by original worksheet order.',file,category,'Payroll filter and sort',out,'Filter the requested numeric field to >0, then perform a stable descending sort. Do not aggregate these individual records.')
    keys=[job,'Work_Div'] if year==2015 else ['Employee_Number','Project']
    for measure in ['Gross',hours,ot,'Work_Comp']:
        out=rank(checked_group(df,keys,[measure]),measure,keys).head(10)
        add(f'{year} two-key {measure} summary',f'Sum {measure} by '+' and '.join(keys)+'. Return the ten largest totals, then sort tied groups by the keys. Retain missing keys.',file,category,'Payroll two-way pivot',out,'Put both dimensions in pivot rows, sum the requested measure and retain blank-key groups. Sum source rows once.')
    if year==2015:
        df['PayMonth']=df.Pay_Date.dt.strftime('%Y-%m')
        for measure in ['Reg_Pay','OT_Pay','Reg_Hrs','OT_Hrs']:
            add('Monthly '+measure+' in 2015','Summarise '+measure+' by calendar month of Pay_Date, in chronological order.',file,category,'Payroll monthly grouping',checked_group(df,['PayMonth'],[measure]).sort_values('PayMonth'),'Group the actual Pay_Date by year and month. Do not derive pay months from the Job prefix.')
        add('Payroll date boundaries','Find the earliest and latest Pay_Date in the 2015 payroll and calculate the elapsed number of calendar days.',file,category,'Payroll date arithmetic',pd.DataFrame({'First':[df.Pay_Date.min()],'Last':[df.Pay_Date.max()],'ElapsedDays':[(df.Pay_Date.max()-df.Pay_Date.min()).days]}),'Use MIN and MAX on typed dates, then subtract. This is elapsed time, not a count of pay periods.')
    else:
        selected=df[df.Project.astype(str)=='15005']
        for measure in ['Gross','Hours','OT_Hours','Work_Comp']:
            add('Project 15005 '+measure,'For Project 15005 in 2016, sum '+measure+' by Employee_Number, including missing numbers. Order by Employee_Number.',file,category,'Payroll project filter',checked_group(selected,['Employee_Number'],[measure]).sort_values('Employee_Number',na_position='last'),'Filter the original Project value before grouping. Retain a blank Employee_Number as a separate group.')

# New SQL covers filtered joins/HAVING, units across relationship chains, patterns,
# DISTINCT identity and full-name/refund/multi-dimension purchasing-card analysis.
period_db=A/'pcards-periods.db'
if period_db.exists():period_db.unlink()
with zipfile.ZipFile(archive) as z:
    source=next(n for n in z.namelist() if n.endswith('/pcards.db'))
    original=ROOT.parent/'pcards-original.db'
    if not original.exists():original.write_bytes(z.read(source))
src=sqlite3.connect(original);dst=sqlite3.connect(period_db)
dst.execute(src.execute("SELECT sql FROM sqlite_master WHERE name='pcards'").fetchone()[0])
for year in [2011,2012,2013,2014]:
    for month in range(1,13):
        sample=src.execute('SELECT * FROM pcards WHERE Year=? AND Month=? ORDER BY ID LIMIT 100',(year,month)).fetchall()
        if sample:dst.executemany('INSERT INTO pcards VALUES ('+','.join('?' for _ in sample[0])+')',sample)
dst.commit();dst.close();src.close()
materials.append({'title':'P-cards · four-year monthly sample','file':'assets/pcards-periods.db','origin':source,'note':'Up to 100 original records per year/month, 2011–2014, ordered by ID. All agencies eligible; a practice sample, not full-population expenditure.'})
dbs={name:sqlite3.connect(A/file) for name,file in [('songs','songs.db'),('movies','movies-practice.db'),('chinook','chinook.sqlite'),('pcards','pcards-practice.db'),('pcards-periods','pcards-periods.db')]}
frames={name:{t:pd.read_sql_query('SELECT * FROM "'+t+'"',db) for (t,) in db.execute("SELECT name FROM sqlite_master WHERE type='table'") if not t.startswith('sqlite_')} for name,db in dbs.items()}
def sql(name,title,prompt,query,expected,skill,ordered=True):
    ident={'songs':'sc','movies':'mc','chinook':'cc','pcards':'ac','pcards-periods':'ap'}[name]+str(1001+len(exercises[name]));cursor=dbs[name].execute(query);actual=[list(r) for r in cursor.fetchall()]
    reference=rows(expected) if isinstance(expected,pd.DataFrame) else expected
    def sort(v):return sorted(v,key=lambda r:json.dumps(r,ensure_ascii=False))
    assert len(actual)==len(reference),(title,len(actual),len(reference))
    for a,b in zip(actual if ordered else sort(actual),reference if ordered else sort(reference)):
        assert len(a)==len(b)
        for x,y in zip(a,b):
            if isinstance(x,(int,float)) and isinstance(y,(int,float)):assert math.isclose(x,y,rel_tol=1e-8,abs_tol=1e-6),(title,x,y)
            else:assert x==y,(title,x,y)
    exercises[name].append({'id':ident,'title':title,'desc':prompt,'answer':query,'starter':'SELECT\n-- Write your query here','hint':skill+'; use the exact requested columns, grouping and sort.','skill':skill,'ordered':ordered,'explain':'The reference uses the linked course practice database. Empty results are valid when no groups qualify.','coverage':True})
    refs[ident]={'kind':'SQL','dataset':name,'columns':[c[0] for c in cursor.description],'rows':actual};return ident
def quote(v):return "'"+str(v).replace("'","''")+"'"
s=frames['songs']['songs'];artist=frames['songs']['artists']
for field in ['energy','danceability','tempo','duration_ms']:
    sql('songs','Range and mean of '+field,'Return MIN, MAX and AVG of '+field+' across all songs, in that order.',f'SELECT MIN({field}),MAX({field}),AVG({field}) FROM songs;',[[float(s[field].min()),float(s[field].max()),float(s[field].mean())]],'MIN · MAX · AVG',False)
    g=s.groupby('artist_id')[field].agg(['size','mean']).reset_index();g=g[g['size']>2].merge(artist,left_on='artist_id',right_on='id').sort_values(['mean','artist_id'],ascending=[False,True])
    sql('songs','Artist means and counts · '+field,'Return artist name, song count and average '+field+' for artists with more than two songs. Sort mean descending, then artist ID.',f'SELECT a.name,COUNT(*),AVG(s.{field}) AS MeanValue FROM songs s JOIN artists a ON a.id=s.artist_id GROUP BY a.id,a.name HAVING COUNT(*)>2 ORDER BY MeanValue DESC,a.id;',g[['name','size','mean']],'JOIN · GROUP BY · HAVING')
for field,threshold in [('energy',.6),('danceability',.6)]:
    sub=s[s[field]>threshold];g=sub.groupby('artist_id')[field].agg(['size','mean']).reset_index();g=g[g['size']>=2].merge(artist,left_on='artist_id',right_on='id').sort_values(['mean','artist_id'],ascending=[False,True])
    sql('songs','Filter then average by named artist · '+field,'Using only songs with '+field+' above '+str(threshold)+', return artist name, count and average '+field+' for artists with at least two qualifying songs. Sort mean descending, then artist ID.',f'SELECT a.name,COUNT(*),AVG(s.{field}) AS MeanValue FROM songs s JOIN artists a ON a.id=s.artist_id WHERE s.{field}>{threshold} GROUP BY a.id,a.name HAVING COUNT(*)>=2 ORDER BY MeanValue DESC,a.id;',g[['name','size','mean']],'WHERE · JOIN · HAVING')
for term in ['feat.','love','night','you']:
    sub=s[s.name.str.contains(term,case=False,regex=False)]
    sql('songs','Song-name pattern profile · '+term,'Return the number of songs whose name contains '+term+' (case-insensitive), and their average energy.',f'SELECT COUNT(*),AVG(energy) FROM songs WHERE name LIKE {quote("%"+term+"%")};',[[len(sub),float(sub.energy.mean()) if len(sub) else None]],'LIKE · COUNT · AVG',False)
    joined=sub.merge(artist,left_on='artist_id',right_on='id',suffixes=('_song','_artist')).sort_values('id_song')
    sql('songs','Named artists for pattern · '+term,'Return song and artist names where song name contains '+term+' (case-insensitive). Sort by song ID.',f'SELECT s.name,a.name FROM songs s JOIN artists a ON a.id=s.artist_id WHERE s.name LIKE {quote("%"+term+"%")} ORDER BY s.id;',joined[['name_song','name_artist']],'LIKE · JOIN')

f=frames['movies'];m=f['movies'];r=f['ratings'];p=f['people'];dr=f['directors'];st=f['stars'];rated=m.merge(r,left_on='id',right_on='movie_id')
for year in [2000,2005,2010,2011,2013,2015,2017]:
    sub=rated[rated.year==year];out=sub[sub.rating>=8].sort_values(['rating','id'],ascending=[False,True])
    sql('movies',f'Year {year}: rated-film profile',f'Return average rating and count of rated films released in {year} in the subset.',f'SELECT AVG(r.rating),COUNT(*) FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE m.year={year};',[[float(sub.rating.mean()),len(sub)]],'JOIN · AGGREGATE',False)
    sql('movies',f'Year {year}: high-rated titles',f'Return title and rating for {year} releases rated at least 8. Sort rating descending, then film ID.',f'SELECT m.title,r.rating FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE m.year={year} AND r.rating>=8 ORDER BY r.rating DESC,m.id;',out[['title','rating']],'JOIN · FILTER · SORT')
    joined=dr.merge(m,left_on='movie_id',right_on='id');g=joined[joined.year==year].groupby('person_id').size().reset_index(name='Films');g=g[g.Films>=2].merge(p,left_on='person_id',right_on='id').sort_values('person_id')
    sql('movies',f'Year {year}: repeat directors',f'Return director name and count of their films released in {year} in the subset, including directors with at least two films. Group by person identity, sort by person ID. An empty result is valid.',f'SELECT p.name,COUNT(*) FROM people p JOIN directors d ON d.person_id=p.id JOIN movies m ON m.id=d.movie_id WHERE m.year={year} GROUP BY p.id,p.name HAVING COUNT(*)>=2 ORDER BY p.id;',g[['name','Films']],'RELATIONSHIP CHAIN · HAVING')
for start,end in [(1990,1999),(2000,2009),(2010,2015),(2015,2019)]:
    out=rated[rated.year.between(start,end)].groupby('year').rating.mean().reset_index().sort_values('year')
    sql('movies',f'Annual ratings · {start}–{end}',f'Return year and average film rating for rated films from {start} through {end}, inclusive. Sort year ascending.',f'SELECT m.year,AVG(r.rating) FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE m.year BETWEEN {start} AND {end} GROUP BY m.year ORDER BY m.year;',out,'JOIN · YEAR GROUPING')

for minimum in [20,50,100]:
    out=m.groupby('year').size().reset_index(name='Films');out=out[out.Films>minimum].sort_values(['Films','year'],ascending=[False,True])
    sql('movies',f'Release-year counts above {minimum}',f'Return year and count of subset films for release years with more than {minimum} films. Sort count descending, then year.','SELECT year,COUNT(*) AS Films FROM movies GROUP BY year HAVING COUNT(*)>'+str(minimum)+' ORDER BY Films DESC,year;',out,'GROUP BY · HAVING · SORT')
for year in [2000,2005,2010,2011,2013,2015,2017]:
    out=rated[(rated.year==year)&(rated.votes>=10000)]
    sql('movies',f'Year {year}: substantial vote count',f'Count rated subset films released in {year} with at least 10,000 votes.',f'SELECT COUNT(*) FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE m.year={year} AND r.votes>=10000;',[[len(out)]],'JOIN · MULTIPLE FILTERS',False)
f=frames['chinook'];inv=f['Invoice'];cust=f['Customer'];line=f['InvoiceLine'];track=f['Track'];genre=f['Genre'];album=f['Album']
joined=inv.merge(cust[['CustomerId','FirstName','LastName']],on='CustomerId')
units=line.merge(inv[['InvoiceId','BillingCountry']],on='InvoiceId').merge(track[['TrackId','GenreId','AlbumId','Name']],on='TrackId').merge(genre,on='GenreId',suffixes=('_track','_genre'))
for country in ['Brazil','Germany','France','USA','Canada','United Kingdom']:
    c=joined[joined.BillingCountry==country].sort_values('InvoiceId')
    sql('chinook','Customers and invoices · '+country,'Return FirstName, LastName, InvoiceId and Total for invoices billed to '+country+', sorted by InvoiceId.',f'SELECT c.FirstName,c.LastName,i.InvoiceId,i.Total FROM Invoice i JOIN Customer c ON c.CustomerId=i.CustomerId WHERE i.BillingCountry={quote(country)} ORDER BY i.InvoiceId;',c[['FirstName','LastName','InvoiceId','Total']],'CUSTOMER JOIN')
    g=c.groupby(['CustomerId','FirstName','LastName']).Total.sum().reset_index();g=g[g.Total>30].sort_values('CustomerId')
    sql('chinook','Customer totals with HAVING · '+country,'Return FirstName, LastName and total invoice value billed to '+country+' for customers with a total above 30. Sort by CustomerId.',f'SELECT c.FirstName,c.LastName,SUM(i.Total) FROM Invoice i JOIN Customer c ON c.CustomerId=i.CustomerId WHERE i.BillingCountry={quote(country)} GROUP BY c.CustomerId,c.FirstName,c.LastName HAVING SUM(i.Total)>30 ORDER BY c.CustomerId;',g[['FirstName','LastName','Total']],'FILTER · JOIN · HAVING')
    g=units[units.BillingCountry==country].groupby(['GenreId','Name_genre']).Quantity.sum().reset_index().sort_values('GenreId')
    sql('chinook','Purchased units by genre · '+country,'Return genre name and total Quantity purchased on invoices billed to '+country+'. Sort by GenreId. Sum units, not invoice totals or track counts.',f'SELECT g.Name,SUM(il.Quantity) FROM Invoice i JOIN InvoiceLine il ON il.InvoiceId=i.InvoiceId JOIN Track t ON t.TrackId=il.TrackId JOIN Genre g ON g.GenreId=t.GenreId WHERE i.BillingCountry={quote(country)} GROUP BY g.GenreId,g.Name ORDER BY g.GenreId;',g[['Name_genre','Quantity']],'FOUR-TABLE JOIN · UNITS')
for key in ['BillingCountry','CustomerId']:
    g=inv.groupby(key).Total.agg(['size','sum','mean']).reset_index().sort_values(key)
    sql('chinook','Invoice count total and mean by '+key,'Return '+key+', invoice count, SUM(Total) and AVG(Total), sorted by '+key+'.',f'SELECT {key},COUNT(*),SUM(Total),AVG(Total) FROM Invoice GROUP BY {key} ORDER BY {key};',g,'GROUPED INVOICE METRICS')
g=line.merge(track[['TrackId','AlbumId']],on='TrackId').merge(album[['AlbumId','Title']],on='AlbumId').groupby(['AlbumId','Title']).Quantity.sum().reset_index().sort_values(['Quantity','AlbumId'],ascending=[False,True])
sql('chinook','Album unit-sales ranking','Return album Title and total Quantity purchased, sorted by units descending, then AlbumId.', 'SELECT a.Title,SUM(il.Quantity) AS Units FROM InvoiceLine il JOIN Track t ON t.TrackId=il.TrackId JOIN Album a ON a.AlbumId=t.AlbumId GROUP BY a.AlbumId,a.Title ORDER BY Units DESC,a.AlbumId;',g[['Title','Quantity']],'ALBUM JOIN · UNIT TOTALS')
g=units.groupby(['GenreId','Name_genre']).Quantity.sum().reset_index();g=g[g.Quantity>100].sort_values('GenreId')
sql('chinook','Genre units above 100','Return genre name and total purchased Quantity for genres above 100 units. Sort by GenreId.','SELECT g.Name,SUM(il.Quantity) FROM InvoiceLine il JOIN Track t ON t.TrackId=il.TrackId JOIN Genre g ON g.GenreId=t.GenreId GROUP BY g.GenreId,g.Name HAVING SUM(il.Quantity)>100 ORDER BY g.GenreId;',g[['Name_genre','Quantity']],'GENRE JOIN · HAVING')
g=line.merge(track[['TrackId','Name']],on='TrackId').groupby(['TrackId','Name']).Quantity.sum().reset_index();g=g[g.Quantity>1].sort_values('TrackId')
sql('chinook','Repeat-purchased track units','Return track Name and total Quantity for tracks with more than one unit purchased, sorted by TrackId.','SELECT t.Name,SUM(il.Quantity) FROM InvoiceLine il JOIN Track t ON t.TrackId=il.TrackId GROUP BY t.TrackId,t.Name HAVING SUM(il.Quantity)>1 ORDER BY t.TrackId;',g[['Name','Quantity']],'TRACK JOIN · HAVING')
g=track.groupby('UnitPrice').size().reset_index(name='Tracks').sort_values('UnitPrice')
sql('chinook','Track price frequency','Return UnitPrice and the count of tracks at that price, sorted by price.','SELECT UnitPrice,COUNT(*) FROM Track GROUP BY UnitPrice ORDER BY UnitPrice;',g,'PRICE GROUPING')

for price in [.99,1]:
    out=track[track.UnitPrice>price]
    sql('chinook','Track prices above '+str(price),'Return count and average UnitPrice for tracks priced strictly above '+str(price)+'.',f'SELECT COUNT(*),AVG(UnitPrice) FROM Track WHERE UnitPrice>{price};',[[len(out),float(out.UnitPrice.mean())]],'PRICE FILTER · AVG',False)
for threshold in [10,15,20]:
    out=joined[joined.Total>threshold].sort_values('InvoiceId')
    sql('chinook','Named customers above invoice '+str(threshold),'Return FirstName, LastName and Total for invoices above '+str(threshold)+', sorted by InvoiceId.',f'SELECT c.FirstName,c.LastName,i.Total FROM Invoice i JOIN Customer c ON c.CustomerId=i.CustomerId WHERE i.Total>{threshold} ORDER BY i.InvoiceId;',out[['FirstName','LastName','Total']],'CUSTOMER JOIN · THRESHOLD')
for minimum in [10,15,20]:
    out=inv.groupby('BillingCountry').Total.agg(['size','sum']).reset_index();out=out[out['size']>=minimum].sort_values('BillingCountry')
    sql('chinook','Billing countries with '+str(minimum)+' invoices','Return BillingCountry, invoice count and SUM(Total) for countries with at least '+str(minimum)+' invoices. Sort by country.',f'SELECT BillingCountry,COUNT(*),SUM(Total) FROM Invoice GROUP BY BillingCountry HAVING COUNT(*)>={minimum} ORDER BY BillingCountry;',out,'INVOICE COUNT · HAVING')
c=frames['pcards']['pcards'];positive=c[c.Amount>0];refund=c[c.Amount<0]
for month in sorted(c.Month.unique()):
    sub=positive[positive.Month==month];neg=refund[refund.Month==month]
    sql('pcards','Monthly positive-purchase profile · '+str(month),'For Month '+str(month)+' in this 2014 OSU subset, return count and total Amount of positive purchases. Do not net refunds.',f'SELECT COUNT(*),SUM(Amount) FROM pcards WHERE Amount>0 AND Year=2014 AND Month={int(month)};',[[len(sub),float(sub.Amount.sum()) if len(sub) else None]],'PERIOD FILTER · POSITIVE PURCHASES',False)
    sql('pcards','Monthly positive refund value · '+str(month),'For Month '+str(month)+' in this 2014 OSU subset, return refund count and total refund value as a positive amount. Keep SUM NULL if there are no refunds.',f'SELECT COUNT(*),-SUM(Amount) FROM pcards WHERE Amount<0 AND Year=2014 AND Month={int(month)};',[[len(neg),-float(neg.Amount.sum()) if len(neg) else None]],'REFUND SIGN · PERIOD FILTER',False)
for threshold in [1000,3000,5000,10000]:
    g=positive.groupby('FullName').Amount.sum().reset_index();g=g[g.Amount>threshold].sort_values(['Amount','FullName'],ascending=[False,True])
    sql('pcards','Cardholder purchase threshold · '+str(threshold),'Use FullName as the case person identifier. Return FullName and positive-purchase total above '+str(threshold)+', sorted total descending then name.',f'SELECT FullName,SUM(Amount) AS Purchases FROM pcards WHERE Amount>0 GROUP BY FullName HAVING SUM(Amount)>{threshold} ORDER BY Purchases DESC,FullName;',g,'FULLNAME · HAVING')
    g=refund.groupby('FullName').Amount.agg(['size','sum']).reset_index();g['Value']=-g['sum'];g=g[g.Value>threshold].sort_values(['Value','FullName'],ascending=[False,True])
    sql('pcards','Cardholder refund threshold · '+str(threshold),'Return FullName, refund count and positive refund value for cardholders whose refunds exceed '+str(threshold)+'. Sort refund value descending, then name. Empty results are valid.',f'SELECT FullName,COUNT(*),-SUM(Amount) AS RefundValue FROM pcards WHERE Amount<0 GROUP BY FullName HAVING -SUM(Amount)>{threshold} ORDER BY RefundValue DESC,FullName;',g[['FullName','size','Value']],'FULLNAME · REFUND HAVING')
g=positive.groupby(['FullName','Month']).Amount.sum().reset_index().sort_values(['FullName','Month'])
sql('pcards','Cardholder-by-month purchase matrix','Return FullName, Month and positive-purchase total for each observed combination, sorted by FullName then Month.','SELECT FullName,Month,SUM(Amount) FROM pcards WHERE Amount>0 GROUP BY FullName,Month ORDER BY FullName,Month;',g,'TWO-DIMENSION GROUPING')
for pattern in ['AMAZON','WAL-MART','HOTEL','OFFICE']:
    sub=positive[positive.Vendor.str.contains(pattern,case=False,regex=False)]
    sql('pcards','Vendor pattern totals · '+pattern,'Return count and total Amount of positive purchases at vendors containing '+pattern+', ignoring case.',f'SELECT COUNT(*),SUM(Amount) FROM pcards WHERE Amount>0 AND Vendor LIKE {quote("%"+pattern+"%")};',[[len(sub),float(sub.Amount.sum()) if len(sub) else None]],'VENDOR LIKE · PURCHASE TOTAL',False)
    g=sub.groupby('FullName').Amount.sum().reset_index().sort_values('FullName')
    sql('pcards','Vendor pattern by cardholder · '+pattern,'Return FullName and positive-purchase total at vendors containing '+pattern+', ignoring case. Sort by FullName.',f'SELECT FullName,SUM(Amount) FROM pcards WHERE Amount>0 AND Vendor LIKE {quote("%"+pattern+"%") } GROUP BY FullName ORDER BY FullName;',g,'VENDOR LIKE · CARDHOLDER GROUP')

for pattern in ['AMAZON','WAL-MART','HOTEL','OFFICE']:
    out=positive[positive.Vendor.str.contains(pattern,case=False,regex=False)].sort_values(['Amount','ID'],ascending=[False,True])
    sql('pcards','Vendor pattern charge listing · '+pattern,'Return Vendor and Amount for positive purchases whose vendor contains '+pattern+', ignoring case. Sort amount descending, then ID.',f'SELECT Vendor,Amount FROM pcards WHERE Amount>0 AND Vendor LIKE {quote('%'+pattern+'%')} ORDER BY Amount DESC,ID;',out[['Vendor','Amount']],'VENDOR LIKE · SORT')
for threshold in [1000,3000,5000]:
    out=positive[positive.Amount>threshold].sort_values(['Amount','ID'],ascending=[False,True])
    sql('pcards','Named cardholder charges above '+str(threshold),'Return FullName, Vendor and Amount for purchases strictly above '+str(threshold)+', sorted by amount descending then ID.',f'SELECT FullName,Vendor,Amount FROM pcards WHERE Amount>{threshold} ORDER BY Amount DESC,ID;',out[['FullName','Vendor','Amount']],'CARDHOLDER PURCHASE FILTER')
    out=positive.groupby('Vendor').Amount.agg(['size','sum']).reset_index();out=out[out['sum']>threshold].sort_values('Vendor')
    sql('pcards','Positive vendor spend above '+str(threshold),'Return Vendor, purchase count and positive-purchase total for vendors above '+str(threshold)+', sorted by Vendor.',f'SELECT Vendor,COUNT(*),SUM(Amount) FROM pcards WHERE Amount>0 GROUP BY Vendor HAVING SUM(Amount)>{threshold} ORDER BY Vendor;',out,'VENDOR PURCHASE HAVING')
# Period-spanning questions use a separate, clearly labelled sample.
c=frames['pcards-periods']['pcards']
for year in [2011,2012,2013,2014]:
    positive=c[(c.Year==year)&(c.Amount>0)];refund=c[(c.Year==year)&(c.Amount<0)]
    sql('pcards-periods',f'Four-year sample: purchases in {year}',f'In the four-year monthly sample, return count and sum of positive purchases in Year {year}. These are sample totals, not statewide totals.',f'SELECT COUNT(*),SUM(Amount) FROM pcards WHERE Year={year} AND Amount>0;',[[len(positive),float(positive.Amount.sum())]],'YEAR FILTER · PURCHASE TOTAL',False)
    sql('pcards-periods',f'Four-year sample: refund value in {year}',f'Return refund count and positive refund value for Year {year} in the four-year sample. Keep SUM NULL if no refunds exist.',f'SELECT COUNT(*),-SUM(Amount) FROM pcards WHERE Year={year} AND Amount<0;',[[len(refund),-float(refund.Amount.sum()) if len(refund) else None]],'YEAR FILTER · REFUND VALUE',False)
    out=positive.groupby('Month').Amount.sum().reset_index().sort_values('Month')
    sql('pcards-periods',f'Four-year sample: monthly purchases in {year}',f'Return Month and positive purchase total for Year {year}, ordered by Month.',f'SELECT Month,SUM(Amount) FROM pcards WHERE Year={year} AND Amount>0 GROUP BY Month ORDER BY Month;',out,'YEAR FILTER · MONTH GROUPING')
    out=positive.groupby(['FullName','Month']).Amount.sum().reset_index().sort_values(['FullName','Month'])
    sql('pcards-periods',f'Four-year sample: cardholder months in {year}',f'Return FullName, Month and positive-purchase total for Year {year}. Sort by FullName then Month. FullName is the case person identifier.',f'SELECT FullName,Month,SUM(Amount) FROM pcards WHERE Year={year} AND Amount>0 GROUP BY FullName,Month ORDER BY FullName,Month;',out,'YEAR FILTER · TWO DIMENSIONS')

# Thirty four-question interpretation exams. All model outputs are actually fitted
# to the restaurant data; coefficients and p-values are never invented.
w=pd.ExcelFile(D/'materials/restaurant.xlsm');sales=pd.read_excel(w,'salesData');weather=pd.read_excel(w,'weatherData');game=pd.read_excel(w,'gameData')
daily=sales.groupby('date')[['netTotal','netTotal_7','netTotal_28','netTotal_364']].sum().reset_index().merge(weather,on='date').merge(game[['date','gameDay','homeGame']],on='date',how='left');daily[['gameDay','homeGame']]=daily[['gameDay','homeGame']].fillna(0)
daily['Weekend']=(daily.date.dt.dayofweek>=5).astype(int);daily['SecondHalf']=(daily.date.dt.month>=7).astype(int);daily['Monday']=(daily.date.dt.dayofweek==0).astype(int)
assert len(daily)==312
daily=daily.dropna(subset=['tmax','tmin','prcp','netTotal_7','netTotal_28','netTotal_364']).copy()
def fit(key,X,names,formula,description):
    X=np.asarray(X,float);y=daily.netTotal.to_numpy(float);assert np.linalg.matrix_rank(X)==X.shape[1]
    b=np.linalg.lstsq(X,y,rcond=None)[0];pred=X@b;res=y-pred;df=len(y)-X.shape[1];variance=float(res@res)/df;se=np.sqrt(np.diag(np.linalg.inv(X.T@X))*variance);p=2*stats.t.sf(np.abs(b/se),df)
    # Independent normal-equation solution and standard-error calculation.
    other=np.linalg.solve(X.T@X,X.T@y);assert np.allclose(b,other,rtol=1e-6,atol=1e-5)
    assert np.allclose(pred,X@other,rtol=1e-8,atol=1e-5)
    models[key]={'n':len(y),'r2':1-float(res@res)/float(((y-y.mean())**2).sum()),'b':b.tolist(),'coefficients':[{'term':name,'estimate':float(bb),'standardError':float(ss),'pValue':float(pp)} for name,bb,ss,pp in zip(names,b,se,p)],'formula':formula,'description':description,'source':'Fitted to complete observed sales/weather dates; conventional OLS standard errors. No held-out accuracy claim.'}
    refs[key]={'kind':'OLS','X':X.tolist(),'y':y.tolist()};return models[key]
def reg(ident,title,prompt,key,answer,skill,expected=None):
    questions.append({'id':ident,'kind':'Regression','title':title,'prompt':prompt,'category':'Restaurant','files':['materials/restaurant.xlsm'],'model':key,'answer':answer,'hint':'Use the displayed model, reference-group coding and predictor range. '+('Keep all prediction terms.' if skill=='Prediction' else 'Compare p-values with 0.05; statistical significance does not establish causality.'),'checks':['State outcome and predictor units','Use the correct reference group and model','Interpret uncertainty without causal claims'],'expected':expected,'tolerance':.00500001,'coverage':True,'skill':skill})
def evidence(p):return f'p={p:.6g}: '+('reject' if p<.05 else 'do not reject')+' the zero-coefficient null at 5%, under the OLS assumptions. This is not a probability that the null is true.'
regsets=[]
predictors=[('tmax','daily high temperature (°F)'),('tmin','daily low temperature (°F)'),('prcp','precipitation (source weather units)'),('netTotal_7','sales 7 days earlier ($)'),('netTotal_28','sales 28 days earlier ($)'),('netTotal_364','sales 364 days earlier ($)')]
dummies=[('Weekend','weekend','weekday'),('gameDay','game day','non-game day'),('homeGame','home-game day','day without a home game'),('SecondHalf','July–December date','January–June date'),('Monday','Monday','day other than Monday')]
for number,((field,label),(dummy,one,zero)) in enumerate([(x,g) for x in predictors for g in dummies],1):
    x=daily[field].to_numpy(float);g=daily[dummy].to_numpy(float);ones=np.ones(len(x));chosen=float(np.median(x));flag=number%2
    desc=f'X = {label}; observed X range {x.min():.6g}–{x.max():.6g}. D=1: {one}; D=0 (reference): {zero}. Outcome: daily sales in dollars. Calendar/game indicators are derived from dates/schedule; absent schedule dates are coded 0. Predictions describe fitted associations.'
    prefix=f'fit{number:02d}';ids=[]
    mp=fit(prefix+'p',np.column_stack([ones,x,g]),['Intercept','X: '+label,'D: '+one],'b₀ + b₁ × X + b₂ × D',desc)
    b=mp['b'];value=float(b[0]+b[1]*chosen+b[2]*flag);ident=f'rC{number:02d}P';ids.append(ident)
    reg(ident,f'{field} / {dummy} · predict sales',f'Use this additive model to predict daily sales at X={chosen:.12g}, D={flag}. Include all terms and report dollars to two decimals.',prefix+'p',f'{value:,.2f} dollars = {b[0]:.9g} + ({b[1]:.9g} × {chosen:.12g}) + ({b[2]:.9g} × {flag}). This is a conditional mean, not a guaranteed observation.','Prediction',value)
    single_dummy=number%2==0;v=g if single_dummy else x;name='D: '+one if single_dummy else 'X: '+label
    ms=fit(prefix+'s',np.column_stack([ones,v]),['Intercept',name],'a₀ + a₁ × '+('D' if single_dummy else 'X'),desc);b=ms['b'];ident=f'rC{number:02d}S';ids.append(ident)
    answer=(f'The D coefficient {b[1]:.6f} is predicted sales on a {one} minus predicted sales on a {zero}, in dollars. The intercept {b[0]:.6f} is the D=0 mean.' if single_dummy else f'A one-unit increase in {label} is associated with {b[1]:.6f} dollars change in predicted daily sales. Intercept {b[0]:.6f} is the prediction at X=0; assess whether zero is within the shown range.')+' '+evidence(ms['coefficients'][1]['pValue'])+' This single-predictor association can reflect omitted variables.'
    reg(ident,f'{field} / {dummy} · '+('dummy comparison' if single_dummy else 'continuous slope'),'Interpret the intercept and '+('D coefficient, explicitly naming both groups.' if single_dummy else 'X coefficient with units.')+' Assess the slope at the 5% significance level.',prefix+'s',answer,'Dummy interpretation' if single_dummy else 'Continuous interpretation')
    mq=fit(prefix+'q',np.column_stack([ones,x,x*x]),['Intercept','X: '+label,'X²'],'c₀ + c₁ × X + c₂ × X²',desc);b=mq['b'];ident=f'rC{number:02d}Q';ids.append(ident)
    turning=-b[1]/(2*b[2]);slope=b[1]+2*b[2]*chosen
    reg(ident,f'{field} / {dummy} · quadratic evidence',f'Assess the squared term at 5%. Describe curvature and calculate the local slope at X={chosen:.12g}. Is the turning point inside the observed X range?',prefix+'q',evidence(mq['coefficients'][2]['pValue'])+f' The fitted curve is '+('concave' if b[2]<0 else 'convex')+f'. Local slope c₁+2c₂X = {slope:.9g} dollars per X unit. Turning point -c₁/(2c₂) = {turning:.9g}, '+('inside' if x.min()<=turning<=x.max() else 'outside')+' the observed range. The linear coefficient alone is the slope at X=0, not a constant slope.','Quadratic interpretation')
    mi=fit(prefix+'i',np.column_stack([ones,x,g,x*g]),['Intercept','X: '+label,'D: '+one,'X × D'],'d₀ + d₁ × X + d₂ × D + d₃ × X × D',desc);b=mi['b'];ident=f'rC{number:02d}I';ids.append(ident)
    answer=f'D=0 ({zero}): intercept {b[0]:.9g}, X slope {b[1]:.9g}. D=1 ({one}): intercept {b[0]+b[2]:.9g}, X slope {b[1]+b[3]:.9g}. D coefficient {b[2]:.9g} is the group difference at X=0. Interaction {b[3]:.9g} is the difference in slopes. At X={chosen:.12g}, the D=1 minus D=0 gap is d₂+d₃X = {b[2]+b[3]*chosen:.9g} dollars. '+('Zero is outside the observed X range, so zero-input intercept comparisons involve extrapolation. ' if not x.min()<=0<=x.max() else '')+'Interaction '+evidence(mi['coefficients'][3]['pValue'])+' A test of this interaction alone is not a test of every combined group effect; combined-effect inference requires coefficient covariance.'
    reg(ident,f'{field} / {dummy} · explain all interaction terms',f'Interpret all four coefficients and write the D=0 and D=1 equations. Compare slopes and the group gap at X={chosen:.12g}. Assess the interaction p-value and discuss X=0.',prefix+'i',answer,'Interaction interpretation')
    regsets.append({'id':f'RC{number:02d}','title':field+' and '+dummy+' · four-model interpretation','type':'regression','seconds':300,'ids':ids,'desc':'Prediction, continuous/dummy interpretation, quadratic evidence and all interaction coefficients. Four separately fitted models.'})

# A reproducible catalogue of 800 distinct manipulation combinations (98 retained).
base=json.loads((D/'library-extra.js').read_text().split('=',1)[1].rstrip().rstrip(';'))
workbook_pools=defaultdict(list)
for q in base['questions']+questions:
    if q['kind']=='Excel':workbook_pools[q['files'][0]].append(q['id'])
sqlpools={name:[q['id'] for q in base['exercises'].get(name,[])+exercises[name]] for name in dbs}
randomizer=random.Random(20261112);combinations=[];seen=set();files=list(workbook_pools)
# Ensure every new workbook question is represented, including single-question import sources.
for file,ids in workbook_pools.items():
    if len(ids)<3:continue
    for offset in range(0,len(ids),3):
        picked=[ids[(offset+j)%len(ids)] for j in range(3)];name=list(sqlpools)[len(combinations)%len(sqlpools)];pair=randomizer.sample(sqlpools[name],2)
        combinations.append((file,name,picked+pair));seen.add(tuple(sorted(picked+pair)))
for name,items in exercises.items():
    ids=[q['id'] for q in items]
    for offset in range(0,len(ids),2):
        pair=[ids[offset],ids[(offset+1)%len(ids)]]
        file='materials/film.xlsx';picked=randomizer.sample(workbook_pools[file],3)
        signature=tuple(sorted(picked+pair))
        if signature not in seen:
            seen.add(signature);combinations.append((file,name,picked+pair))
while len(combinations)<702:
    file=files[len(combinations)%len(files)];pool=workbook_pools[file]
    if len(pool)<3:
        # Import question plus two tasks from the corresponding workbook.
        main='materials/'+({'film-import.zip':'film.xlsx','film.txt':'film.xlsx','payroll2015.csv':'payroll2015.xlsx','payroll2016.csv':'payroll2016.xlsx'}[file.split('/')[-1]])
        picked=pool+randomizer.sample(workbook_pools[main],2)
    else:picked=randomizer.sample(pool,3)
    name=list(sqlpools)[len(combinations)%len(sqlpools)];pair=randomizer.sample(sqlpools[name],2);signature=tuple(sorted(picked+pair))
    if signature in seen:continue
    seen.add(signature);combinations.append((file,name,picked+pair))
sets=[{'id':f'MC{i+1:03d}','title':file.split('/')[-1].split('.')[0]+' + '+name+f' · mix {i+1}','type':'manipulation','seconds':480,'ids':ids,'desc':'Three Excel tasks and two SQL tasks. Use the listed source files and preserve the requested row definitions.'} for i,(file,name,ids) in enumerate(combinations)]+regsets
datasets={'pcards-periods':{'name':'P-cards · 2011–2014 monthly sample','file':'assets/pcards-periods.db','meta':'Four-year monthly sample','source':'Up to 100 source records per year/month, 2011–2014, ordered by ID; all agencies eligible. Results apply only to this sample.','schema':{'pcards':'ID INTEGER · FullName TEXT · AgencyName TEXT · Year INTEGER · Month INTEGER · Amount REAL · Vendor TEXT · TransactionDate TEXT'}}}
payload={'datasets':datasets,'questions':questions,'exercises':dict(exercises),'models':models,'examSets':sets,'materials':materials}
(D/'coverage-extra.js').write_text('globalThis.COURSE_COVERAGE = '+json.dumps(payload,ensure_ascii=False,allow_nan=False)+';\n')
(ROOT/'coverage-checks.json').write_text(json.dumps(refs,ensure_ascii=False,allow_nan=False))
for db in dbs.values():db.close()
print(json.dumps({'Excel':sum(q['kind']=='Excel' for q in questions),'SQL':sum(map(len,exercises.values())),'Regression':120,'newSets':len(sets),'fittedModels':len(models)}))
