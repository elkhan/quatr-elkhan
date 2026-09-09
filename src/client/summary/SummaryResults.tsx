import type { CompanySummary, SummaryResponse } from "./types/summary";

function CompanyResult({ result }: { readonly result: CompanySummary }) {
  if (result.status === "error") {
    return (
      <article className="summary-company">
        <h3>{result.ticker}</h3>
        <p role="alert" className="error-text">
          {result.error.message}
        </p>
      </article>
    );
  }
  const counts = Object.entries(result.countsByForm).toSorted(([left], [right]) =>
    left.localeCompare(right),
  );
  const latest10K = result.latest10KDate ?? "None found";
  const hasCounts = counts.length > 0;
  return (
    <article className="summary-company">
      <h3>
        {result.company.name} ({result.ticker})
      </h3>
      <p className="annual-date">
        Latest exact 10-K <strong>{latest10K}</strong>
      </p>
      {hasCounts ? (
        <table>
          <caption className="sr-only">Form counts for {result.ticker}</caption>
          <thead>
            <tr>
              <th scope="col">Form</th>
              <th scope="col" className="number">
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {counts.map(([form, count]) => (
              <tr key={form}>
                <td>{form}</td>
                <td className="number">{count.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">No filings in this window.</p>
      )}
    </article>
  );
}

export function SummaryResults({ data }: { readonly data: SummaryResponse }) {
  return (
    <section aria-label="Summary results" className="results">
      <p className="result-meta">
        {data.window.from} through {data.window.to} (inclusive, UTC)
      </p>
      <div className="summary-grid">
        {data.results.map((result) => (
          <CompanyResult key={result.ticker} result={result} />
        ))}
      </div>
    </section>
  );
}
