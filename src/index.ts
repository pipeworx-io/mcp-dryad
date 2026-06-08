interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Dryad (datadryad.org) MCP — keyless.
 *
 * Dryad is a curated, open repository of research datasets, most of them the
 * underlying data for published, peer-reviewed studies across every field of
 * science. Search datasets and fetch a dataset's metadata + download link by DOI.
 */


const BASE = 'https://datadryad.org/api/v2';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

interface DryadAuthor {
  firstName?: string;
  lastName?: string;
  affiliation?: string;
}

interface DryadDataset {
  identifier?: string;
  id?: number;
  title?: string;
  authors?: DryadAuthor[];
  abstract?: string;
  keywords?: string[];
  publicationDate?: string;
  relatedPublicationISSN?: string;
  fieldOfScience?: string;
  license?: string;
  versionNumber?: number;
  _links?: {
    'stash:download'?: { href?: string };
    self?: { href?: string };
  };
}

const tools: McpToolExport['tools'] = [
  {
    name: 'search_datasets',
    description:
      'Search Dryad, a curated repository of open research datasets (mostly the data underlying published, peer-reviewed studies in any field of science). Full-text query over titles, abstracts, authors and keywords. Returns matching datasets with DOI, title, authors, truncated abstract, keywords, publication date, field of science and license. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms (e.g. "coral bleaching", "maize genome").' },
        limit: { type: 'number', description: 'Max results per page (default 20, max 100).' },
        page: { type: 'number', description: 'Page number, 1-based (default 1).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_dataset',
    description:
      'Fetch a single Dryad dataset by its DOI (e.g. "doi:10.5061/dryad.hx3ffbgjj" or "10.5061/dryad.hx3ffbgjj"). Returns full metadata — title, authors, abstract, keywords, publication date, field of science, license, version — plus a download URL for the dataset files. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        doi: {
          type: 'string',
          description: 'Dataset DOI, with or without the "doi:" prefix (e.g. "doi:10.5061/dryad.hx3ffbgjj").',
        },
      },
      required: ['doi'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_datasets':
        return await searchDatasets(args);
      case 'get_dataset':
        return await getDataset(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function searchDatasets(args: Record<string, unknown>): Promise<unknown> {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (!query) return { error: 'Required argument "query" is missing.' };

  let limit = typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : 20;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  let page = typeof args.page === 'number' && Number.isFinite(args.page) ? Math.floor(args.page) : 1;
  if (page < 1) page = 1;

  const url = `${BASE}/search?q=${encodeURIComponent(query)}&per_page=${encodeURIComponent(String(limit))}&page=${encodeURIComponent(String(page))}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) return { error: `Dryad: ${res.status} ${(await res.text()).slice(0, 200)}` };

  const body = (await res.json()) as {
    total?: number;
    _embedded?: { 'stash:datasets'?: DryadDataset[] };
  };

  const raw = body?._embedded?.['stash:datasets'];
  const list = Array.isArray(raw) ? raw : [];
  const datasets = list.map((d) => ({
    doi: d.identifier,
    title: d.title,
    authors: mapAuthors(d.authors),
    abstract: truncate(d.abstract, 400),
    keywords: d.keywords,
    publication_date: d.publicationDate,
    field_of_science: d.fieldOfScience,
    license: d.license,
  }));

  return { count: datasets.length, total: body?.total, datasets };
}

async function getDataset(args: Record<string, unknown>): Promise<unknown> {
  const rawDoi = typeof args.doi === 'string' ? args.doi.trim() : '';
  if (!rawDoi) return { error: 'Required argument "doi" is missing.' };

  const doi = rawDoi.startsWith('doi:') ? rawDoi : `doi:${rawDoi}`;
  const url = `${BASE}/datasets/${encodeURIComponent(doi)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });

  if (res.status === 404) return { error: 'dataset not found', doi };
  if (!res.ok) return { error: `Dryad: ${res.status} ${(await res.text()).slice(0, 200)}` };

  const d = (await res.json()) as DryadDataset;

  let downloadUrl: string | undefined = d._links?.['stash:download']?.href;
  if (downloadUrl && downloadUrl.startsWith('/')) downloadUrl = `https://datadryad.org${downloadUrl}`;

  return {
    doi: d.identifier ?? doi,
    title: d.title,
    authors: mapAuthors(d.authors),
    abstract: d.abstract,
    keywords: d.keywords,
    publication_date: d.publicationDate,
    field_of_science: d.fieldOfScience,
    license: d.license,
    version: d.versionNumber,
    download_url: downloadUrl,
  };
}

function mapAuthors(authors: DryadAuthor[] | undefined): string[] {
  if (!Array.isArray(authors)) return [];
  return authors
    .map((a) => `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim())
    .filter((s) => s.length > 0);
}

function truncate(text: string | undefined, max: number): string | undefined {
  if (typeof text !== 'string') return text;
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
