importScripts('formula.js');
self.onmessage=function(e){
 try{
  const {formula,expected,data,mode}=e.data;
  const ast=FormulaLab.compileFormula(formula),ref=expected?FormulaLab.compileFormula(expected):null;
  let results=[],reference=[],errors=0;
  const start=performance.now(),n=mode==='summary'?1:data.rows.length;
  for(let i=0;i<n;i++){
   try{results.push({value:FormulaLab.calculate(ast,data,mode==='summary'?0:i)});}catch(error){results.push({error:error.message});errors++;}
   if(ref){try{reference.push({value:FormulaLab.calculate(ref,data,mode==='summary'?0:i)});}catch(error){reference.push({error:error.message});}}
  }
  self.postMessage({ok:true,results,reference,errors,ms:Math.round(performance.now()-start)});
 }catch(error){self.postMessage({ok:false,error:error.message});}
};
