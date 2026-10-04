const clientReasons=new Set(['auth_fragment_missing','auth_fragment_invalid','auth_fragment_present','auth_confirm_client_attempt']);
const confirmReasons=new Set(['auth_confirm_missing_binding','auth_confirm_invalid_request','auth_confirm_challenge_not_found','auth_confirm_binding_mismatch','auth_confirm_expired','auth_confirm_consume_conflict','auth_confirm_storage_failure','auth_confirm_session_failure','auth_confirm_success']);
const diagnosticIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validAuthDiagnosticId(value){return typeof value==='string'&&diagnosticIdPattern.test(value);}
export function newAuthDiagnosticId(){return crypto.randomUUID();}
export function authDiagnosticReasonAllowed(reason){return clientReasons.has(reason)||confirmReasons.has(reason);}
export function authClientDiagnosticReasonAllowed(reason){return clientReasons.has(reason);}
export function reportAuthDiagnostic(reason,value,dependencies={}){
 if(!authDiagnosticReasonAllowed(reason))return;
 const event={type:'auth_diagnostic',reason,diagnosticId:validAuthDiagnosticId(value)?value:newAuthDiagnosticId()};
 try{
  if(typeof dependencies.reportAuthDiagnostic==='function')dependencies.reportAuthDiagnostic(event);
  else console.warn(JSON.stringify(event));
 }catch{/* Diagnostics must never change authentication outcomes. */}
}
