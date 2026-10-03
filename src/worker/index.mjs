import {handleAiRequest} from './ai-api.mjs';
import {handlePaidRequest} from './paid-api.mjs';

export default {
  async fetch(request,env) {
    const paid=await handlePaidRequest(request,env);
    if (paid) return paid;
    const response=await handleAiRequest(request,env);
    if (response) return response;
    return env.ASSETS.fetch(request);
  },
};
