import {WorkerEntrypoint} from 'cloudflare:workers';
import {sendSignInMail} from './auth-mailer.mjs';
// Accessible only through the explicitly bound named service entrypoint.
export class AuthMailer extends WorkerEntrypoint {
 async sendSignIn(payload){return sendSignInMail(payload,this.env);}
}
export default {fetch(){return new Response('Not found',{status:404});}};
