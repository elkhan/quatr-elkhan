import { useEffect, useRef } from "react";
import type { FilingsResponse, FilingsSearch } from "./types/filings";

interface FilingsResultsProps {
  readonly data: FilingsResponse;
  readonly search: FilingsSearch;
  readonly onPage: (page: number) => void;
}

export function FilingsResults({ data, search, onPage }: FilingsResultsProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Pagination disappears while loading. Restore lost focus without interrupting another control.
    if (document.activeElement === document.body) heading.current?.focus();
  }, []);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const order = search.sort === "asc" ? "Oldest first" : "Newest first";
  const form = search.form.trim() || "All forms";
  const isEmpty = data.filings.length === 0;
  const beyondEnd = data.page > pages;
  const emptyMessage = beyondEnd
    ? "This page is no longer available. The filing total may have changed."
    : "No filings match these criteria.";
  const pageDescription = beyondEnd
    ? `Page ${data.page} is unavailable`
    : `Page ${data.page} of ${pages}`;
  return (
    <div className="results">
      <h3 ref={heading} tabIndex={-1}>
        {data.company.name} ({data.company.ticker})
      </h3>
      <p className="result-meta">
        {data.total.toLocaleString("en-US")} matching filings · {form} · {order}
      </p>
      {isEmpty ? (
        <div className="empty-state">
          <p>{emptyMessage}</p>
          {beyondEnd && (
            <button type="button" onClick={() => onPage(1)}>
              Go to first page
            </button>
          )}
        </div>
      ) : (
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The horizontal table viewport needs keyboard scrolling.
        <section className="table-scroll" aria-label="Filing records" tabIndex={0}>
          <table>
            <caption className="sr-only">Filings for {data.company.name}</caption>
            <thead>
              <tr>
                <th scope="col">Form</th>
                <th scope="col">Filed</th>
                <th scope="col">Accession number</th>
                <th scope="col">Original document</th>
              </tr>
            </thead>
            <tbody>
              {data.filings.map((filing) => (
                <tr key={filing.accessionNumber}>
                  <td>
                    <span className="form-label">{filing.form}</span>
                  </td>
                  <td>
                    <time dateTime={filing.filingDate}>{filing.filingDate}</time>
                  </td>
                  <td className="accession">{filing.accessionNumber}</td>
                  <td>
                    <a
                      href={filing.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${filing.form} filing ${filing.accessionNumber} (opens in new tab)`}
                    >
                      Open filing ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <nav className="pagination" aria-label="Filing pagination">
        <button type="button" onClick={() => onPage(data.page - 1)} disabled={data.page <= 1}>
          Previous page
        </button>
        <span>{pageDescription}</span>
        <button type="button" onClick={() => onPage(data.page + 1)} disabled={data.page >= pages}>
          Next page
        </button>
      </nav>
    </div>
  );
}
