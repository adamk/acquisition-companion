export const DEFAULT_OPENAI_MODEL='gpt-5.6-luna';
export const MAX_OUTPUT_TOKENS=1400;
export const MAX_FILE_SEARCH_RESULTS=4;
const MAX_PROVIDER_RESPONSE_BYTES=1_000_000;
const DEFAULT_OUTPUT_TOKENS=960;
const OUTPUT_TOKENS_BY_ACTION=Object.freeze({
  hint:576,
  start:768,
  message:960,
  explain:1152,
  what_did_i_miss:896,
  challenge_assumptions:896,
  reveal_next:896,
  show_answer:1400,
  complete:1400,
});

function stringEnum(values) {
  return {type:'string',enum:[...new Set(values)]};
}

export function createResponseRequest({model=DEFAULT_OPENAI_MODEL,vectorStoreId,input,instructions,allowedActions,allowedLessonSlugs,mode='ask_course',action='message'}) {
  const maxOutputTokens=mode==='ask_course'&&['message','explain'].includes(action)
    ? 1152
    : OUTPUT_TOKENS_BY_ACTION[action] || DEFAULT_OUTPUT_TOKENS;
  const properties={
    responseText:{type:'string'},
    suggestedActions:{type:'array',items:stringEnum(allowedActions)},
  };
  const required=['responseText','suggestedActions'];
  if(action==='complete') {
    properties.feedback={
      type:'object',
      properties:{
        strengths:{type:'array',items:{type:'string'}},
        risksIdentified:{type:'array',items:{type:'string'}},
        risksMissed:{type:'array',items:{type:'string'}},
        assumptionsNeedingEvidence:{type:'array',items:{type:'string'}},
        lessonsToReview:{type:'array',items:stringEnum(allowedLessonSlugs)},
      },
      required:['strengths','risksIdentified','risksMissed','assumptionsNeedingEvidence','lessonsToReview'],
      additionalProperties:false,
    };
    required.push('feedback');
  }
  return {
    model,
    store:false,
    max_output_tokens:maxOutputTokens,
    reasoning:{effort:'low'},
    instructions,
    input,
    tools:[{
      type:'file_search',
      vector_store_ids:[vectorStoreId],
      max_num_results:MAX_FILE_SEARCH_RESULTS,
    }],
    // File Search is the only available tool, so requiring a tool call makes
    // every answer consult the authored course corpus before generation.
    tool_choice:'required',
    include:['file_search_call.results'],
    text:{format:{
      type:'json_schema',
      name:'acquisition_companion_ai_response',
      strict:true,
      schema:{
        type:'object',
        properties,
        required,
        additionalProperties:false,
      },
    }},
  };
}

export async function requestOpenAI({apiKey,model,vectorStoreId,input,instructions,allowedActions,allowedLessonSlugs,mode='ask_course',action='message',fetcher=fetch,timeoutMs=20_000}) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response=await fetcher('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify(createResponseRequest({model,vectorStoreId,input,instructions,allowedActions,allowedLessonSlugs,mode,action})),
      signal:controller.signal,
    });
    const declaredLength=response.headers.get('content-length');
    if(declaredLength&&/^\d+$/.test(declaredLength)&&Number(declaredLength)>MAX_PROVIDER_RESPONSE_BYTES)throw new Error('OpenAI response exceeded the configured size limit.');
    const reader=response.body?.getReader();
    if(!reader)return {status:response.status,ok:response.ok,body:''};
    const chunks=[];let bytes=0;
    while(true){
      const {done,value}=await reader.read();if(done)break;
      bytes+=value.byteLength;
      if(bytes>MAX_PROVIDER_RESPONSE_BYTES){await reader.cancel();throw new Error('OpenAI response exceeded the configured size limit.');}
      chunks.push(value);
    }
    const all=new Uint8Array(bytes);let offset=0;
    for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.byteLength;}
    return {status:response.status,ok:response.ok,body:new TextDecoder('utf-8',{fatal:true}).decode(all)};
  } finally {
    clearTimeout(timer);
  }
}
