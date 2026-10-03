import {calculateIntegration} from './integration-analysis.mjs';
const CASES = [
  {
    id:'bluejay-field-services',
    title:'Bluejay Field Services',
    difficulty:'beginner',
    industry:'Commercial grounds maintenance',
    description:'A fictional two-crew regional operator is seeking a buyer. Start by separating reported earnings from a price that depends on adjustments.',
    teachingObjectives:[
      'Separate reported EBITDA from a supportable normalized earnings estimate.',
      'Test the asking enterprise value against a clear earnings denominator.',
      'Treat customer dependence and a working-capital shortfall as purchase and liquidity risks.',
      'Compare annual cash available with scheduled debt service under the stated downside.',
    ],
    lessonRefs:[
      {title:'Adjusted EBITDA',url:'/topics/adjusted-ebitda/'},
      {title:'Valuing a small business',url:'/course/valuing-a-small-business/'},
      {title:'Customer concentration',url:'/topics/customer-concentration/'},
      {title:'Working capital and collateral',url:'/course/working-capital-and-collateral/'},
      {title:'Debt service',url:'/topics/debt-service/'},
    ],
    stages:[
      {label:'First look',facts:[
        {id:'market-scope',label:'Business',value:'Two-crew commercial grounds maintenance operator with recurring seasonal contracts in one metro area.'},
        {id:'financial-snapshot',label:'Last twelve months',value:'Revenue $2,400,000; reported EBITDA $420,000.'},
        {id:'seller-ask',label:'Seller indication',value:'Asking enterprise value $2,200,000; no cash or debt is included in this enterprise-value illustration.'},
        {id:'seller-multiple-claim',label:'Seller framing',value:'The seller describes the price as about 5.2 times reported EBITDA.'},
      ]},
      {label:'Earnings and customers',facts:[
        {id:'normalization-evidence',label:'Adjustment evidence',value:'Ledger review supports $28,000 of personal travel and $42,000 in a completed one-time legal matter as nonrecurring. A replacement manager costs $50,000 more per year than the owner compensation included in reported EBITDA.'},
        {id:'customer-dependence',label:'Largest account',value:'One customer is 27% of revenue, can terminate on 90 days notice, and contributes $120,000 of annual EBITDA on the provided account schedule.'},
      ]},
      {label:'Working capital and funding',facts:[
        {id:'working-capital',label:'Closing working capital',value:'The agreed illustrative net working-capital peg is $180,000; the latest delivered amount is $145,000.'},
        {id:'funding-terms',label:'Illustrative sources',value:'Senior term loan $1,250,000 at 10% with seven annual level payments; seller note $300,000 at 8%, interest-only for the first two years; buyer equity $760,000. Transaction costs are $75,000.'},
        {id:'cash-conversion',label:'Annual cash assumptions',value:'Maintenance capital expenditure $45,000; cash taxes $55,000; annual working-capital use $25,000. These are synthetic case assumptions, not market benchmarks.'},
        {id:'downside-inputs',label:'Customer-loss downside',value:'If the largest customer leaves, EBITDA falls by its scheduled $120,000 contribution. Assume maintenance capital expenditure remains $45,000, cash taxes are $40,000, and working-capital use is $25,000.'},
      ]},
    ],
    financials:{
      revenue:2_400_000,
      reportedEbitda:420_000,
      addbacks:[{label:'Owner personal travel',amount:28_000},{label:'Completed one-time legal matter',amount:42_000}],
      deductions:[{label:'Replacement manager cost above recorded owner compensation',amount:50_000}],
      purchasePrice:2_200_000,
      workingCapital:{peg:180_000,delivered:145_000},
      transactionCosts:75_000,
      capital:{seniorDebt:1_250_000,sellerNote:300_000,mezzanineDebt:0,sellerRollover:0,buyerEquity:760_000},
      debtTerms:{seniorRate:0.10,seniorYears:7,sellerNoteRate:0.08,sellerNoteCashPay:1,mezzanineCashRate:0,mezzaninePikRate:0},
      cashFlow:{maintenanceCapex:45_000,cashTaxes:55_000,workingCapitalUse:25_000},
      downside:{ebitdaContributionLoss:120_000,maintenanceCapex:45_000,cashTaxes:40_000,workingCapitalUse:25_000},
    },
    rubric:[
      {id:'earnings-bridge',focus:'Rebuild EBITDA from reported earnings and classify each adjustment.',factIds:['financial-snapshot','normalization-evidence'],guidance:'Do not accept personal travel or one-time legal costs solely because the seller labels them add-backs; verify ledger support, recurrence, and replacement management cost.'},
      {id:'multiple-denominator',focus:'State the denominator behind the multiple.',factIds:['seller-ask','seller-multiple-claim','normalization-evidence'],guidance:'The seller quote uses reported earnings; calculate a separate multiple on the validated adjusted figure.'},
      {id:'customer-risk',focus:'Connect account dependence to earnings and continuity.',factIds:['customer-dependence'],guidance:'Examine margin contribution, assignability, renewal, and transition risk; the revenue percentage alone does not measure EBITDA risk.'},
      {id:'working-capital-gap',focus:'Identify the cash shortfall at close.',factIds:['working-capital'],guidance:'Compare delivered net working capital with the peg and clarify whether the agreed adjustment changes proceeds or requires new cash.'},
      {id:'cash-debt-capacity',focus:'Test cash coverage and downside resilience.',factIds:['funding-terms','cash-conversion','downside-inputs'],guidance:'Reconcile the annual debt-service schedule to cash available after capex, taxes, and working-capital use; the customer-loss case is below the base case.'},
    ],
  },
  {
    id:'aster-forge-components',
    title:'Aster Forge Components',
    difficulty:'intermediate',
    industry:'Precision industrial components',
    description:'A fictional manufacturer has several proposed EBITDA adjustments, a large customer, and seller rollover alongside debt.',
    teachingObjectives:[
      'Validate add-backs and replacement costs before choosing an EBITDA basis.',
      'Distinguish enterprise value from total cash needed to close.',
      'Compare seller-note debt with seller rollover equity.',
      'Trace one customer loss through cash flow and debt service.',
    ],
    lessonRefs:[
      {title:'Adjusted EBITDA',url:'/topics/adjusted-ebitda/'},
      {title:'Customer concentration',url:'/topics/customer-concentration/'},
      {title:'Structuring the price',url:'/course/structuring-the-price/'},
      {title:'Rollover and preferred equity',url:'/course/rollover-and-preferred-equity/'},
      {title:'Building the capital stack',url:'/course/building-the-capital-stack/'},
      {title:'Diligencing the business',url:'/course/diligencing-the-business/'},
    ],
    stages:[
      {label:'First look',facts:[
        {id:'market-scope',label:'Business',value:'Fictional manufacturer of precision brackets and fittings sold to industrial equipment makers.'},
        {id:'financial-snapshot',label:'Last twelve months',value:'Revenue $8,000,000; reported EBITDA $1,250,000.'},
        {id:'seller-ask',label:'Seller indication',value:'Asking enterprise value $7,040,000; transaction costs and working capital are separate uses.'},
      ]},
      {label:'Earnings and customers',facts:[
        {id:'normalization-evidence',label:'Adjustment schedule',value:'Supported owner personal costs $35,000; completed one-time ERP conversion $85,000; annual replacement quality and finance leadership costs $90,000 above recorded roles. Assume the two proposed add-backs are verified and nonrecurring for this case.'},
        {id:'customer-dependence',label:'Largest account',value:'The largest customer is 34% of revenue; the top three are 49%. The largest account contributes $360,000 of annual EBITDA on the synthetic account schedule, and its contract can be terminated after a change of control unless consent is obtained.'},
      ]},
      {label:'Working capital and funding',facts:[
        {id:'working-capital',label:'Closing working capital',value:'Illustrative net-working-capital peg $1,100,000; current delivered amount $920,000.'},
        {id:'funding-terms',label:'Illustrative sources',value:'Senior term loan $3,200,000 at 9% with seven annual level payments; seller note $900,000 at 7%, interest-only for two years; seller rollover $337,000; buyer and investor cash equity $3,033,000. Transaction costs are $250,000.'},
        {id:'cash-conversion',label:'Annual cash assumptions',value:'Maintenance capital expenditure $210,000; cash taxes $160,000; annual working-capital use $60,000.'},
      ]},
      {label:'Downside and diligence',facts:[
        {id:'downside-inputs',label:'Customer-loss downside',value:'If the largest account leaves, EBITDA falls by its scheduled $360,000 contribution. Assume maintenance capital expenditure $200,000, cash taxes $90,000, and working-capital use $20,000.'},
        {id:'diligence-gaps',label:'Open items',value:'Change-of-control consent is not yet signed. The case file contains no independent quality-of-earnings report, customer renewal, supplier continuity plan, or lender commitment.'},
      ]},
    ],
    financials:{
      revenue:8_000_000,
      reportedEbitda:1_250_000,
      addbacks:[{label:'Supported owner personal costs',amount:35_000},{label:'Completed one-time ERP conversion',amount:85_000}],
      deductions:[{label:'Replacement quality and finance leadership',amount:90_000}],
      purchasePrice:7_040_000,
      workingCapital:{peg:1_100_000,delivered:920_000},
      transactionCosts:250_000,
      capital:{seniorDebt:3_200_000,sellerNote:900_000,mezzanineDebt:0,sellerRollover:337_000,buyerEquity:3_033_000},
      debtTerms:{seniorRate:0.09,seniorYears:7,sellerNoteRate:0.07,sellerNoteCashPay:1,mezzanineCashRate:0,mezzaninePikRate:0},
      cashFlow:{maintenanceCapex:210_000,cashTaxes:160_000,workingCapitalUse:60_000},
      downside:{ebitdaContributionLoss:360_000,maintenanceCapex:200_000,cashTaxes:90_000,workingCapitalUse:20_000},
    },
    rubric:[
      {id:'earnings-bridge',focus:'Distinguish supported add-backs from replacement-role costs.',factIds:['financial-snapshot','normalization-evidence'],guidance:'Use the provided verification condition, then ask for the quality-of-earnings work and proof no continuing ERP costs remain.'},
      {id:'customer-consent',focus:'Protect continuity around the largest account.',factIds:['customer-dependence','diligence-gaps'],guidance:'A 34% account and unsigned change-of-control consent are a closing and downside issue, not only a valuation adjustment.'},
      {id:'working-capital-gap',focus:'Fund the net-working-capital shortfall and confirm the peg definition.',factIds:['working-capital'],guidance:'The shortfall is additional to enterprise value and transaction costs in the case sources and uses.'},
      {id:'seller-note-vs-rollover',focus:'Explain the distinct claims in the stack.',factIds:['funding-terms'],guidance:'The seller note is debt with scheduled cash interest; rollover is equity exposed to business value. The rollover is 10% of the stated equity capitalization, assuming equal price per share and no incentive dilution.'},
      {id:'downside-debt-service',focus:'Challenge leverage and downside protection.',factIds:['cash-conversion','downside-inputs'],guidance:'The largest customer loss reduces coverage below the base assumption. Seek consent, a lower price, more equity, or structural protection before relying on the base case.'},
    ],
  },
  {
    id:'ternbridge-route-logistics',
    title:'Ternbridge Route Logistics',
    difficulty:'advanced',
    industry:'Contract route logistics',
    description:'A fictional multi-site operator is considering senior debt, cash-pay and PIK mezzanine, a seller note, and rolled equity.',
    teachingObjectives:[
      'Separate enterprise value, completion cash, and the equity ownership bridge.',
      'Examine the priority, cash burden, and PIK growth of a layered capital structure.',
      'Test customer, working-capital, and contract diligence together.',
      'Explain why a plausible base case may still lack enough downside protection.',
    ],
    lessonRefs:[
      {title:'Understand what private credit does—and what the evidence shows',url:'/course/understanding-private-credit/'},
      {title:'Debt terms and covenants',url:'/course/debt-terms-and-covenants/'},
      {title:'Customer concentration',url:'/topics/customer-concentration/'},
      {title:'Working capital and collateral',url:'/course/working-capital-and-collateral/'},
      {title:'Building the capital stack',url:'/course/building-the-capital-stack/'},
      {title:'Returns and exits',url:'/course/returns-and-exits/'},
    ],
    stages:[
      {label:'First look',facts:[
        {id:'market-scope',label:'Business',value:'Fictional contract route operator with several regional depots and mixed fixed-price and fuel-adjusted contracts.'},
        {id:'financial-snapshot',label:'Last twelve months',value:'Revenue $18,000,000; reported EBITDA $2,400,000.'},
        {id:'seller-ask',label:'Seller indication',value:'Asking enterprise value $18,450,000; completion costs and working capital are additional uses.'},
      ]},
      {label:'Earnings and customers',facts:[
        {id:'normalization-evidence',label:'Adjustment schedule',value:'Documented owner-only costs $90,000; completed one-time network integration $80,000; replacement regional operations leadership costs $110,000 above recorded compensation. Assume support is verified and the integration is complete for this case.'},
        {id:'customer-dependence',label:'Customer base',value:'The top three customers are 52% of revenue. The largest is 21% and contributes $470,000 of annual EBITDA; its contract has no minimum-volume commitment and can be terminated.'},
      ]},
      {label:'Working capital and capital stack',facts:[
        {id:'working-capital',label:'Closing working capital',value:'Illustrative net-working-capital peg $2,100,000; delivered amount $1,750,000.'},
        {id:'funding-terms',label:'Illustrative sources',value:'Senior term debt $7,500,000 at 9% with ten annual level payments; mezzanine debt $2,000,000 with 7% cash-pay and 7% PIK interest; seller note $1,000,000 at 8%, interest-only for two years; seller rollover $1,500,000; buyer and investor cash equity $7,350,000. Transaction costs are $550,000.'},
        {id:'cash-conversion',label:'Annual cash assumptions',value:'Maintenance capital expenditure $350,000; cash taxes $270,000; annual working-capital use $100,000. PIK interest increases mezzanine principal and is not included in current cash debt service.'},
      ]},
      {label:'Downside and committee issues',facts:[
        {id:'downside-inputs',label:'Largest-customer downside',value:'If the largest account leaves, EBITDA falls by its scheduled $470,000 contribution. Assume maintenance capital expenditure $350,000, cash taxes $140,000, and working-capital use $100,000.'},
        {id:'diligence-gaps',label:'Open items',value:'Several contract renewals, depot lease assignments, fuel adjustment mechanics, driver retention, lender intercreditor terms, and the PIK balance at refinancing remain unverified.'},
      ]},
    ],
    financials:{
      revenue:18_000_000,
      reportedEbitda:2_400_000,
      addbacks:[{label:'Documented owner-only costs',amount:90_000},{label:'Completed one-time network integration',amount:80_000}],
      deductions:[{label:'Replacement regional operations leadership',amount:110_000}],
      purchasePrice:18_450_000,
      workingCapital:{peg:2_100_000,delivered:1_750_000},
      transactionCosts:550_000,
      capital:{seniorDebt:7_500_000,sellerNote:1_000_000,mezzanineDebt:2_000_000,sellerRollover:1_500_000,buyerEquity:7_350_000},
      debtTerms:{seniorRate:0.09,seniorYears:10,sellerNoteRate:0.08,sellerNoteCashPay:1,mezzanineCashRate:0.07,mezzaninePikRate:0.07},
      cashFlow:{maintenanceCapex:350_000,cashTaxes:270_000,workingCapitalUse:100_000},
      downside:{ebitdaContributionLoss:470_000,maintenanceCapex:350_000,cashTaxes:140_000,workingCapitalUse:100_000},
    },
    rubric:[
      {id:'earnings-bridge',focus:'Validate normalization, role replacements, and integration claims.',factIds:['financial-snapshot','normalization-evidence'],guidance:'Separate the documented add-backs from replacement costs; request independent QoE and validate that the integration spend is complete and not recurring.'},
      {id:'contract-and-customer-risk',focus:'Test renewal, volume, and termination rights.',factIds:['customer-dependence','diligence-gaps'],guidance:'Revenue concentration understates the issue if the customer contributes a disproportionate share of EBITDA and has no minimum-volume commitment.'},
      {id:'working-capital-gap',focus:'Reconcile seasonal and closing net working capital.',factIds:['working-capital'],guidance:'The peg gap is additional completion cash; test monthly seasonality, fuel receivables, payables, and depot-level balances.'},
      {id:'capital-stack-priority',focus:'Map cash-pay, PIK accrual, seller debt, rollover equity, and senior claims.',factIds:['funding-terms','cash-conversion'],guidance:'Do not treat the seller note or PIK debt as equity. PIK reduces current cash use but grows principal and may create a refinancing burden. Confirm intercreditor terms and equity rights.'},
      {id:'downside-protection',focus:'Challenge the base coverage and exit path.',factIds:['cash-conversion','downside-inputs','diligence-gaps'],guidance:'Base coverage has limited cushion and the largest-customer downside is near cash break-even. Test contracted revenue, liquidity, covenants, refinancing assumptions, and walk-away conditions.'},
    ],
  },
  {
    id:'two-companies-one-team',title:'Two companies, one management team',difficulty:'advanced',learningFocus:'integration',industry:'Business services integration',
    description:'An original fictional exercise combining two service businesses. Decide what to stabilize, who should lead and whether integration still creates value under imperfect execution.',
    teachingObjectives:['Separate stabilization from the long-term organization.','Distinguish retention dependencies from leadership quality and permanent redundancy.','Test benefits, costs, timing and mediocre execution using incremental project cash flows.'],
    lessonRefs:[{title:'Management after acquisition',url:'/course/management-after-acquisition/'},{title:'Build a group with a reason to belong together',url:'/course/building-a-group/'},{title:'Customer concentration',url:'/topics/customer-concentration/'},{title:'Cash flow',url:'/topics/cash-flow/'}],
    stages:[
      {label:'Stabilize the combined business',facts:[
        {id:'market-scope',label:'Two fictional businesses',value:'Company A: 30 employees, $6m revenue and $600k EBITDA. Company B: 20 employees, $4m revenue and $400k EBITDA. All figures are USD; baseline assumes both continue separately without improvement. Each has its own sales, operations and finance function.'},
        {id:'culture-and-service',label:'Operating differences',value:'A uses formal dispatch controls; B lets account teams improvise. Both meet current service targets. They use incompatible billing systems. A missed payroll, billing or service handover could harm customers and cash collection.'},
        {id:'first-decision',label:'Immediate assignment',value:'The buyer has not promised a permanent org chart. Decide what must remain covered during integration before selecting leaders or eliminating roles.'},
      ]},
      {label:'People, evidence and transition dependencies',facts:[
        {id:'management-tradeoff',label:'Competing operations heads',value:'A’s operations head earns $140k; validated scheduling reports show fewer missed visits. B’s head earns $130k and personally owns relationships with three clients representing $2m combined revenue. Each favors retaining their own people; their proposed rankings lack independent evidence. Neither has managed a business of the combined size.'},
        {id:'key-people',label:'Critical coverage',value:'A’s scheduling analyst ($75k) alone maintains the dispatch rules. B’s billing specialist ($65k) alone reconciles legacy invoices. A sales lead ($100k) and B account lead ($95k) must hand over accounts. Two finance controllers earn $90k each; both systems need closing and payroll coverage until reconciled.'},
        {id:'retention-and-capacity',label:'Unknowns and project claims',value:'Employees have heard layoffs may be coming, but no departures are confirmed. References on leadership, key-employee willingness to stay and customer handover acceptance are missing. The proposal removes one $90k controller and $110k of duplicated office/process expense; removing either controller before migration is not yet operationally supported. Assess whether temporary retention, either incumbent or an outside leader fits.'},
      ]},
      {label:'Planned economics and timing',facts:[
        {id:'integration-economics',label:'Conditional plan',value:'Combined baseline EBITDA $1m. Planned recurring savings $200k/year: one $90k controller role plus $110k office/process expense. This is a proposed 20% EBITDA uplift, not a quality, productivity or enterprise-value claim. Realization: 50% in year 1; 100% in years 2–5. Duplicate-running expense $60k in year 1, none afterward.'},
        {id:'integration-costs',label:'Project costs and valuation assumptions',value:'At-close one-time costs: systems $120k, severance $60k, retention bonuses $40k, training $30k. Evaluate the incremental integration project versus remaining separate over five years using an assumed 10% discount rate, year-end net cash flows and no terminal value. For this exercise, savings are pre-tax cash-equivalent; purchase price, financing, taxes, capex and working-capital changes are outside the project model. No scenario probabilities or growth benefit from management attention are assigned.'},
      ]},
      {label:'Mediocre execution and committee decision',facts:[
        {id:'integration-downside',label:'Combined stress, not a forecast',value:'Only 50% of planned savings materialize, beginning in year 3: zero in years 1–2. One-time costs double. Duplicate-running expense is $60k in each of years 1–2. From year 2 onward, lost customers reduce combined revenue 5% at a 30% lost contribution margin. No replacement revenue is assumed. Hold these effects fixed through year 5; do not add salary savings again.'},
        {id:'execution-pressure',label:'Unquantified disruption',value:'The scheduling analyst and account lead have outside offers, not confirmed departures. The CEO expects to spend 12–18 months on migration rather than growth. Service deteriorates temporarily if knowledge coverage fails. No monetary cost for those risks, taxes or working-capital disruption has been quantified; do not enter zero or double-count customer loss. Would integration still create sufficient value under mediocre execution, and what evidence or sequencing would change your decision?'},
      ]},
    ],
    integration:{baselineEbitda:1_000_000,revenue:10_000_000,plannedAnnualBenefit:200_000,costs:{systems:120_000,severance:60_000,retention:40_000,training:30_000},discountRate:0.10,years:5,scenarios:[
      {name:'Conditional plan',realization:[0.5,1,1,1,1],duplicateRunningCosts:[60_000,0,0,0,0],revenueLoss:[0,0,0,0,0],lostContributionMargin:0.30,costMultiplier:1},
      {name:'Mediocre execution',realization:[0,0,0.5,0.5,0.5],duplicateRunningCosts:[60_000,60_000,0,0,0],revenueLoss:[0,0.05,0.05,0.05,0.05],lostContributionMargin:0.30,costMultiplier:2},
    ]},
    rubric:[
      {id:'stabilization',focus:'Protect continuity before redesign.',factIds:['culture-and-service','first-decision'],guidance:'Protect service, billing, payroll and cash collection first. Define critical coverage before removing people; process design alone cannot prove transition capacity.'},
      {id:'people-and-politics',focus:'Separate retention, leadership and permanent redundancy.',factIds:['management-tradeoff','key-people','retention-and-capacity'],guidance:'Independent evidence must test biased rankings, not assume malicious motives. Temporary knowledge retention is not a permanent leadership appointment. Neither incumbent is proven at combined scale; consider outside leadership and handover risk without a forced winner.'},
      {id:'benefit-definition',focus:'Define the improvement and execution dependencies.',factIds:['integration-economics','integration-costs'],guidance:'20% refers only to $200k proposed annual savings divided by $1m combined EBITDA. Validate whether the controller role is truly removable after systems reconciliation; do not double-count compensation savings or infer quality/EV improvement.'},
      {id:'mediocre-value',focus:'Test incomplete, late and disruptive integration.',factIds:['integration-downside','execution-pressure'],guidance:'Use the canonical project cash flows, not a perfect steady-state margin story. Compare the conditional plan with a negative mediocre-execution NPV, explain exclusions, and ask what evidence justifies risk or changes sequencing. No probabilities or full acquisition valuation are established.'},
    ],
  },
];

const CASE_BY_ID = new Map(CASES.map(item=>[item.id,item]));

function money(value) {
  if (!Number.isFinite(value)) throw new RangeError('Case amounts must be finite.');
  return Math.round(value);
}

function ratio(numerator,denominator,digits=2) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) throw new RangeError('A positive denominator is required for case ratios.');
  const scale=10**digits;
  return Math.round((numerator/denominator)*scale)/scale;
}

function annualLevelPayment(principal,annualRate,years) {
  if (!Number.isFinite(principal) || principal < 0 || !Number.isFinite(annualRate) || annualRate < 0 || !Number.isInteger(years) || years < 1) {
    throw new RangeError('Invalid annual loan assumptions.');
  }
  if (principal === 0) return 0;
  if (annualRate === 0) return money(principal/years);
  return money(principal*annualRate/(1-(1+annualRate)**-years));
}

function requiredCase(id) {
  const scenario=CASE_BY_ID.get(id);
  if (!scenario) throw new RangeError(`Unknown synthetic case: ${String(id)}`);
  return scenario;
}

export function listCaseCards() {
  return CASES.map(({id,title,difficulty,industry,description})=>({id,title,difficulty,industry,description,label:'Synthetic practice case'}));
}

export function getCase(id) {
  return requiredCase(id);
}

export function visibleFacts(id,stage) {
  const scenario=requiredCase(id);
  if (!Number.isInteger(stage) || stage < 1 || stage > scenario.stages.length) throw new RangeError(`Invalid case stage: ${String(stage)}`);
  return scenario.stages.slice(0,stage).flatMap(item=>item.facts.map(fact=>({...fact,stageLabel:item.label})));
}

export function calculateCase(id) {
  const scenario=requiredCase(id);
  if(scenario.integration)return {integration:calculateIntegration(scenario.integration)};
  const f=scenario.financials;
  const addbacks=money(f.addbacks.reduce((sum,item)=>sum+item.amount,0));
  const deductions=money(f.deductions.reduce((sum,item)=>sum+item.amount,0));
  const normalizedEbitda=money(f.reportedEbitda+addbacks-deductions);
  if (normalizedEbitda <= 0) throw new RangeError('Normalized EBITDA must be positive for the case valuation.');
  const workingCapitalShortfall=Math.max(0,money(f.workingCapital.peg-f.workingCapital.delivered));
  const useLines={purchasePrice:f.purchasePrice,transactionCosts:f.transactionCosts,workingCapitalShortfall};
  const sourceLines={...f.capital};
  const usesTotal=money(Object.values(useLines).reduce((sum,value)=>sum+value,0));
  const sourcesTotal=money(Object.values(sourceLines).reduce((sum,value)=>sum+value,0));
  const totalDebt=money(f.capital.seniorDebt+f.capital.sellerNote+f.capital.mezzanineDebt);
  const senior=annualLevelPayment(f.capital.seniorDebt,f.debtTerms.seniorRate,f.debtTerms.seniorYears);
  const sellerNoteCashInterest=money(f.capital.sellerNote*f.debtTerms.sellerNoteRate*f.debtTerms.sellerNoteCashPay);
  const mezzanineCashInterest=money(f.capital.mezzanineDebt*f.debtTerms.mezzanineCashRate);
  const mezzaninePikAccrual=money(f.capital.mezzanineDebt*f.debtTerms.mezzaninePikRate);
  const totalDebtService=money(senior+sellerNoteCashInterest+mezzanineCashInterest);
  const baseCashAvailable=money(normalizedEbitda-f.cashFlow.maintenanceCapex-f.cashFlow.cashTaxes-f.cashFlow.workingCapitalUse);
  const downsideEbitda=money(normalizedEbitda-f.downside.ebitdaContributionLoss);
  const downsideCashAvailable=money(downsideEbitda-f.downside.maintenanceCapex-f.downside.cashTaxes-f.downside.workingCapitalUse);
  const equityTotal=money(f.capital.sellerRollover+f.capital.buyerEquity);
  const sellerRolloverPct=equityTotal?Math.round((f.capital.sellerRollover/equityTotal)*1000)/10:0;
  return {
    reportedEbitda:f.reportedEbitda,
    normalization:{addbacks,deductions,normalizedEbitda,addbackDetails:f.addbacks.map(item=>({...item})),deductionDetails:f.deductions.map(item=>({...item}))},
    normalizedEbitda,
    valuation:{enterpriseValue:f.purchasePrice,reportedMultiple:ratio(f.purchasePrice,f.reportedEbitda),normalizedMultiple:ratio(f.purchasePrice,normalizedEbitda)},
    workingCapitalShortfall,
    sourcesAndUses:{uses:{...useLines,total:usesTotal},sources:{...sourceLines,total:sourcesTotal},imbalance:money(sourcesTotal-usesTotal)},
    totalDebt,
    totalLeverage:ratio(totalDebt,normalizedEbitda),
    annualDebtService:{senior,sellerNoteCashInterest,mezzanineCashInterest,total:totalDebtService,mezzaninePikAccrual},
    mezzanine:{principal:f.capital.mezzanineDebt,cashRate:f.debtTerms.mezzanineCashRate,pikRate:f.debtTerms.mezzaninePikRate,pikAccrual:mezzaninePikAccrual,principalAfterYearOne:money(f.capital.mezzanineDebt+mezzaninePikAccrual)},
    baseCashFlow:{available:baseCashAvailable,coverage:ratio(baseCashAvailable,totalDebtService)},
    downsideCashFlow:{ebitda:downsideEbitda,available:downsideCashAvailable,coverage:ratio(downsideCashAvailable,totalDebtService)},
    equityCapitalization:{total:equityTotal,sellerRollover:f.capital.sellerRollover,buyerEquity:f.capital.buyerEquity,sellerRolloverPct},
    assumptions:{debtPayments:'Annual level payments on the stated senior debt; lender fees, covenants, taxes, and actual payment schedules are not modeled.'},
  };
}

export function visibleCalculations(id,stage) {
  const scenario=requiredCase(id);
  const knownFactIds=new Set(visibleFacts(id,stage).map(fact=>fact.id));
  const complete=calculateCase(id);
  if(scenario.integration){
    if(!knownFactIds.has('integration-economics'))return {};
    return {integration:{...complete.integration,scenarios:complete.integration.scenarios.slice(0,knownFactIds.has('integration-downside')?2:1)}};
  }
  const result={
    reportedEbitda:complete.reportedEbitda,
    enterpriseValue:complete.valuation.enterpriseValue,
    reportedMultiple:complete.valuation.reportedMultiple,
  };
  if (knownFactIds.has('normalization-evidence')) {
    result.normalization={
      addbacks:complete.normalization.addbacks,
      deductions:complete.normalization.deductions,
      normalizedEbitda:complete.normalization.normalizedEbitda,
    };
    result.normalizedEbitda=complete.normalizedEbitda;
    result.normalizedMultiple=complete.valuation.normalizedMultiple;
  }
  if (knownFactIds.has('working-capital') && knownFactIds.has('funding-terms')) {
    result.workingCapitalShortfall=complete.workingCapitalShortfall;
    result.sourcesAndUses=complete.sourcesAndUses;
    result.totalDebt=complete.totalDebt;
    result.totalLeverage=complete.totalLeverage;
    result.annualDebtService=complete.annualDebtService;
    result.baseCashFlow=complete.baseCashFlow;
    result.equityCapitalization=complete.equityCapitalization;
    result.mezzanine=complete.mezzanine;
  }
  if (knownFactIds.has('downside-inputs')) result.downsideCashFlow=complete.downsideCashFlow;
  return result;
}

export function answerFor(id) {
  const scenario=requiredCase(id);
  return {
    case:{id:scenario.id,title:scenario.title,difficulty:scenario.difficulty,industry:scenario.industry,stageCount:scenario.stages.length},
    calculations:calculateCase(id),
    rubric:scenario.rubric.map(item=>({...item,factIds:[...item.factIds]})),
    teachingObjectives:[...scenario.teachingObjectives],
    lessonRefs:scenario.lessonRefs.map(item=>({...item})),
  };
}
