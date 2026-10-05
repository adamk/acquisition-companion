import test from 'node:test';import assert from 'node:assert/strict';
import {forbiddenOutputPath} from '../scripts/output-policy.mjs';
test('private credit learning routes are public while private metadata stays private',()=>{
 assert.equal(forbiddenOutputPath('course/understanding-private-credit/index.html'),false);
 assert.equal(forbiddenOutputPath('topics/private-credit/index.html'),false);
 for(const p of ['private/provenance.json','whisper_corpus/id.md','data/missing_whisper/id.txt','missing_audio/id.mp3','archive/transcript.mp3','yusufa_analysis/00.md','raw-sources/fund-guide.html','source-html/guide.html','.env.production','backup.pdf','secret.pem'])assert.equal(forbiddenOutputPath(p),true,p);
});
test('raw captions and transcript exports cannot enter public output',()=>{
 for(const p of ['captions/video.srt','captions/video.json','subtitles/video.vtt','exports/source.tsv','transcripts/raw.txt','public/transcript.txt','public/captions.json','public/whisper-transcript.jsonl','public/source-recording.mp3','media/recovered-audio.wav'])assert.equal(forbiddenOutputPath(p),true,p);
 assert.equal(forbiddenOutputPath('course/building-the-capital-stack/index.html'),false);
});
