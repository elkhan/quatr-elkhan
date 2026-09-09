import { createCache } from "./cache";
import { SecError } from "./errors/sec";
import { createSecHttpClient } from "./http";
import { normalizeFilings } from "./normalize";
import { parseDirectory, parseTicker } from "./schemas/company";
import { parseArchive, parseSubmissions } from "./schemas/filing";
import type {
  CachedCompanyHistory,
  Company,
  CompanyDirectory,
  CompanyHistory,
  SecClient,
} from "./types/company";
import type { FilingRow, Submissions } from "./types/filing";
import type { SecHttpOptions } from "./types/http";

const DIRECTORY_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_URL = "https://data.sec.gov/submissions/";

export function createSecClient(options: SecHttpOptions): SecClient {
  const http = createSecHttpClient(options);
  const directoryCache = createCache<CompanyDirectory>();
  const historyCache = createCache<CachedCompanyHistory>();

  async function loadDirectory(): Promise<CompanyDirectory> {
    const payload = await http.getJson(DIRECTORY_URL);
    return parseDirectory(payload);
  }

  async function resolveCompany(input: string): Promise<Company> {
    const ticker = parseTicker(input);
    const directory = await directoryCache.remember(DIRECTORY_URL, loadDirectory);
    const entry = Object.values(directory).find((company) => company.ticker === ticker);
    if (!entry) {
      throw new SecError(
        "TICKER_NOT_FOUND",
        `${ticker} is not in SEC's ticker directory. Ticker lookup does not cover every filer.`,
      );
    }
    return { ticker, cik: entry.cik_str, name: entry.title };
  }

  async function loadSubmissions(cik: string): Promise<Submissions> {
    const payload = await http.getJson(`${SUBMISSIONS_URL}CIK${cik}.json`);
    return parseSubmissions(payload, cik);
  }

  async function loadArchive(filename: string): Promise<FilingRow[]> {
    const payload = await http.getJson(`${SUBMISSIONS_URL}${filename}`);
    return parseArchive(payload, filename);
  }

  async function loadCompanyHistory(cik: string): Promise<CachedCompanyHistory> {
    const submissions = await loadSubmissions(cik);
    const sources = [submissions.filings.recent];
    const archiveNames = new Set(submissions.filings.files.map((file) => file.name));
    for (const filename of archiveNames) {
      sources.push(await loadArchive(filename));
    }
    return { name: submissions.name, filings: normalizeFilings(cik, sources) };
  }

  async function getCompanyHistory(input: string): Promise<CompanyHistory> {
    const company = await resolveCompany(input);
    const history = await historyCache.remember(company.cik, () => loadCompanyHistory(company.cik));
    return { company: { ...company, name: history.name }, filings: history.filings };
  }

  return { getCompanyHistory };
}
