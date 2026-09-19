/* All inference is local. Model download begins on explicit answer or load action. */
(function(){
  let engine=null,activeModel=null,cancelled=false;
  const MODELS={balanced:'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',small:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'};
  async function diagnose(){if(!window.isSecureContext)return {ok:false,message:'보안 컨텍스트가 아닙니다. 동봉한 로컬 실행기로 열어 주세요.'};if(!navigator.gpu)return {ok:false,message:'이 브라우저에서 WebGPU를 사용할 수 없습니다. 최신 데스크톱 Chrome 또는 Edge에서 열거나 Ollama를 사용하세요.'};const adapter=await navigator.gpu.requestAdapter();if(!adapter)return {ok:false,message:'사용 가능한 GPU를 찾지 못했습니다. 다른 지원 브라우저 또는 Ollama가 필요합니다.'};return {ok:true,fp16:adapter.features.has('shader-f16'),message:'WebGPU 사용 가능 · 모델을 준비하면 직접 분석할 수 있습니다.'};}
  async function load(kind,onProgress){const d=await diagnose();if(!d.ok)throw Error(d.message);if(!MODELS[kind])throw Error('모델 선택이 잘못되었습니다.');if(engine){await engine.unload();engine=null;activeModel=null;}const id=d.fp16?MODELS[kind]:MODELS[kind].replace('q4f16','q4f32');onProgress('모델 라이브러리를 준비합니다…');if(!window.ContextWebLLM)throw Error('라이브러리를 읽지 못했습니다. ZIP을 모두 풀었는지 확인하세요.');
    const config={...ContextWebLLM.prebuiltAppConfig,useIndexedDBCache:true};
    engine=await ContextWebLLM.CreateMLCEngine(id,{appConfig:config,initProgressCallback:r=>onProgress(r.text)},{context_window_size:4096});activeModel=id;return id;
  }
  async function complete(system,payload,schema){if(!engine)throw Error('먼저 브라우저 모델을 준비해 주세요.');if(cancelled)throw Error('분석을 중단했습니다.');const response=await engine.chat.completions.create({messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(payload)}],temperature:ContextGuard.CONFIG.temperature,seed:ContextGuard.CONFIG.seed,max_tokens:ContextGuard.CONFIG.maxTokens,...(schema?{response_format:{type:'json_object',schema:JSON.stringify(schema)}}:{})});if(cancelled)throw Error('분석을 중단했습니다.');const choice=response.choices?.[0];if(choice?.finish_reason==='length')throw Error('응답 길이 한도에 도달했습니다. 입력을 줄여 주세요.');const answer=choice?.message?.content;if(typeof answer!=='string'||!answer.trim())throw Error('모델이 빈 응답을 반환했습니다.');return answer;}
  function cancel(){cancelled=true;engine?.interruptGenerate();}
  window.ContextRuntime={diagnose,load,complete,cancel,begin:()=>{cancelled=false},model:()=>activeModel,ready:()=>!!engine};
})();
