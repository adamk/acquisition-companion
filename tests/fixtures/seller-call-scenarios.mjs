export const sellerCallScenarios=[
 {name:'undefined profit',notes:'Seller says business makes $600k profit.',coverage:{},focus:'define_earnings',expected:'Clarify the earnings measure before valuation or debt.'},
 {name:'owner-dependent customers',notes:'Owner handles top five customers personally.',coverage:{},focus:'customer_transfer',expected:'Ask how relationships transfer when the owner leaves.'},
 {name:'customer concentration',notes:'Largest customer is 35% of revenue.',coverage:{},focus:'concentration_follow_up',expected:'Explore relationship ownership, contract duration, history or retention; no automatic rejection.'},
 {name:'price before earnings',notes:'Seller wants $4m. Earnings are undefined.',coverage:{},focus:'earnings_before_price',expected:'Define sustainable earnings before debating price or an offer.'},
 {name:'adequate introductory coverage',notes:'Seller explained motivation, role, earnings definition, customers, managers, operations, transition and economic expectations. Agree a next step.',coverage:{motivation:'clear',owner_role:'clear',earnings:'clear',customers:'clear',management:'clear',operations:'clear',transition:'clear',expectations:'clear',next_steps:'clear'},focus:'closing_next_step',expected:'Suggest a closing or agreed-next-step question.'},
];
