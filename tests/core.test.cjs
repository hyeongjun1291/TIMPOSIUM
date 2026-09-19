const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const G=require('../dist/core.js');
const input={question:'품앗이를 설명해 줘',context:'수익보다 돌봄이 중요하다',concepts:'품앗이 = 상호 돌봄'};
const issue={type:'imposed_frame',quote:'수익 극대화',source_id:'C',source_quote:'수익보다 돌봄',problem:'기준 충돌',suggestion:'돌봄을 중심에 둔다'};
function fake(replies){let i=0;const fn=async()=>{if(i>=replies.length)throw Error('Unexpected call');const r=replies[i++];if(r instanceof Error)throw r;return r;};fn.count=()=>i;return fn;}
test('anchors preserve exact original definitions',()=>{assert.equal(G.makeSource(input).anchors[2].text,'품앗이 = 상호 돌봄');});
test('does not silently truncate input',()=>assert.throws(()=>G.makeSource({...input,context:'가'.repeat(2500)})));
test('duplicate concepts rejected',()=>assert.throws(()=>G.parseConcepts('a=b\na=c')));
test('prototype-like keys remain ordinary data',()=>assert.equal(G.parseConcepts('__proto__=meaning').__proto__,'meaning'));
test('invented source evidence rejected',()=>assert.throws(()=>G.checkAudit(JSON.stringify({issues:[{...issue,source_quote:'없는 내용'}],questions:[]}),G.makeSource(input),'수익 극대화')));
test('invented draft evidence rejected',()=>assert.throws(()=>G.checkAudit(JSON.stringify({issues:[issue],questions:[]}),G.makeSource(input),'돌봄')));
test('baseline uses one call',async()=>{const fn=fake(['초안']);const r=await G.run(input,fn,{mode:'baseline'});assert.equal(r.status,'baseline');assert.equal(fn.count(),1);});
test('no issue keeps original and clarification',async()=>{const r=await G.run(input,fake(['초안',JSON.stringify({issues:[],questions:['어떤 활동인가요?']})]));assert.equal(r.status,'needs_context');assert.equal(r.final,'초안');});
test('malformed audit fails conservatively',async()=>{const r=await G.run(input,fake(['초안','not json']));assert.equal(r.status,'retained_error');assert.equal(r.final,'초안');assert.equal(r.trace.length,2);});
test('accepted candidate uses all four calls',async()=>{const fn=fake(['품앗이는 수익 극대화',JSON.stringify({issues:[issue],questions:[]}),'품앗이는 상호 돌봄',JSON.stringify({accept:true,reason:'원문 반영'})]);const r=await G.run(input,fn);assert.equal(r.final,'품앗이는 상호 돌봄');assert.equal(r.status,'revised_unvalidated');assert.equal(fn.count(),4);});
test('missing literal concept skips judge and retains original',async()=>{const fn=fake(['품앗이는 수익 극대화',JSON.stringify({issues:[issue],questions:[]}),'서로 도와요']);const r=await G.run(input,fn);assert.equal(r.status,'retained');assert.equal(fn.count(),3);assert.equal(r.candidate,'서로 도와요');});
test('judge rejection preserves candidate but not as final',async()=>{const r=await G.run(input,fake(['품앗이는 수익 극대화',JSON.stringify({issues:[issue],questions:[]}),'품앗이는 돌봄',JSON.stringify({accept:false,reason:'새로운 사실 추가'})]));assert.equal(r.status,'retained');assert.equal(r.final,r.draft);assert.notEqual(r.candidate,r.final);});
test('initial backend failure never invents output',async()=>{const r=await G.run(input,fake([Error('offline')]));assert.equal(r.status,'failed');assert.equal(r.final,'');assert.equal(r.trace[0].error,'offline');});
test('generic condition remains distinctly unverified',async()=>{const r=await G.run(input,fake(['초안','피드백','수정']),{mode:'generic'});assert.equal(r.status,'generic_unverified');assert.equal(r.trace.length,3);});
test('runtime constants match protocol',()=>{const p=JSON.parse(fs.readFileSync('evaluation/protocol_context_guard_v2_2.json'));for(const k of Object.keys(p.generation))assert.equal(G.CONFIG[k],p.generation[k]);});

test('output language is explicit and validated',()=>{assert.equal(G.makeSource(input).language,'한국어');assert.equal(G.makeSource({...input,language:'English'}).language,'English');assert.throws(()=>G.makeSource({...input,language:'unsupported'}));});

test('single-question anchors never invent context',async()=>{const question='지역어를 유지해 줘. 어린이도 이해해야 해.';const r=await G.run({question,context:'',concepts:'',language:'한국어'},fake(['초안',JSON.stringify({issues:[],questions:[]})]));assert.equal(r.source.input_mode,'single_question');assert.equal(r.source.context,'');assert.equal(Object.keys(r.source.concepts).length,0);for(const a of r.source.anchors)assert.ok(question.includes(a.text));assert.equal(r.source.anchors[0].text,question);});
