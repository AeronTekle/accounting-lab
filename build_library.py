"""Build additional practice variants from the published course files.
Run after build_course_content.py and before build_catalog.cjs.
SQL results are cross-checked against pandas calculations before writing.
"""
from pathlib import Path
import json, sqlite3, math
from collections import defaultdict
import pandas as pd

ROOT=Path(__file__).resolve().parent
DIST=ROOT/'dist'
practice=json.loads((DIST/'assets/practice.json').read_text())
questions=[]
exercises=defaultdict(list)
checks={}
connections={}
frames={}

def table(dataset,name):
    key=(dataset,name)
    if key not in frames:
        frames[key]=pd.read_sql_query('SELECT * FROM "'+name+'"',connections[dataset])
    return frames[key].copy()

def values(frame):
    return [[None if pd.isna(value) else value.item() if hasattr(value,'item') else value for value in row] for row in frame.itertuples(index=False,name=None)]

def compare(actual,expected,ordered):
    assert len(actual)==len(expected),(len(actual),len(expected))
    if not ordered:
        actual=sorted(actual,key=lambda row:json.dumps(row,ensure_ascii=False))
        expected=sorted(expected,key=lambda row:json.dumps(row,ensure_ascii=False))
    for left,right in zip(actual,expected):
        assert len(left)==len(right)
        for a,b in zip(left,right):
            if isinstance(a,(float,int)) and isinstance(b,(float,int)):
                assert math.isclose(a,b,rel_tol=1e-8,abs_tol=1e-7),(a,b)
            else:assert a==b,(a,b)

def sqlq(dataset,title,prompt,sql,expected,skill,ordered=True):
    number=len(exercises[dataset])+101
    ident={'songs':'sx','chinook':'cx','movies':'mx','pcards':'ax'}[dataset]+str(number)
    cursor=connections[dataset].execute(sql)
    rows=[list(row) for row in cursor.fetchall()]
    compare(rows,expected,ordered)
    assert rows,ident
    exercises[dataset].append({'id':ident,'title':title,'desc':prompt,'answer':sql,'starter':'SELECT\n-- Write your query here','hint':skill+'. Check the requested output columns and sorting.','skill':skill,'ordered':ordered,'explain':'Use the downloadable '+dataset+' practice database for this answer.','expanded':True})
    checks[ident]={'dataset':dataset,'columns':[field[0] for field in cursor.description],'rows':rows}

def quote(value):return "'"+str(value).replace("'","''")+"'"

for dataset,file in [('songs','songs.db'),('chinook','chinook.sqlite'),('movies','movies-practice.db'),('pcards','pcards-practice.db')]:
    connections[dataset]=sqlite3.connect('file:'+str(DIST/'assets'/file)+'?mode=ro',uri=True)

# Songs. Forty variants of selection, aggregation, grouping and joins.
songs=table('songs','songs');artists=table('songs','artists')
joined=songs.merge(artists,left_on='artist_id',right_on='id',suffixes=('_song','_artist'))
for t in [.25,.35,.45,.55,.65]:
    filtered=songs[songs.energy>t]
    sqlq('songs',f'Rank songs with energy above {t}',f'Return name and energy where energy is strictly above {t}. Sort by energy descending, then song ID ascending.',f'SELECT name,energy FROM songs WHERE energy>{t} ORDER BY energy DESC,id;',values(filtered.sort_values(['energy','id'],ascending=[False,True])[['name','energy']]),'WHERE · ORDER BY')
    sqlq('songs',f'Count and average energetic songs above {t}',f'Return the count of songs with energy above {t} and their average duration_ms, in that order.',f'SELECT COUNT(*),AVG(duration_ms) FROM songs WHERE energy>{t};',[[len(filtered),float(filtered.duration_ms.mean())]],'COUNT · AVG',False)
    grouped=filtered.groupby('artist_id').size().reset_index(name='SongCount');grouped=grouped[grouped.SongCount>=2].sort_values(['SongCount','artist_id'],ascending=[False,True])
    sqlq('songs',f'Group energetic songs above {t}',f'Return artist_id and song count for songs with energy above {t}. Keep artists with at least two qualifying songs. Sort by count descending, then artist_id.',f'SELECT artist_id,COUNT(*) AS SongCount FROM songs WHERE energy>{t} GROUP BY artist_id HAVING COUNT(*)>=2 ORDER BY SongCount DESC,artist_id;',values(grouped),'GROUP BY · HAVING')
    data=joined[joined.energy>t].sort_values(['energy','id_song'],ascending=[False,True])
    sqlq('songs',f'Join artist names for energy above {t}',f'Return song name, artist name and energy for songs with energy above {t}. Sort by energy descending, then song ID.',f'SELECT s.name,a.name,s.energy FROM songs s JOIN artists a ON a.id=s.artist_id WHERE s.energy>{t} ORDER BY s.energy DESC,s.id;',values(data[['name_song','name_artist','energy']]),'JOIN · WHERE')
for t in [80,100,120,140,160]:
    data=songs[songs.tempo>t]
    sqlq('songs',f'Average danceability above tempo {t}',f'Return the average danceability of songs with tempo strictly above {t}. Keep full precision.',f'SELECT AVG(danceability) FROM songs WHERE tempo>{t};',[[float(data.danceability.mean())]],'AVG · WHERE',False)
for t in [150000,180000,210000,240000,270000]:
    data=songs[songs.duration_ms>t].sort_values(['duration_ms','id'],ascending=[False,True])
    sqlq('songs',f'Rank songs longer than {t} ms',f'Return name and duration_ms for songs longer than {t} milliseconds. Sort by duration descending, then ID.',f'SELECT name,duration_ms FROM songs WHERE duration_ms>{t} ORDER BY duration_ms DESC,id;',values(data[['name','duration_ms']]),'WHERE · ORDER BY')
for t in [.2,.3,.4,.5,.6]:
    data=songs[(songs.danceability>t)&(songs.energy>t)&(songs.valence>t)].sort_values('id')
    sqlq('songs',f'Inspect three scores above {t}',f'Return name, danceability, energy and valence when all three scores are strictly above {t}. Sort by song ID.',f'SELECT name,danceability,energy,valence FROM songs WHERE danceability>{t} AND energy>{t} AND valence>{t} ORDER BY id;',values(data[['name','danceability','energy','valence']]),'WHERE · AND')
for artist in joined.name_artist.value_counts().head(5).index:
    data=joined[joined.name_artist==artist]
    sqlq('songs',f'Average tempo and energy for {artist}',f'Find {artist} by artist name and return average tempo and average energy, in that order. Keep full precision.',f'SELECT AVG(s.tempo),AVG(s.energy) FROM songs s JOIN artists a ON a.id=s.artist_id WHERE a.name={quote(artist)};',[[float(data.tempo.mean()),float(data.energy.mean())]],'JOIN · AVG',False)

# Chinook. Work at the invoice, customer, track and artist levels.
inv=table('chinook','Invoice');customers=table('chinook','Customer')
for country in ['USA','Canada','France','Brazil','Germany']:
    data=inv[inv.BillingCountry==country]
    sqlq('chinook',f'Invoice totals for {country}',f'Return invoice count and total invoice value for BillingCountry equal to {country}. Count each invoice once.',f'SELECT COUNT(*),SUM(Total) FROM Invoice WHERE BillingCountry={quote(country)};',[[len(data),float(data.Total.sum())]],'COUNT · SUM',False)
    selected=customers[customers.CustomerId.isin(data.CustomerId)].sort_values('CustomerId')
    sqlq('chinook',f'Customers billed in {country}',f'Return CustomerId, FirstName and LastName for customers with at least one invoice billed in {country}. Include each customer once and sort by CustomerId.',f'SELECT CustomerId,FirstName,LastName FROM Customer WHERE CustomerId IN (SELECT CustomerId FROM Invoice WHERE BillingCountry={quote(country)}) ORDER BY CustomerId;',values(selected[['CustomerId','FirstName','LastName']]),'SUBQUERY · DISTINCT IDS')
for n in [3,4,6,7,10]:
    data=inv.sort_values(['Total','InvoiceId'],ascending=[False,True]).head(n)
    sqlq('chinook',f'Top {n} invoices by value',f'Return InvoiceId and Total for the {n} highest-value invoices. Sort by Total descending, then InvoiceId ascending.',f'SELECT InvoiceId,Total FROM Invoice ORDER BY Total DESC,InvoiceId LIMIT {n};',values(data[['InvoiceId','Total']]),'ORDER BY · LIMIT')
for year in range(2009,2014):
    data=inv[pd.to_datetime(inv.InvoiceDate).dt.year==year]
    sqlq('chinook',f'Invoice activity in {year}',f'Return invoice count and sum of Total for invoices dated in {year}.',f"SELECT COUNT(*),SUM(Total) FROM Invoice WHERE InvoiceDate>='{year}-01-01' AND InvoiceDate<'{year+1}-01-01';",[[len(data),float(data.Total.sum())]],'DATE FILTER · SUM',False)
for customer in inv.groupby('CustomerId').Total.sum().sort_values(ascending=False).head(5).index:
    data=inv[inv.CustomerId==customer]
    sqlq('chinook',f'Invoice profile for customer {customer}',f'Return invoice count and average Total for CustomerId {customer}. Keep the average at full precision.',f'SELECT COUNT(*),AVG(Total) FROM Invoice WHERE CustomerId={customer};',[[len(data),float(data.Total.mean())]],'WHERE · AVG',False)
for threshold in [40,50,60,70,80]:
    data=inv.groupby('BillingCountry').Total.sum().reset_index();data=data[data.Total>threshold].sort_values(['Total','BillingCountry'],ascending=[False,True])
    sqlq('chinook',f'Countries billing above {threshold}',f'Return BillingCountry and total invoice value for countries whose total is strictly above {threshold}. Sort by total descending, then country.',f'SELECT BillingCountry,SUM(Total) AS Revenue FROM Invoice GROUP BY BillingCountry HAVING SUM(Total)>{threshold} ORDER BY Revenue DESC,BillingCountry;',values(data),'GROUP BY · HAVING')
tracks=table('chinook','Track');albums=table('chinook','Album');music_artists=table('chinook','Artist')
track_join=tracks[['TrackId','Name','AlbumId']].rename(columns={'Name':'TrackName'}).merge(albums[['AlbumId','Title','ArtistId']],on='AlbumId').merge(music_artists.rename(columns={'Name':'ArtistName'}),on='ArtistId')
for artist in track_join.ArtistName.value_counts().head(5).index:
    data=track_join[track_join.ArtistName==artist].sort_values('TrackId')
    sqlq('chinook',f'Tracks and albums by {artist}',f'Return track Name and album Title for artist {artist}. Sort by TrackId.',f'SELECT t.Name,al.Title FROM Track t JOIN Album al ON al.AlbumId=t.AlbumId JOIN Artist ar ON ar.ArtistId=al.ArtistId WHERE ar.Name={quote(artist)} ORDER BY t.TrackId;',values(data[['TrackName','Title']]),'THREE-TABLE JOIN')
for threshold in [5,10,15,20,23]:
    data=inv[inv.Total>threshold].sort_values(['Total','InvoiceId'],ascending=[False,True])
    sqlq('chinook',f'Invoices above {threshold}',f'Return InvoiceId and Total for invoices strictly above {threshold}. Sort by Total descending, then InvoiceId.',f'SELECT InvoiceId,Total FROM Invoice WHERE Total>{threshold} ORDER BY Total DESC,InvoiceId;',values(data[['InvoiceId','Total']]),'WHERE · ORDER BY')

# Movies. All answers use the existing 2,000-film course subset.
movies=table('movies','movies');ratings=table('movies','ratings');people=table('movies','people');stars=table('movies','stars');directors=table('movies','directors')
films=movies.merge(ratings,left_on='id',right_on='movie_id')
for year in [1995,2000,2005,2010,2015]:
    data=films[films.year==year]
    sqlq('movies',f'Titles released in {year}',f'Return title for films released in {year} in the subset, sorted by title and then film ID.',f'SELECT title FROM movies WHERE year={year} ORDER BY title,id;',values(movies[movies.year==year].sort_values(['title','id'])[['title']]),'WHERE · ORDER BY')
    sqlq('movies',f'Mean rating for {year}',f'Return the average rating of rated films released in {year} in the subset.',f'SELECT AVG(r.rating) FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE m.year={year};',[[float(data.rating.mean())]],'JOIN · AVG',False)
for minimum in [6,7,7.5,8,8.5]:
    sqlq('movies',f'Count ratings of at least {minimum}',f'Return the number of films rated at least {minimum} in the subset.',f'SELECT COUNT(*) FROM ratings WHERE rating>={minimum};',[[int((ratings.rating>=minimum).sum())]],'COUNT · INCLUSIVE FILTER',False)
for n in [3,4,6,8,10]:
    data=films.sort_values(['votes','id'],ascending=[False,True]).head(n)
    sqlq('movies',f'The {n} most-voted films',f'Return title and votes for the {n} films with the most votes. Sort by votes descending, then film ID.',f'SELECT m.title,r.votes FROM movies m JOIN ratings r ON r.movie_id=m.id ORDER BY r.votes DESC,m.id LIMIT {n};',values(data[['title','votes']]),'JOIN · LIMIT')
for decade in [1970,1980,1990,2000,2010]:
    data=movies[movies.year.between(decade,decade+4)].groupby('year').size().reset_index(name='n').sort_values('year')
    sqlq('movies',f'Releases by year, {decade}–{decade+4}',f'Return year and film count from {decade} through {decade+4}, inclusive. Sort by year.',f'SELECT year,COUNT(*) FROM movies WHERE year BETWEEN {decade} AND {decade+4} GROUP BY year ORDER BY year;',values(data),'BETWEEN · GROUP BY')
selected_films=films[films.title!='Inception'].sort_values(['votes','id'],ascending=[False,True]).head(5)
for row in selected_films.itertuples():
    eligible=directors.loc[directors.movie_id==row.id,'person_id']
    data=people[people.id.isin(eligible)].sort_values('id')
    sqlq('movies',f'Directors of {row.title}',f'Return director names for {row.title} ({row.year}). Include each person ID once and sort by person ID.',f'SELECT name FROM people WHERE id IN (SELECT d.person_id FROM directors d JOIN movies m ON m.id=d.movie_id WHERE m.id={row.id}) ORDER BY id;',values(data[['name']]),'SUBQUERY · RELATIONSHIPS')
    eligible=stars.loc[stars.movie_id==row.id,'person_id'];data=people[people.id.isin(eligible)].sort_values('id')
    sqlq('movies',f'Performers in {row.title}',f'Return performer names for {row.title} ({row.year}). Include each person ID once and sort by person ID.',f'SELECT name FROM people WHERE id IN (SELECT person_id FROM stars WHERE movie_id={row.id}) ORDER BY id;',values(data[['name']]),'SUBQUERY · RELATIONSHIPS')
for minimum in [100000,200000,300000,400000,500000]:
    data=films[films.votes>=minimum].sort_values(['rating','votes','id'],ascending=[False,False,True]).head(5)
    sqlq('movies',f'Top ratings with {minimum:,} votes',f'Return title, rating and votes for the five highest-rated films with at least {minimum:,} votes. Sort by rating descending, votes descending, then film ID.',f'SELECT m.title,r.rating,r.votes FROM movies m JOIN ratings r ON r.movie_id=m.id WHERE r.votes>={minimum} ORDER BY r.rating DESC,r.votes DESC,m.id LIMIT 5;',values(data[['title','rating','votes']]),'JOIN · ORDER BY')

# Purchasing cards. Signed amounts and audit flags are kept explicit.
cards=table('pcards','pcards')
vendors=cards.groupby('Vendor').size().sort_values(ascending=False).head(5).index
for vendor in vendors:
    data=cards[cards.Vendor==vendor]
    sqlq('pcards',f'Net spend at {vendor}',f'Return transaction count and net Amount for vendor {vendor} in the subset. Include credits.',f'SELECT COUNT(*),SUM(Amount) FROM pcards WHERE Vendor={quote(vendor)};',[[len(data),float(data.Amount.sum())]],'WHERE · NET SUM',False)
    credits=data[data.Amount<0]
    sqlq('pcards',f'Credits at {vendor}',f'Return the number of negative transactions and their total Amount for vendor {vendor}. If there are no credits, retain the NULL returned by SUM.',f'SELECT COUNT(*),SUM(Amount) FROM pcards WHERE Vendor={quote(vendor)} AND Amount<0;',[[len(credits),float(credits.Amount.sum()) if len(credits) else None]],'WHERE · COUNT · SUM',False)
for threshold in [100,500,1000,2000,3000]:
    data=cards[cards.Amount>threshold]
    sqlq('pcards',f'Purchases above {threshold}',f'Return transaction count and sum of Amount for purchases strictly above {threshold}. Treat the threshold as a review flag.',f'SELECT COUNT(*),SUM(Amount) FROM pcards WHERE Amount>{threshold};',[[len(data),float(data.Amount.sum())]],'COUNT · SUM',False)
for n in [3,4,6,8,10]:
    data=cards[cards.Amount<0].sort_values(['Amount','ID']).head(n)
    sqlq('pcards',f'The {n} largest credits',f'Return ID, Vendor and Amount for the {n} most negative amounts. Sort by Amount ascending, then ID.',f'SELECT ID,Vendor,Amount FROM pcards WHERE Amount<0 ORDER BY Amount,ID LIMIT {n};',values(data[['ID','Vendor','Amount']]),'WHERE · ORDER BY · LIMIT')
holders=cards.groupby(['CardholderLastName','CardholderFirstInitial']).size().sort_values(ascending=False).head(5).index
for last,initial in holders:
    data=cards[(cards.CardholderLastName==last)&(cards.CardholderFirstInitial==initial)].sort_values('ID')
    sqlq('pcards',f'Charges for {last}, {initial}',f'Return ID, Vendor and Amount for CardholderLastName {last} and CardholderFirstInitial {initial}. Sort by ID. The two name fields define the requested filter. Investigate identity separately when reviewing exceptions.',f'SELECT ID,Vendor,Amount FROM pcards WHERE CardholderLastName={quote(last)} AND CardholderFirstInitial={quote(initial)} ORDER BY ID;',values(data[['ID','Vendor','Amount']]),'WHERE · AND')
for minimum in [2,3,4,5,10]:
    data=cards.groupby('Vendor').size().reset_index(name='n');data=data[data.n>=minimum].sort_values(['n','Vendor'],ascending=[False,True])
    sqlq('pcards',f'Vendors with at least {minimum} charges',f'Return Vendor and transaction count for vendors with at least {minimum} transactions. Sort by count descending, then Vendor.',f'SELECT Vendor,COUNT(*) AS n FROM pcards GROUP BY Vendor HAVING COUNT(*)>={minimum} ORDER BY n DESC,Vendor;',values(data),'GROUP BY · HAVING')
for mcc in cards.MCC.value_counts().head(5).index:
    data=cards[cards.MCC==mcc].groupby('Vendor').Amount.sum().reset_index().sort_values(['Amount','Vendor'],ascending=[False,True])
    sqlq('pcards',f'Vendor totals in {mcc}',f'Return Vendor and net Amount for MCC {mcc}. Include credits. Sort by net amount descending, then Vendor.',f'SELECT Vendor,SUM(Amount) AS NetAmount FROM pcards WHERE MCC={quote(mcc)} GROUP BY Vendor ORDER BY NetAmount DESC,Vendor;',values(data),'WHERE · GROUP BY')
for ceiling in [5,10,25,50,100]:
    data=cards[(cards.Amount>0)&(cards.Amount<=ceiling)].sort_values(['Amount','ID'],ascending=[False,True]).head(5)
    sqlq('pcards',f'Largest small purchases up to {ceiling}',f'Return ID, Vendor and Amount for the five largest positive purchases no greater than {ceiling}. Sort by Amount descending, then ID.',f'SELECT ID,Vendor,Amount FROM pcards WHERE Amount>0 AND Amount<={ceiling} ORDER BY Amount DESC,ID LIMIT 5;',values(data[['ID','Vendor','Amount']]),'WHERE · ORDER BY · LIMIT')

# Workbook questions use source-column names, a method and a numeric or text answer.
def workbookq(prefix,title,prompt,file,category,value,method,criteria,precision=2):
    ident=prefix+str(101+sum(q['id'].startswith(prefix) for q in questions))
    numeric=isinstance(value,(int,float)) and not isinstance(value,bool)
    displayed=f'{value:,.{precision}f}' if numeric and precision else f'{value:,}' if numeric else str(value)
    question={'id':ident,'title':title,'kind':'Excel','category':category,'prompt':prompt,'files':['materials/'+file],'answer':displayed+'. '+method,'hint':method,'checks':criteria,'expected':value if numeric else None,'expanded':True,'sourceFile':'materials/'+file}
    if numeric:question['tolerance']=0 if precision==0 else .5*10**(-precision)+1e-8
    questions.append(question)

film=pd.read_excel(DIST/'materials/film.xlsx',keep_default_na=False)
shoot=film[film.EventType=='Shooting Permit'].copy()
shoot['duration']=((pd.to_datetime(shoot.EndDateTime)-pd.to_datetime(shoot.StartDateTime)).dt.total_seconds()/3600)
boroughs=['Bronx','Brooklyn','Manhattan','Queens','Staten Island']
for borough in boroughs:
    all_rows=film[film.Borough==borough];data=shoot[shoot.Borough==borough]
    specs=[('All permit records',len(all_rows),0,'Count records with Borough equal to the requested borough.'),('Shooting permit count',len(data),0,'Count records matching both Borough and EventType = Shooting Permit.'),('Other permit count',len(all_rows)-len(data),0,'Count borough records whose EventType differs from Shooting Permit.'),('Mean shooting duration',float(data.duration.mean()),2,'Filter the borough and Shooting Permit, calculate (EndDateTime-StartDateTime)*24 and average the unrounded durations.'),('Longest shooting duration',float(data.duration.max()),2,'Filter the borough and Shooting Permit, calculate durations in hours and take MAX.'),('Earliest shooting start',pd.to_datetime(data.StartDateTime).min().strftime('%Y-%m-%d %H:%M'),None,'Filter the borough and Shooting Permit, then take MIN of StartDateTime and display date and time.'),('Shooting share of permits',100*len(data)/len(all_rows),2,'Divide shooting permits by all permits for the same borough and multiply by 100.'),('Top shooting category',str(data.Category.value_counts().index[0])+' ('+str(data.Category.value_counts().iloc[0])+' records)',None,'Filter the borough and Shooting Permit, group by Category, count records and sort descending.')]
    for label,value,precision,method in specs:
        unit=' Report a percentage number, for example 25 for 25%.' if label=='Shooting share of permits' else ' Give durations in hours.' if 'duration' in label.lower() else ''
        workbookq('fx',label+' — '+borough,f'Using NYC Film Permits, find {label.lower()} for {borough}.{unit} '+('Report numeric results to two decimals.' if precision==2 else 'Exclude the header from record counts.'),'film.xlsx','NYC Film Permits',value,method,['Use the specified borough','Apply the requested event-type filter','Use the correct unit'],precision or 0)
for year in range(2012,2018):
    data=shoot[pd.to_datetime(shoot.StartDateTime).dt.year==year]
    for label,value,precision,method in [('Shooting count',len(data),0,'Filter EventType to Shooting Permit and StartDateTime to the requested calendar year. Count records.'),('Brooklyn shooting count',int((data.Borough=='Brooklyn').sum()),0,'Apply the event-type, start-year and Brooklyn filters together.'),('Mean shooting duration',float(data.duration.mean()),2,'Filter the shooting permits by start year and average (EndDateTime-StartDateTime)*24.'),('Longest shooting duration',float(data.duration.max()),2,'Filter shooting permits by start year and take the maximum duration in hours.'),('Top shooting category',str(data.Category.value_counts().index[0]),None,'Filter shooting permits by start year, group by Category and count records.')]:
        workbookq('fx',label+' — '+str(year),f'Find {label.lower()} among permits starting in {year}. Use StartDateTime for the year. '+('Report hours to two decimals.' if precision==2 else ''),'film.xlsx','NYC Film Permits',value,method,['Use the start year','Keep the Shooting Permit filter','Count records or calculate hours as requested'],precision or 0)
for borough in boroughs:
    data=shoot[shoot.Borough==borough]
    for category in ['Television','Film']:
        count=int((data.Category==category).sum())
        workbookq('fx',category+' shooting count — '+borough,f'Count Shooting Permit records in {borough} whose Category is {category}.','film.xlsx','NYC Film Permits',count,'Apply Borough, EventType and Category criteria together, using COUNTIFS or a filtered pivot table.',['Use three conditions','Count records','Retain source data'],0)
        workbookq('fx',category+' share of shooting permits — '+borough,f'What percentage of Shooting Permit records in {borough} belong to Category {category}? Enter a percentage number to two decimals.','film.xlsx','NYC Film Permits',100*count/len(data),'Divide the category count by all shooting permits in the same borough and multiply by 100.',['Use the same borough in numerator and denominator','Keep the shooting-only denominator','Report a percentage number'])

p15=pd.read_excel(DIST/'materials/payroll2015.xlsx');p16=pd.read_excel(DIST/'materials/payroll2016.xlsx')
p15['gross']=p15.Reg_Pay.fillna(0)+p15.OT_Pay.fillna(0);p15['hours']=p15.Reg_Hrs.fillna(0)+p15.OT_Hrs.fillna(0);p16['hours']=p16.Hours.fillna(0)+p16.OT_Hours.fillna(0)
for month in range(1,7):
    data=p15[pd.to_datetime(p15.Pay_Date).dt.month==month]
    for label,value,method in [('Gross wages',float(data.gross.sum()),'Sum Reg_Pay and OT_Pay for the filtered Pay_Date month.'),('Total hours',float(data.hours.sum()),'Sum Reg_Hrs and OT_Hrs for the filtered Pay_Date month.'),('Overtime pay',float(data.OT_Pay.sum()),'Sum OT_Pay for the filtered Pay_Date month.'),('Overtime share of hours',100*float(data.OT_Hrs.sum())/data.hours.sum(),'Divide overtime hours by regular plus overtime hours for the month and multiply by 100.'),('Gross wages per hour',float(data.gross.sum()/data.hours.sum()),'Divide total gross wages by total regular and overtime hours for that month.')]:
        workbookq('px',label+f' — 2015 month {month}',f'Calculate {label.lower()} for month {month} of 2015 using Pay_Date. Include all source rows for that month. '+('Enter a percentage number.' if 'share' in label else 'Report to two decimals.'),'payroll2015.xlsx','IntegrateCo',value,method,['Filter Pay_Date correctly','Include overtime where relevant','Use totals before taking a ratio'])
for code in p15.groupby('Job').size().sort_values(ascending=False).head(10).index:
    data=p15[p15.Job==code]
    for label,value,method in [('Gross wages',float(data.gross.sum()),'Filter Job to the stated code, then sum Reg_Pay + OT_Pay.'),('Total hours',float(data.hours.sum()),'Filter Job to the stated code and sum Reg_Hrs + OT_Hrs.'),('Gross wages per hour',float(data.gross.sum()/data.hours.sum()) if data.hours.sum()!=0 else 'Undefined because total hours are zero','Filter the Job code, then divide total gross wages by total regular and overtime hours.')]:
        workbookq('px',label+' — Job '+str(code),f'Calculate {label.lower()} for Job {code} in the 2015 extract. Use all six months. Report numeric results to two decimals and explain if a zero-hours denominator prevents a rate.','payroll2015.xlsx','IntegrateCo',value,method,['Use the Job column','Retain all six months','Include regular and overtime components'])
for project in p16.groupby('Project').Gross_Wages.sum().sort_values(ascending=False).head(4).index:
    data=p16[p16.Project==project]
    for label,value,method,precision in [('Gross wages',float(data.Gross_Wages.sum()),'Filter Project and sum Gross_Wages. This field already includes overtime.',2),('Total hours',float(data.hours.sum()),'Filter Project and sum Hours plus OT_Hours.',2),('Missing employee numbers',int(data.Employee_Number.isna().sum()),'Filter Project, then count missing Employee_Number cells. Employee_ID is a different field.',0)]:
        workbookq('ix',label+' — Project '+str(project),f'Find {label.lower()} for Project {project} in the 2016 extract. '+('Report to two decimals.' if precision else 'Return a record count.'),'payroll2016.xlsx','IntegrateCo',value,method,['Filter Project correctly','Use the requested field','Keep source rows'],precision)
employees=pd.read_excel(DIST/'materials/etl-case3.xlsx',sheet_name='Case 3 data')
selected_codes=[employees.EmployeeCode.iloc[1],employees.loc[employees.EmployeeCode.str.contains(r'-\d{2}'),'EmployeeCode'].iloc[0],employees.loc[employees.EmployeeCode.str.endswith('W'),'EmployeeCode'].iloc[0]]
for code in selected_codes:
    tail=code.split('-')[1];digits=''.join(c for c in tail if c.isdigit());frequency='Monthly' if tail.endswith(('M','Mo')) else 'Weekly'
    workbookq('ex','Plant ID in '+code,f'Find EmployeeCode {code} in Case 3 data and extract its plant ID as a number.','etl-case3.xlsx','Employee codes · ETL',int(digits),'Locate the hyphen and isolate the plant digits before the frequency suffix. Convert the extracted digits to a number.',['Use the code in the source','Allow variable prefix lengths','Return a number'],0)
    workbookq('ex','Pay frequency in '+code,f'Classify EmployeeCode {code} as Monthly or Weekly.','etl-case3.xlsx','Employee codes · ETL',frequency,'Inspect the suffix. M and Mo mean Monthly, while W and We mean Weekly.',['Read the suffix','Handle one- and two-letter suffixes','Use the requested labels'],0)
journal=pd.ExcelFile(DIST/'materials/journal.xlsx');lines=pd.read_excel(journal,'JELineItems');units=pd.read_excel(journal,'BusinessUnits');accounts=pd.read_excel(journal,'ChartOfAccounts')
for index in lines.drop_duplicates('BusinessUnitID').index[:3]:
    row=lines.iloc[index];unit=units.set_index('BusinessUnitID').loc[row.BusinessUnitID,'BusinessUnit'];account=accounts.set_index('GLAccountNumber').loc[row.GLAccountNumber,'GLAccountName']
    for field,value,key,reference in [('BusinessUnit',unit,'BusinessUnitID','BusinessUnits'),('GLAccountName',account,'GLAccountNumber','ChartOfAccounts')]:
        workbookq('jx',field+f' for journal worksheet row {index+2}',f'For worksheet row {index+2} in JELineItems, find {field} from the reference sheets. The header is row 1.','journal.xlsx','ETL Case 4',str(value),f'Use {key} to look up the value in {reference}. Preserve the original journal line.',['Use the specified worksheet row','Match by '+key,'Keep the journal line'],0)

# Twenty-four additional regression calculations use the six existing fitted models.
def regression(title,prompt,model,value,method,precision=2):
    ident='r'+str(101+sum(q['kind']=='Regression' for q in questions))
    questions.append({'id':ident,'title':title,'kind':'Regression','category':'Restaurant','prompt':prompt,'model':model,'files':['materials/restaurant.xlsm'],'answer':f'{value:,.{precision}f}. '+method,'hint':method,'checks':['Use the specified model','Match inputs to their coefficients','Explain the result in context'],'expected':float(value),'tolerance':.5*10**(-precision)+1e-8,'expanded':True})
models=practice['models'];b=models['temperature']['b']
for temperature in range(30,90,5):
    regression(f'Temperature prediction at {temperature}°F',f'Use the temperature model to predict daily sales at {temperature}°F. Give dollars to two decimals.','temperature',b[0]+temperature*b[1],'Add the intercept and the temperature coefficient multiplied by the Fahrenheit input.')
b=models['interaction']['b']
for lag in [2500,3500,4500]:
    for game in [0,1]:
        regression(f'Interaction prediction — L {lag}, G {game}',f'Use the interaction model with L={lag} and G={game}. Predict sales in dollars to two decimals.','interaction',b[0]+b[1]*lag+b[2]*game+b[3]*lag*game,'Include the intercept, L term, game indicator and L×G interaction.')
b=models['quadratic']['b']
for temperature in [35,45,55,65,75,85]:
    regression(f'Local temperature slope at {temperature}°F',f'Use the squared-temperature model to calculate the local slope at {temperature}°F. Give dollars per degree Fahrenheit to four decimals.','quadratic',b[1]+2*b[2]*temperature,'The local slope equals the linear coefficient plus twice the squared coefficient times the temperature.',4)

assert {key:len(value) for key,value in exercises.items()}=={'songs':40,'chinook':40,'movies':40,'pcards':40}
assert sum(q['kind']=='Excel' for q in questions)==174
assert sum(q['kind']=='Regression' for q in questions)==24
# Each new manipulation set combines one workbook with one SQL database.
workbook_groups=defaultdict(list)
for q in questions:
    if q['kind']=='Excel':workbook_groups[q['files'][0]].append(q['id'])
triples=[]
for ids in workbook_groups.values():
    assert len(ids)%3==0
    triples.extend(ids[i:i+3] for i in range(0,len(ids),3))
pairs=[(dataset,[q['id'] for q in items[i:i+2]]) for dataset,items in exercises.items() for i in range(0,len(items),2)]
exams=[]
for index,(dataset,pair) in enumerate(pairs):
    excel_ids=triples[index%len(triples)];first=next(q for q in questions if q['id']==excel_ids[0])
    exams.append({'id':'M'+str(101+index),'title':first['category']+' and '+dataset.title()+f' · set {index+1}','type':'manipulation','seconds':480,'ids':excel_ids+pair,'desc':'Three workbook questions and two SQL questions from the downloadable course files.'})
regs=[q['id'] for q in questions if q['kind']=='Regression']
for index in range(0,len(regs),4):
    exams.append({'id':'R'+str(101+index//4),'title':'Restaurant model calculations · set '+str(index//4+1),'type':'regression','seconds':300,'ids':regs[index:index+4],'desc':'Calculate predictions or slopes from the verified restaurant models.'})
payload={'exercises':dict(exercises),'questions':questions,'examSets':exams}
(DIST/'library-extra.js').write_text('globalThis.LIBRARY_EXTRA = '+json.dumps(payload,ensure_ascii=False,allow_nan=False)+';\n')
(ROOT/'library-checks.json').write_text(json.dumps(checks,ensure_ascii=False,allow_nan=False))
for db in connections.values():db.close()
print(json.dumps({'new_SQL':sum(map(len,exercises.values())),'new_Excel':174,'new_regression':24,'new_timed_sets':len(exams)}))
