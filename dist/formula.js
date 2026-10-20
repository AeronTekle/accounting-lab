/* A bounded Excel-style expression interpreter. No eval or generated JavaScript. */
(function(root){
const functions=['LEFT','RIGHT','MID','LEN','FIND','SEARCH','IF','IFERROR','AND','OR','NOT','CONCATENATE','TRIM','UPPER','LOWER','VALUE','ROUND','SUM','AVERAGE','COUNT','MIN','MAX'];
function compileFormula(input){
 const src=input.trim().replace(/^=/,''); if(!src)throw Error('Skriv en formel først.');if(src.length>2000)throw Error('Formlen er for lang.');
 let pos=0,tokens=[];
 while(pos<src.length){
  if(/\s/.test(src[pos])){pos++;continue;}
  let m=src.slice(pos).match(/^"(?:[^"]|"")*"/);
  if(m){tokens.push({type:'literal',value:m[0].slice(1,-1).replace(/""/g,'"')});pos+=m[0].length;continue;}
  m=src.slice(pos).match(/^\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/);
  if(m){tokens.push({type:'literal',value:Number(m[0])});pos+=m[0].length;continue;}
  m=src.slice(pos).match(/^\$?[A-Za-z]+\$?\d+\b/);
  if(m){tokens.push({type:'ref',value:m[0].toUpperCase()});pos+=m[0].length;continue;}
  m=src.slice(pos).match(/^[A-Za-z_][A-Za-z_0-9]*/);
  if(m){tokens.push({type:'id',value:m[0].toUpperCase()});pos+=m[0].length;continue;}
  m=src.slice(pos).match(/^(?:<=|>=|<>|[=<>+*/&(),;:\-])/);
  if(m){tokens.push({type:'op',value:m[0]===';'?',':m[0]});pos+=m[0].length;continue;}
  throw Error('Ukendt tegn ved position '+(pos+1)+'. Brug engelske funktionsnavne og punktum som decimaltegn.');
 }
 let i=0,depth=0;const peek=()=>tokens[i]?.value;const take=()=>tokens[i++];
 function expect(x){if(tokens[i]?.type!=='op'||peek()!==x)throw Error('Forventede '+x+'.');i++;}
 function primary(){
  if(++depth>60)throw Error('For mange indlejrede udtryk.');let n,t=take();if(!t)throw Error('Formlen slutter for tidligt.');
  if(t.type==='literal')n={kind:'value',value:t.value};
  else if(t.type==='ref'){n={kind:'ref',value:t.value};if(peek()===':'){i++;const end=take();if(end?.type!=='ref')throw Error('Et område skal slutte med en cellereference.');n={kind:'range',start:t.value,end:end.value};}}
  else if(t.value==='('){n=compare();expect(')');}
  else if(t.type==='id'){
   if(t.value==='TRUE'||t.value==='FALSE')n={kind:'value',value:t.value==='TRUE'};
   else{if(!functions.includes(t.value))throw Error('Funktionen '+t.value+' understøttes ikke. Se funktionshjælpen.');expect('(');let args=[];if(!(tokens[i]?.type==='op'&&peek()===')')){do{args.push(compare());if(tokens[i]?.type!=='op'||peek()!==',')break;i++;}while(true);}expect(')');n={kind:'call',name:t.value,args};}
  }else throw Error('Forventede et tal, en tekst, en celle eller en funktion.');depth--;return n;
 }
 function unary(){if(tokens[i]?.type==='op'&&(peek()==='-'||peek()==='+')){const op=take().value;return {kind:'unary',op,arg:unary()};}return primary();}
 function binary(next,ops){let n=next();while(tokens[i]?.type==='op'&&ops.includes(peek())){const op=take().value;n={kind:'binary',op,left:n,right:next()};}return n;}
 const mult=()=>binary(unary,['*','/']),add=()=>binary(mult,['+','-']),concat=()=>binary(add,['&']),compare=()=>binary(concat,['=','<>','<','>','<=','>=']);
 const ast=compare();if(i<tokens.length)throw Error('Uventet indhold efter formlen.');return ast;
}
function calculate(ast,data,offset=0){
 const num=x=>{if(x===''||x===null)return 0;if(typeof x==='number'&&Number.isFinite(x))return x;if(typeof x==='boolean')return +x;if(typeof x==='string'&&x.trim()!==''&&Number.isFinite(Number(x)))return Number(x);throw Error('#VALUE! Forventede et tal.');};
 const text=x=>x===null?'':String(x);
 function ref(s){const m=s.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);let col=0;for(const c of m[2])col=col*26+c.charCodeAt(0)-64;return {col:col-1,row:Number(m[4])+(m[3]?0:offset)};}
 function cell(r){if(r.col<0||r.col>=data.headers.length||r.row<1||r.row>data.rows.length+1)throw Error('#REF! Cellen ligger uden for datasættet.');return r.row===1?data.headers[r.col]:data.rows[r.row-2][r.col]??'';}
 function value(n){
  if(n.kind==='value')return n.value;
  if(n.kind==='ref')return cell(ref(n.value));
  if(n.kind==='range'){let a=ref(n.start),b=ref(n.end);if(a.row>b.row||a.col>b.col)throw Error('#REF! Området er vendt forkert.');if((b.row-a.row+1)*(b.col-a.col+1)>40000)throw Error('Området er for stort.');let out=[];for(let r=a.row;r<=b.row;r++)for(let c=a.col;c<=b.col;c++)out.push(cell({row:r,col:c}));return out;}
  if(n.kind==='unary')return (n.op==='-'?-1:1)*num(value(n.arg));
  if(n.kind==='binary'){
   const a=value(n.left),b=value(n.right);if(Array.isArray(a)||Array.isArray(b))throw Error('Brug SUM eller en anden funktion omkring et område.');
   switch(n.op){case '&':return text(a)+text(b);case '+':return num(a)+num(b);case '-':return num(a)-num(b);case '*':return num(a)*num(b);case '/':if(num(b)===0)throw Error('#DIV/0! Division med nul.');return num(a)/num(b);}
   const aa=typeof a==='string'?a.toLowerCase():a,bb=typeof b==='string'?b.toLowerCase():b;
   switch(n.op){case '=':return aa===bb;case '<>':return aa!==bb;case '<':return aa<bb;case '>':return aa>bb;case '<=':return aa<=bb;case '>=':return aa>=bb;}
  }
  const name=n.name;const count=(min,max=min)=>{if(n.args.length<min||n.args.length>max)throw Error(name+' har et forkert antal argumenter.');};
  if(name==='IF'){count(2,3);return value(n.args[0])?value(n.args[1]):n.args[2]?value(n.args[2]):false;}
  if(name==='IFERROR'){count(2);try{return value(n.args[0]);}catch{return value(n.args[1]);}}
  const a=n.args.map(value),flat=a.flat();
  switch(name){
   case 'LEFT':case 'RIGHT':{count(1,2);let k=a.length===2?Math.trunc(num(a[1])):1;if(k<0)throw Error('#VALUE! Antal tegn skal være positivt.');return name==='LEFT'?text(a[0]).slice(0,k):k?text(a[0]).slice(-k):'';}
   case 'MID':{count(3);let start=Math.trunc(num(a[1])),len=Math.trunc(num(a[2]));if(start<1||len<0)throw Error('#VALUE! MID starter ved 1 og kræver et positivt antal tegn.');return text(a[0]).slice(start-1,start-1+len);}
   case 'LEN':count(1);return text(a[0]).length;
   case 'FIND':case 'SEARCH':{count(2,3);let s=a.length===3?Math.trunc(num(a[2])):1;let needle=text(a[0]),hay=text(a[1]);if(s<1||s>hay.length+1)throw Error('#VALUE! Ugyldig startposition.');if(name==='SEARCH'){if(/[?*~]/.test(needle))throw Error('SEARCH understøtter ikke jokertegn her.');needle=needle.toLowerCase();hay=hay.toLowerCase();}let idx=hay.indexOf(needle,s-1);if(idx<0)throw Error('#VALUE! Teksten blev ikke fundet.');return idx+1;}
   case 'TRIM':count(1);return text(a[0]).replace(/^ +| +$/g,'').replace(/ +/g,' ');
   case 'UPPER':count(1);return text(a[0]).toUpperCase();case 'LOWER':count(1);return text(a[0]).toLowerCase();
   case 'VALUE':count(1);return num(a[0]);
   case 'CONCATENATE':count(1,255);return flat.map(text).join('');
   case 'AND':count(1,255);return flat.every(Boolean);case 'OR':count(1,255);return flat.some(Boolean);case 'NOT':count(1);return !a[0];
   case 'ROUND':{count(2);const d=Math.trunc(num(a[1]));if(Math.abs(d)>12)throw Error('ROUND understøtter -12 til 12 decimaler.');const x=num(a[0]),p=10**d;return Math.sign(x)*Math.round((Math.abs(x)+Number.EPSILON)*p)/p;}
   case 'SUM':case 'AVERAGE':case 'COUNT':case 'MIN':case 'MAX':{count(1,255);const vals=flat.filter(x=>typeof x==='number'&&Number.isFinite(x));if(name==='COUNT')return vals.length;if(name==='AVERAGE'&&!vals.length)throw Error('#DIV/0! Ingen tal i området.');if(name==='MIN')return vals.length?Math.min(...vals):0;if(name==='MAX')return vals.length?Math.max(...vals):0;let sum=vals.reduce((s,v)=>s+v,0);return name==='AVERAGE'?sum/vals.length:sum;}
  }
  throw Error('Ukendt funktion.');
 }
 const out=value(ast);if(Array.isArray(out))throw Error('Formlen skal returnere én værdi.');if(typeof out==='number'&&!Number.isFinite(out))throw Error('#NUM! Resultatet er ikke et endeligt tal.');return out;
}
root.FormulaLab={compileFormula,calculate,functions};
})(typeof self!=='undefined'?self:globalThis);
