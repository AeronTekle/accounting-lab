const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('dist/exams.js', 'utf8').split("el('examsTab').onclick=")[0];
const catalog = JSON.parse(fs.readFileSync('dist/assets/catalog.json', 'utf8'));
const practice = JSON.parse(fs.readFileSync('dist/assets/practice.json', 'utf8'));
const questions = Object.fromEntries([...Object.values(catalog.exercises).flat(), ...practice.questions].map(q => [q.id, q]));
let url = new URL('https://example.test/exams.html?question=r15');
let saved;
const entries = [];
const element = {hidden: false, classList: {toggle() {}}, setAttribute() {}, removeAttribute() {}, focus() {}, prepend() {}};
const context = vm.createContext({
 Date, URL, URLSearchParams, questions,
 location: {get href() {return url.href;}, get search() {return url.search;}},
 history: Object.fromEntries(['pushState', 'replaceState'].map(method => [method, (_state, _unused, value) => {url = new URL(value); entries.push(method);} ])),
 localStorage: {setItem(_key, value) {saved = value;}},
 document: {getElementById() {return element;}}
});
vm.runInContext(code + `
 byId=questions;
 renderCards=()=>{};
 renderBank=()=>{};
 renderOral=()=>{};
 renderSession=()=>show('session');
 this.getSession=()=>session;
 this.save=store;
 this.setSession=value=>{session=value;};
 this.sets=examSets;
`, context);
context.restoreLocation();
assert.equal(context.getSession().ids[0], 'r15');
context.getSession().answers.r15 = 'Association, with weekday differences to investigate.';
context.getSession().done.r15 = true;
context.save();
context.setSession(JSON.parse(saved));
context.restoreLocation();
assert.match(context.getSession().answers.r15, /weekday/);
assert.equal(context.getSession().done.r15, true);
context.single('i2');
context.single('r15');
assert.match(context.getSession().answers.r15, /weekday/);
context.single('r15', ['r15','r16']);
context.moveGuided(1);
assert.equal(context.getSession().ids[0], 'r16');
context.moveGuided(-1);
assert.equal(context.getSession().ids[0], 'r15');
assert.match(context.getSession().answers.r15, /weekday/);
context.show('oral');
context.single('i2', ['i2']);
assert.equal(context.getSession().returnView, 'oral');
context.restoreLocation();
assert.equal(context.getSession().returnView, 'oral');
context.show('exams');
assert.equal(url.search, '?view=exams');
context.restoreLocation();
assert.equal(url.search, '?view=exams');
context.show('home');
assert.equal(url.search, '');
context.restoreLocation();
assert.equal(url.search, '');
context.show('bank');
assert.equal(url.search, '?view=bank');
context.show('materials');
assert.equal(url.search, '?view=materials');
context.newExam(context.sets.find(ex => ex.id === 'R08'));
assert.equal(url.search, '?exam=R08');
context.getSession().answers.r15 = 'Timed answer';
context.getSession().finished = true;
context.save();
context.setSession(JSON.parse(saved));
context.restoreLocation();
assert(context.getSession().finished);
assert.equal(context.getSession().answers.r15, 'Timed answer');
// A browser Back navigation restores the previous view without pushing another entry.
url = new URL('https://example.test/exams.html?view=bank');
const entryCount = entries.length;
context.restoreLocation();
assert.equal(entries.length, entryCount);
assert.equal(url.search, '?view=bank');
for (const [input, expected] of [['1,436.30',1436.3],['1436,30',1436.3],['1,436',1436],[' 33.05 ',33.05],['-1,436.30',-1436.3]]) assert.equal(context.numericValue(input), expected);
assert(Number.isNaN(context.numericValue('1,43,6.30')));
console.log('Navigation checks passed for saved guided work, question switches, home and tab URLs, exam review reload, browser history and formatted numbers.');

// Editing a running calculation must preserve the new draft and discard old work.
const appElements = {};
const appContext = vm.createContext({
 window: {},
 localStorage: {getItem() {return null;}, setItem() {}},
 URLSearchParams,
 location: {search: ''},
 document: {getElementById: id => appElements[id] ||= {value: ''}}
});
const appCode = fs.readFileSync('dist/app.js', 'utf8').split("$('sqlTab').onclick=")[0];
vm.runInContext(appCode + `
 let cancelled=false,cleared=false;
 stop=()=>{state.working=false;cancelled=true;};
 clearResults=()=>{cleared=true;};
 state.working=true;
 $('sqlInput').value='SELECT SUM(Total) FROM Invoice;';
 remember();
 this.editedDraft={cancelled,cleared,text:state.drafts[key()].text};
`, appContext);
assert(appContext.editedDraft.cancelled);
assert(appContext.editedDraft.cleared);
assert.equal(appContext.editedDraft.text, 'SELECT SUM(Total) FROM Invoice;');
console.log('Draft check passed for editing while a calculation is running.');
