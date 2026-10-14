// Shared, content-free workspace vocabulary. Call state is never stored here.
export const CALL_AREAS=Object.freeze([
 {id:'motivation',label:'Seller motivation',goal:'Why is the owner considering a sale?'},
 {id:'owner_role',label:'Owner dependence',goal:'What does the owner do day to day, and what depends on them?'},
 {id:'earnings',label:'Earnings definition',goal:'What does the seller mean by profit or earnings?'},
 {id:'customers',label:'Customers & revenue',goal:'Where is revenue concentrated, and is it recurring or project based?'},
 {id:'management',label:'Management depth',goal:'Who manages employees and operations?'},
 {id:'operations',label:'Operating & capital needs',goal:'What operating, working-capital and capital-expenditure context is missing?'},
 {id:'transition',label:'Seller transition',goal:'What transition does the seller expect?'},
 {id:'expectations',label:'Economic expectations',goal:'What does the seller expect economically?'},
 {id:'next_steps',label:'Gaps & next steps',goal:'What is still missing, and what should happen next?'},
]);
export const COVERAGE_STATUSES=Object.freeze({not_discussed:'Not discussed',partial:'Partially understood',clear:'Clear enough for now'});
