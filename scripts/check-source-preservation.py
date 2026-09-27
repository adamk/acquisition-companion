#!/usr/bin/env python3
"""Optional local audit; not needed by a normal standalone production build."""
import argparse,hashlib,json,re
from pathlib import Path
from html.parser import HTMLParser
parser=argparse.ArgumentParser();parser.add_argument('--manifest',required=True);parser.add_argument('--corpus-root',required=True);parser.add_argument('--dist',default='dist');a=parser.parse_args()
manifest=json.loads(Path(a.manifest).read_text());changed=[p for p,h in manifest.items() if not Path(p).exists() or hashlib.sha256(Path(p).read_bytes()).hexdigest()!=h]
assert not changed,'Read-only sources changed: '+str(changed)
root=Path(a.corpus_root);sources=list((root/'subtitles'/'Yusufa Sey - Videos').glob('Yusufa Sey - Videos_part*.md'))+list((root/'whisper_corpus').glob('*.md'))
def words(s):return re.findall(r"[a-z0-9]+",s.lower())
size=50;grams=set()
for p in sources:
 w=words(p.read_text())
 for i in range(len(w)-size+1):grams.add(hashlib.sha256(' '.join(w[i:i+size]).encode()).digest())
class BodyText(HTMLParser):
 def __init__(self):super().__init__();self.depth=0;self.main=False;self.skip=0;self.parts=[];self.stack=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs);self.stack.append((tag,self.main,self.skip))
  if tag=='main':self.main=True
  if tag in ['script','style','a'] or 'data-pagefind-ignore' in attrs:self.skip+=1
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:
    _,self.main,self.skip=self.stack[i];self.stack=self.stack[:i];break
 def handle_data(self,data):
  if self.main and not self.skip:self.parts.append(data)
matches=[]
for p in Path(a.dist).rglob('*.html'):
 reader=BodyText();reader.feed(p.read_text());w=words(' '.join(reader.parts))
 for i in range(len(w)-size+1):
  if hashlib.sha256(' '.join(w[i:i+size]).encode()).digest() in grams:
   matches.append({'page':str(p),'words':size,'sample':' '.join(w[i:i+12])});break
assert not matches,'Long verbatim matches: '+json.dumps(matches)
result={'protectedInputFiles':len(manifest),'rawTranscriptFilesCompared':len(sources),'windowWords':size,'longVerbatimMatches':len(matches),'sourceHashes':'unchanged'}
Path('artifacts').mkdir(exist_ok=True);Path('artifacts/source-preservation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
