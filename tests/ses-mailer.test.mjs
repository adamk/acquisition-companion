import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {sendSesEmail} from '../src/worker/ses-mailer.mjs';
import {sendSignInMail} from '../src/worker/auth-mailer.mjs';
const env={AUTH_MAIL_PROVIDER:'ses',SES_REGION:'us-east-1',SES_ACCESS_KEY_ID:'fixture-access',SES_SECRET_ACCESS_KEY:'fixture-secret'};
const mail={from:'signin@acquisitioncompanion.com',to:'buyer@example.test',subject:'Sign in',text:'Fixture link'};
test('SES v2 HTTPS request has an independently verifiable SigV4 signature and plain text only',async()=>{
 let captured;const now=new Date('2026-10-01T12:34:56Z');
 assert.deepEqual(await sendSesEmail(mail,env,{now,fetcher:async(url,options)=>{captured={url,...options};return Response.json({MessageId:'fixture-message'});}}),{messageId:'fixture-message'});
 assert.equal(captured.url,'https://email.us-east-1.amazonaws.com/v2/email/outbound-emails');assert.equal(captured.method,'POST');assert.equal(captured.redirect,'manual');
 const body=JSON.parse(captured.body);assert.deepEqual(body.Destination.ToAddresses,[mail.to]);assert.equal(body.FromEmailAddress,mail.from);assert.equal(body.Content.Simple.Body.Text.Data,mail.text);assert.equal(body.Content.Simple.Body.Html,undefined);
 const h=captured.headers,hash=s=>createHash('sha256').update(s).digest('hex'),mac=(key,s)=>createHmac('sha256',key).update(s).digest();
 const canonical=`POST\n/v2/email/outbound-emails\n\ncontent-type:application/json\nhost:email.us-east-1.amazonaws.com\nx-amz-date:20261001T123456Z\n\ncontent-type;host;x-amz-date\n${hash(captured.body)}`;
 let key=mac('AWS4fixture-secret','20261001');key=mac(key,'us-east-1');key=mac(key,'ses');key=mac(key,'aws4_request');
 const signature=mac(key,`AWS4-HMAC-SHA256\n20261001T123456Z\n20261001/us-east-1/ses/aws4_request\n${hash(canonical)}`).toString('hex');
 assert.ok(h.Authorization.endsWith('Signature='+signature));assert.equal(h['X-Amz-Date'],'20261001T123456Z');assert.ok(!captured.body.includes('fixture-secret'));
});
test('SES missing config, provider rejection, invalid JSON and network failure stay generic and never retry',async()=>{
 let calls=0;await assert.rejects(sendSesEmail(mail,{...env,SES_REGION:'evil.example'}, {fetcher:async()=>{calls++;}}));assert.equal(calls,0);
 for(const fetcher of [async()=>new Response('sensitive response',{status:403}),async()=>new Response(null,{status:302,headers:{Location:'https://untrusted.example.test'}}),async()=>new Response('invalid json'),async()=>{throw Error('sensitive network detail');}]){
  calls=0;await assert.rejects(sendSesEmail(mail,env,{fetcher:async(...args)=>{calls++;return fetcher(...args);}}),e=>e.code==='billing_unavailable'&&!e.message.includes('sensitive'));assert.equal(calls,1);
 }
});
test('SES adapter preserves staging origin/recipient guards and does not require a Cloudflare email binding',async()=>{
 const origin='https://paid-staging.example.test',settings={...env,AUTH_MAIL_ENABLED:'true',AUTH_MAIL_MODE:'staging',AUTH_MAIL_ORIGIN:origin,AUTH_MAIL_FROM:mail.from,AUTH_MAIL_RECIPIENTS:'["buyer@example.test"]'};
 let calls=0;const dependencies={fetcher:async()=>{calls++;return Response.json({MessageId:'fixture-message'});}};
 assert.deepEqual(await sendSignInMail({email:mail.to,url:origin+'/account/#token='+'a'.repeat(64)},settings,dependencies),{accepted:true});assert.equal(calls,1);
 await assert.rejects(sendSignInMail({email:'other@example.test',url:origin+'/account/#token='+'a'.repeat(64)},settings,dependencies));assert.equal(calls,1);
});
test('staging SES rejection reports only safe status/code metadata, never mail or credentials',async()=>{
 const reports=[];
 await assert.rejects(sendSesEmail(mail,{...env,AUTH_MAIL_MODE:'staging'},{reportFailure:value=>reports.push(value),fetcher:async()=>Response.json({message:'fixture-secret and private message',__type:'InvalidSignatureException'},{status:403})}));
 assert.deepEqual(reports,[{type:'ses_delivery_failure',httpStatus:403,code:'InvalidSignatureException'}]);
 assert.ok(!JSON.stringify(reports).includes(mail.text));assert.ok(!JSON.stringify(reports).includes(env.SES_SECRET_ACCESS_KEY));
});
