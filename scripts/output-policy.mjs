export function forbiddenOutputPath(relative){return /(?:^|\/)(?:private|whisper_corpus|yusufa_analysis|missing_whisper[^/]*)\//i.test(relative)||/\.(?:md|csv|wav|mp3|m4a)$/i.test(relative);}
