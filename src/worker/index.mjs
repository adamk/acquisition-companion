import {handleAiRequest} from './ai-api.mjs';

export default {
  async fetch(request,env) {
    const response=await handleAiRequest(request,env);
    if (response) return response;
    return env.ASSETS.fetch(request);
  },
};
