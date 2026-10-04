#!/usr/bin/env python3
"""Read-only research import. Normal builds consume committed public JSON only.

Source ordinals define permanent E/N/P IDs. Private provenance is an audit record,
never a client import. Editorial overlays intentionally do not reproduce research
paragraphs. Re-running requires the original nine research documents explicitly.
"""
import argparse
import csv
import hashlib
import io
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

FILES = ['00_executive_findings.md','01_private_equity_knowledge_base.md',
 '02_private_credit_deep_dive.md','03_capital_providers_and_firms.md',
 '04_numbers_and_rules_of_thumb.md','05_high_value_videos.md',
 '06_claims_and_evidence.csv','07_gaps_contradictions_and_open_questions.md',
 '08_transcript_inventory.csv']
SOURCE_FIELDS = {'id':'video_id','title':'video_title','url':'video_url',
 'sourceFile':'source_file','transcriptSource':'transcript_source'}

def aligned_sources(row):
    columns={key:[s.strip() for s in row[field].split('||')] for key,field in SOURCE_FIELDS.items()}
    lengths={len(v) for v in columns.values()}
    if len(lengths)!=1: raise ValueError(f'Unaligned evidence source columns: { {k:len(v) for k,v in columns.items()} }')
    return [dict(zip(columns,values)) for values in zip(*columns.values())]

def markdown_cells(line):
    return [cell.strip().replace('\\|','|') for cell in re.split(r'(?<!\\)\|',line.strip())[1:-1]]

def first_table(document):
    table=[]
    for line in document.splitlines():
        if line.startswith('|'):table.append(markdown_cells(line))
        elif table:break
    if len(table)<2:raise ValueError('Missing Markdown table')
    width=len(table[0])
    for row in table[2:]:
        if len(row)!=width:raise ValueError(f'Broken Markdown row: {len(row)} != {width}')
    return table[0],table[2:]

def confidence(text):
    for level in ['low','medium','high']:
        if re.search(r'\b'+level+r'\b',text,re.I):return level
    return 'low'

# Text matching is restricted to research content, never inferred from video titles.
PATTERNS={
'acquisition-entrepreneurship':r'search fund|search capital|search runway|entrepreneur|deal.by.deal|alternative pe',
'acquisition-process':r'acquisition process|completion|closing|close|transaction timeline|search duration',
'target-selection':r'target|screen|sector|search box|search criteria',
'sourcing':r'sourc|outreach|pipeline|lead|teaser|off.market|on.market',
'brokers':r'broker|intermediar|kbs|unloq|benchmark international',
'loi':r'\bloi\b|letter of intent|exclusiv|indicative offer',
'ebitda':r'ebitda|earnings|pretax|\bebit\b|\bpbt\b',
'adjusted-ebitda':r'adjust|normaliz|sustainable|addback|add.back',
'cash-flow':r'cash.flow|free cash|liquidity|cash residue|cash extraction',
'working-capital':r'working capital|debtors|receivable|creditor|retention|payment terms',
'enterprise-value':r'enterprise value|\bev\b|valuation',
'equity-value':r'equity value|stake value|net worth|wealth',
'valuation-multiples':r'multiple|[0-9]x|valuation|entry price|purchase price',
'due-diligence':r'diligence|\bdd\b|accounts|bank statements|warrant|disclos',
'customer-concentration':r'concentrat|customer loss|client.loss|one customer|water exposure',
'capital-stack':r'capital stack|funding mix|funding split|funding structure|lbo|leverage',
'leverage':r'leverage|debt.to|debt/|gearing|lbo',
'buyer-equity':r'buyer.equity|own money|own cash|skin.in|sponsor equity|sweat equity',
'investor-equity':r'investor|equity|family.office|fundrais',
'seller-financing':r'seller financ|seller funding|seller loan|vendor|seller component',
'deferred-consideration':r'defer|instalment|balloon|seller payment|later payment',
'earn-outs':r'earn.out|earnout',
'rollover-equity':r'rollover|roll.over|remaining shares|seller.*retain|partial acquisition|75%.*25%',
'preferred-equity':r'prefer(red|ence)|waterfall|liquidation',
'bank-debt':r'\bbank\b|banks|banking',
'government-backed-lending':r'\bsba\b|government.back|government.guarante',
'asset-based-lending':r'asset.based|asset.back|machinery|plant|appraisal|liquidation value',
'receivables-finance':r'receivable|invoice|debtor|discount',
'private-credit':r'private.credit|nonbank|non.bank|credit fund',
'institutional-debt':r'institutional.debt|institutional.credit|credit.company',
'senior-debt':r'senior|first.lien|first.charge',
'subordination':r'subordin|ranking|junior|intercreditor',
'debt-pricing':r'interest|coupon|cost.of.capital|libor|sonia|apr|loan pricing',
'amortization':r'amortiz|amortis|repay|debt.free|deleverag|principal',
'debt-service':r'debt.service|dscr|coverage|servicing|cash residue',
'covenants':r'covenant|change.of.control|monitoring|extraction|reporting',
'collateral':r'collateral|security|secured|unencumbered|tangible|appraisal',
'personal-guarantees':r'personal.guarante|\bpg\b|guarantor|cross.guarante',
'refinancing':r'refinanc',
'management':r'manage|manager|operator|ceo|staff|employee|board|chair|hire|intern|handover',
'roll-ups':r'roll.up|rollup|group|platform|portfolio|consolidat',
'bolt-ons':r'bolt.on|add.on|synerg|integration',
'returns-and-exits':r'exit|return|dividend|listing|ipo|carry|hurdle',
'irr-and-moic':r'\birr\b|\bmoic\b|annualiz|return timing|compounded',
}

def topics_for(text):
    return [topic for topic,pattern in PATTERNS.items() if re.search(pattern,text,re.I)]

def category(topics):
    if any(t in topics for t in ['debt-pricing','debt-service','amortization','bank-debt','private-credit','capital-stack','receivables-finance','collateral']):return 'Financing'
    if any(t in topics for t in ['returns-and-exits','management','roll-ups']):return 'Operating and exits'
    if any(t in topics for t in ['valuation-multiples','ebitda','cash-flow','working-capital']):return 'Understanding the numbers'
    if any(t in topics for t in ['seller-financing','deferred-consideration','rollover-equity','preferred-equity']):return 'Deal structure'
    if any(t in topics for t in ['sourcing','target-selection','brokers','loi']):return 'Finding deals'
    return 'Fundamentals'

def write_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')

def preserve_video_additions(imported, existing):
    original_ids = {video['id'] for video in imported}
    additions = [video for video in existing if video['id'] not in original_ids]
    if len({video['id'] for video in additions}) != len(additions):
        raise ValueError('Duplicate supplemental video identity')
    for video in additions:
        if not video.get('transcript', {}).get('method') or video.get('url') != 'https://www.youtube.com/watch?v=' + video['id']:
            raise ValueError('Supplemental video needs reviewed transcript provenance and canonical URL')
    return imported + additions

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,required=True,help='Folder containing the nine original research documents (read only)')
    parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1],help='Independent site project root')
    args=parser.parse_args(); dest=args.output
    if dest.resolve()==args.input.resolve() or args.input.resolve() in dest.resolve().parents:
        raise ValueError('Output must be outside the read-only research directory')
    # Read exactly the research files; never traverse or copy the raw transcript corpus.
    blobs={name:(args.input/name).read_bytes() for name in FILES}
    docs={name:data.decode('utf-8-sig') for name,data in blobs.items()}
    contract=json.loads((Path(__file__).resolve().parents[1]/'docs/content-contract.json').read_text())
    if set(PATTERNS)!=set(contract['topics']):raise ValueError('Topic mapping drift')
    raw_evidence=list(csv.DictReader(io.StringIO(docs[FILES[6]])))
    inventory=list(csv.DictReader(io.StringIO(docs[FILES[8]])))
    number_headers,number_rows=first_table(docs[FILES[4]])
    provider_headers,provider_rows=first_table(docs[FILES[3]])
    if tuple(map(len,[raw_evidence,inventory,number_rows,provider_rows]))!=(243,117,313,28):raise ValueError('Unexpected source row counts; review stable identity mapping before importing')
    editorial_root=Path(__file__).resolve().parents[1]/'src/data'
    number_ed=json.loads((editorial_root/'number-editorial.json').read_text())
    provider_ed=json.loads((editorial_root/'provider-editorial.json').read_text())
    video_index={row['video_id']:row for row in inventory}
    provenance={'schemaVersion':1,'evidence':[],'videos':inventory,'numbers':[],'providers':[],'researchDocuments':[]}
    evidence=[]
    for ordinal,row in enumerate(raw_evidence,1):
        ident=f'E{ordinal:03}';sources=aligned_sources(row)
        for source in sources:
            if source['id'] not in video_index:raise ValueError(f'Unknown video {source}')
            if parse_qs(urlparse(source['url']).query).get('v')!=[source['id']]:raise ValueError(f'URL mismatch {source}')
        ts=topics_for(' '.join(row[k] for k in ['topic','subtopic','claim']))
        ts=ts or {'E095':['target-selection'],'E171':['returns-and-exits'],'E220':['due-diligence'],'E243':['debt-pricing']}.get(ident,[])
        evidence.append(dict(id=ident,label=row['subtopic'],type=row['claim_type'].replace('_','-'),confidence=confidence(row['confidence']),videoIds=[s['id'] for s in sources],topics=ts))
        provenance['evidence'].append(dict(id=ident,sourceDocument=FILES[6],dataRow=ordinal,original=row,sources=sources))
    def table_sources(cell,urls):
        ids=re.findall(r'ID `([^`]+)`',cell)
        original_urls=re.findall(r'https://www\.youtube\.com/watch\?v=[\w-]+',urls)
        if not ids or len(ids)!=len(original_urls):raise ValueError('Table source alignment failed')
        result=[]
        for ident,url in zip(ids,original_urls):
            if ident not in video_index or parse_qs(urlparse(url).query).get('v')!=[ident]:raise ValueError('Table URL identity failed')
            record=video_index[ident]
            result.append(dict(id=ident,title=record['title'],url=url,sourceFile=record['source_file'],transcriptSource=record['transcript_source']))
        return result
    numbers=[]
    for ordinal,row in enumerate(number_rows,1):
        ident=f'N{ordinal:03}';ed=number_ed[ident];sources=table_sources(row[4],row[5]);ts=ed.get('topics') or topics_for(' '.join(row[:4]))
        caution=ed['caution']
        if 'mlx_whisper_audio' in row[6]:caution+=' Includes audio recovered with Whisper; amounts and wording have not been independently verified.'
        numbers.append(dict(id=ident,metric=ed.get('metric',row[0]),value=row[1],context=ed['context'],kind=ed['kind'],confidence=confidence(row[7]),caution=caution,videoIds=[s['id'] for s in sources],topics=ts,category=category(ts)))
        provenance['numbers'].append(dict(id=ident,sourceDocument=FILES[4],dataRow=ordinal,original=dict(zip(number_headers,row)),sources=sources))
    providers=[]
    for ordinal,row in enumerate(provider_rows,1):
        ident=f'P{ordinal:03}';ed=provider_ed[ident];sources=table_sources(row[6],row[7]);ts=topics_for(' '.join(row[:6])) or ['acquisition-entrepreneurship']
        providers.append(dict(id=ident,**ed,confidence=confidence(row[8]),videoIds=[s['id'] for s in sources],topics=ts))
        provenance['providers'].append(dict(id=ident,sourceDocument=FILES[3],dataRow=ordinal,original=dict(zip(provider_headers,row)),sources=sources))
    videos=[]
    for row in inventory:
        ident=row['video_id'];related=[e for e in evidence if ident in e['videoIds']]
        source_topics=list(dict.fromkeys(t for e in related for t in e['topics']))
        # Numerical examples and provider references are evidence too. Do not use title words.
        if not source_topics:source_topics=list(dict.fromkeys(t for record in numbers+providers if ident in record['videoIds'] for t in record['topics']))
        informative=bool(source_topics)
        human=[t.replace('-',' ') for t in source_topics[:5]]
        summary=('Topics supported by this collection: '+', '.join(human)+'.') if informative else 'The recovered material does not establish a substantive acquisition or financing lesson.'
        if informative:summary+=' Use the linked evidence and contextual notes to distinguish examples, opinions and reported experience.'
        else:summary+=' Retained in the source index for completeness; no claims are inferred from the title.'
        videos.append(dict(id=ident,title=row['title'],url=row['url'],collection='yusufa-sey',summary=summary,topics=source_topics,usefulPE=row['useful_PE_content'].lower()=='true',usefulDebt=row['useful_debt_content'].lower()=='true',limited=not informative or row['useful_PE_content'].lower()!='true'))
    existing_videos = editorial_root/'videos.json'
    if existing_videos.exists():
        videos = preserve_video_additions(videos, json.loads(existing_videos.read_text()))
    # Audit all nine inputs by digest and section inventory without publishing their prose.
    for name,doc in docs.items():
        provenance['researchDocuments'].append(dict(file=name,sha256=hashlib.sha256(blobs[name]).hexdigest(),headings=re.findall(r'^#{1,6} (.+)$',doc,re.M),bytes=len(blobs[name])))
    for name,records in [('evidence',evidence),('videos',videos),('numbers',numbers),('providers',providers)]:write_json(dest/f'src/data/{name}.json',records)
    write_json(dest/'private/provenance.json',provenance)
    manifest=dict(schemaVersion=1,inputs=[dict(file=name,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data)) for name,data in blobs.items()],counts=dict(evidence=len(evidence),videos=len(videos),numbers=len(numbers),providers=len(providers)),idPolicy='1-based source table/CSV row ordinal; video IDs unchanged',rawTranscriptsCopied=False)
    write_json(dest/'private/import-manifest.json',manifest)
    # Verify that none of the original research bytes changed during import.
    for name,data in blobs.items():
        if (args.input/name).read_bytes()!=data:raise RuntimeError(f'Source changed during import: {name}')
    print(json.dumps(manifest['counts']))

if __name__=='__main__':main()
