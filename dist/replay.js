'use strict';
(function(root){
 const archiveKey='accountingLab.replays.v1';
 function create(){return {version:1,times:{},events:[],drafts:{},focus:null};}
 function checkpoint(attempt,questionId,viewing,now=Date.now()){
  const replay=attempt?.replay;
  if(!replay)return;
  if(replay.focus){
   const end=Math.min(now,replay.focus.deadline);
   const elapsed=Math.max(0,end-replay.focus.at);
   const id=replay.focus.questionId;
   replay.times[id]=(replay.times[id]||0)+elapsed;
  }
  replay.focus=viewing&&attempt.deadline>now?{questionId,at:now,deadline:attempt.deadline}:null;
 }
 function draft(attempt,questionId,value){
  if(!attempt.replay||!attempt.ids.includes(questionId)||typeof value.text!=='string')return;
  attempt.replay.drafts[questionId]={text:value.text,mode:value.mode,kind:value.kind};
 }
 function record(attempt,message,now=Date.now()){
  const replay=attempt.replay;
  if(!replay||!attempt.ids.includes(message.questionId))return;
  if(message.action==='draft'){draft(attempt,message.questionId,message);return;}
  if(typeof message.runId!=='string')return;
  const existing=replay.events.find(event=>event.runId===message.runId);
  if(message.action==='start'&&!existing&&typeof message.text==='string'){
   draft(attempt,message.questionId,message);
   replay.events.push({runId:message.runId,questionId:message.questionId,at:now,text:message.text,mode:message.mode,kind:message.kind,status:'running',summary:''});
  }
  if(message.action==='finish'&&existing&&['correct','incorrect','error','interrupted','executed'].includes(message.status)){
   existing.status=message.status;
   existing.summary=typeof message.summary==='string'?message.summary:'';
   existing.endedAt=now;
  }
 }
 function interrupt(attempt,now=Date.now()){
  for(const event of attempt?.replay?.events||[]){
   if(event.status==='running'){event.status='interrupted';event.endedAt=now;}
  }
 }
 function history(){
  try{
   const stored=JSON.parse(root.localStorage.getItem(archiveKey)||'[]');
   return Array.isArray(stored)?stored.filter(attempt=>attempt?.replay?.version===1&&Array.isArray(attempt.ids)&&Array.isArray(attempt.replay.events)&&attempt.replay.times&&attempt.replay.drafts):[];
  }catch{return [];}
 }
 function complete(attempt,now=Date.now()){
  if(!attempt.replay)return true;
  interrupt(attempt,now);
  attempt.replay.focus=null;
  attempt.replay.finishedAt=now;
  const snapshot=JSON.parse(JSON.stringify(attempt));
  const records=[snapshot,...history().filter(old=>old.attempt!==attempt.attempt)].slice(0,5);
  try{root.localStorage.setItem(archiveKey,JSON.stringify(records));return true;}catch{return false;}
 }
 root.ExamReplay={create,checkpoint,draft,record,interrupt,history,complete};
})(globalThis);
