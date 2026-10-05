export function forbiddenOutputPath(relative){
 return /(?:^|\/)(?:private|whisper_corpus|yusufa_analysis|missing_whisper[^/]*|missing_audio|raw-sources|source-html|captions|subtitles|transcripts|audio)\//i.test(relative)
  ||/(?:^|\/)\.env(?:\.|$)/i.test(relative)
  ||/(?:^|\/)[^/]*(?:transcript|caption|subtitle|whisper|recording|audio)[^/]*\.(?:txt|json|jsonl)$/i.test(relative)
  ||/\.(?:md|csv|srt|vtt|tsv|wav|mp3|m4a|pdf|bak|backup|sqlite|db|key|pem)$/i.test(relative);
}
