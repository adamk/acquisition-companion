import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DEFAULT_ORIGIN = 'https://acquisitioncompanion.com';
const DOCUMENT_PREFIX = 'ac-';

function safeOrigin(value) {
  const url = new URL(value || DEFAULT_ORIGIN);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('AI corpus site origin must be a public HTTPS origin.');
  }
  return url.origin;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"')) {
    return JSON.parse(trimmed);
  }
  if (trimmed.startsWith("'")) return trimmed.slice(1, -1).replaceAll("''", "'");
  if (/^(true|false|null|\d+(?:\.\d+)?)$/.test(trimmed)) return JSON.parse(trimmed);
  return trimmed;
}

function parseFrontmatter(markdown, filename) {
  const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`Missing frontmatter in ${filename}`);
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon < 1) throw new Error(`Unsupported frontmatter in ${filename}`);
    fields[line.slice(0, colon).trim()] = parseScalar(line.slice(colon + 1));
  }
  return {fields, body:match[2].trim()};
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function publicSources(fields, videosById, fundsById, filename) {
  const sources = Array.isArray(fields.sources) ? fields.sources : [];
  const fundSources = Array.isArray(fields.fundSources) ? fields.fundSources : [];
  const evidence = Array.isArray(fields.evidence) ? fields.evidence : [];
  const originalSources = [];
  for (const id of sources) {
    const source = videosById.get(id);
    if (!source || !isPublicHttpsUrl(source.url)) throw new Error(`Unresolved public video source ${id} in ${filename}`);
    originalSources.push({family:'Yusufa Sey', title:source.title, url:source.url});
  }
  for (const id of fundSources) {
    const source = fundsById.get(id);
    if (!source || !isPublicHttpsUrl(source.url)) throw new Error(`Unresolved public Fund Launch source ${id} in ${filename}`);
    originalSources.push({family:'Fund Launch', title:source.title, url:source.url});
  }
  const sourceFamilies = [];
  if (sources.length || evidence.length) sourceFamilies.push('Yusufa Sey-derived education');
  if (fundSources.length) sourceFamilies.push('Fund Launch enrichment');
  if (!sourceFamilies.length) sourceFamilies.push('Acquisition Companion original synthesis');
  return {
    sourceFamilies,
    originalSources,
    publicSourceReferences:{yusufaVideoIds:sources, evidenceIds:evidence, fundLaunchGuideIds:fundSources},
  };
}

function isPublicHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function contentDocument({filename,title,url,contentType,body,metadata}) {
  const categories = [
    `Authorship: Acquisition Companion authored public education`,
    `Editorial lineage: ${metadata.sourceFamilies.join('; ')}`,
    `Canonical page: ${url}`,
    `Page type: ${contentType}`,
  ];
  if (metadata.module !== undefined) categories.push(`Curriculum module: ${metadata.module}`);
  if (metadata.topics?.length) categories.push(`Topics: ${metadata.topics.join(', ')}`);
  if (metadata.publicSourceReferences.evidenceIds.length) categories.push(`Public evidence references: ${metadata.publicSourceReferences.evidenceIds.join(', ')}`);
  if (metadata.publicSourceReferences.yusufaVideoIds.length) categories.push(`Public video references: ${metadata.publicSourceReferences.yusufaVideoIds.join(', ')}`);
  if (metadata.publicSourceReferences.fundLaunchGuideIds.length) categories.push(`Public guide references: ${metadata.publicSourceReferences.fundLaunchGuideIds.join(', ')}`);
  if (metadata.originalSources.length) {
    categories.push('Original sources already linked by this page:');
    for (const source of metadata.originalSources) categories.push(`- ${source.family}: ${source.title} — ${source.url}`);
  }
  return {filename, content:`# ${title}\n\n${categories.join('\n')}\n\n${body}\n`, metadata};
}

function markdownDocuments(root, siteOrigin, videosById, fundsById) {
  const groups = [
    {folder:'lessons', contentType:'lesson', route:'/course/'},
    {folder:'topics', contentType:'topic', route:'/topics/'},
    {folder:'examples', contentType:'example', route:'/examples/'},
  ];
  const documents = [];
  for (const group of groups) {
    const directory = path.join(root, 'src/content', group.folder);
    for (const filename of fs.readdirSync(directory).filter(name => name.endsWith('.md')).sort()) {
      const slug = filename.slice(0, -3);
      const relative = path.posix.join('src/content', group.folder, filename);
      const {fields, body} = parseFrontmatter(fs.readFileSync(path.join(directory, filename), 'utf8'), relative);
      if (typeof fields.title !== 'string' || !body) throw new Error(`Incomplete authored content in ${relative}`);
      const sources = publicSources(fields, videosById, fundsById, relative);
      const url = `${siteOrigin}${group.route}${slug}/`;
      const metadata = {
        title:fields.title,
        slug,
        contentType:group.contentType,
        module:group.contentType === 'lesson' ? fields.module : undefined,
        topics:group.contentType === 'topic' ? [slug, ...(fields.related || [])] : (fields.topics || []),
        status:group.contentType === 'example' ? fields.status : undefined,
        authorship:'Acquisition Companion',
        sourceFamilies:sources.sourceFamilies,
        publicSourceReferences:sources.publicSourceReferences,
        originalSources:sources.originalSources,
        url,
      };
      const prefix = `${DOCUMENT_PREFIX}${group.contentType}--`;
      documents.push(contentDocument({filename:`${prefix}${slug}.md`,title:fields.title,url,contentType:group.contentType,body,metadata}));
    }
  }
  return documents;
}

export function buildAiCorpus({root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), siteOrigin=process.env.SITE_URL || DEFAULT_ORIGIN}={}) {
  const origin = safeOrigin(siteOrigin);
  const videosById = new Map(readJson(root, 'src/data/videos.json').map(source => [source.id, source]));
  const fundsById = new Map(readJson(root, 'src/data/fund-launch.json').map(source => [source.id, source]));
  const documents = markdownDocuments(root, origin, videosById, fundsById);

  const glossary = readJson(root, 'src/data/glossary.json');
  for (const term of glossary) {
    const metadata = {
      title:term.term,
      slug:term.id,
      contentType:'glossary',
      topics:[term.topic],
      authorship:'Acquisition Companion',
      sourceFamilies:['Acquisition Companion original synthesis'],
      publicSourceReferences:{yusufaVideoIds:[], evidenceIds:[], fundLaunchGuideIds:[]},
      originalSources:[],
      url:`${origin}/glossary/#${term.id}`,
    };
    documents.push(contentDocument({filename:`${DOCUMENT_PREFIX}glossary--${term.id}.md`,title:term.term,url:metadata.url,contentType:'glossary',body:term.definition,metadata}));
  }

  const modules = readJson(root, 'src/data/modules.json');
  for (const module of modules) {
    const metadata = {
      title:`Module ${module.number}: ${module.title}`,
      slug:`module-${module.number}`,
      contentType:'module',
      module:module.number,
      topics:[],
      authorship:'Acquisition Companion',
      sourceFamilies:['Acquisition Companion original synthesis'],
      publicSourceReferences:{yusufaVideoIds:[], evidenceIds:[], fundLaunchGuideIds:[]},
      originalSources:[],
      url:`${origin}/course/#module-${module.number}`,
    };
    documents.push(contentDocument({filename:`${DOCUMENT_PREFIX}module--${String(module.number).padStart(2,'0')}.md`,title:metadata.title,url:metadata.url,contentType:'module',body:module.description,metadata}));
  }

  documents.sort((a,b)=>a.filename.localeCompare(b.filename));
  const manifest = Object.fromEntries(documents.map(({filename,metadata}) => [filename, metadata]));
  return {documents, manifest};
}

export function writeAiCorpus({root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), siteOrigin=process.env.SITE_URL || DEFAULT_ORIGIN}={}) {
  const corpus = buildAiCorpus({root,siteOrigin});
  const outputDirectory = path.join(root, 'artifacts', 'ai-corpus');
  const manifestPath = path.join(root, 'src/data/ai-corpus-manifest.json');
  fs.mkdirSync(outputDirectory, {recursive:true});
  for (const filename of fs.readdirSync(outputDirectory)) {
    if (/^ac-(?:lesson|topic|example|glossary|module)--[a-z0-9-]+\.md$/.test(filename)) {
      fs.rmSync(path.join(outputDirectory, filename));
    }
  }
  for (const document of corpus.documents) fs.writeFileSync(path.join(outputDirectory, document.filename), document.content, 'utf8');
  fs.writeFileSync(manifestPath, `${JSON.stringify(corpus.manifest, null, 2)}\n`, 'utf8');
  return {count:corpus.documents.length, outputDirectory, manifestPath};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = writeAiCorpus();
  console.log(`Generated ${result.count} public curriculum documents in ${path.relative(process.cwd(), result.outputDirectory)}.`);
  console.log(`Citation manifest: ${path.relative(process.cwd(), result.manifestPath)}`);
}
