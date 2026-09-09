import { useState } from "react";
import { useRequest } from "../api/use-request";
import { loadFilings } from "./api";
import { FilingsResults } from "./FilingsResults";
import { FilingsSearchForm } from "./FilingsSearchForm";
import type { FilingsResponse, FilingsSearch } from "./types/filings";

export function FilingsBrowser() {
  const [search, setSearch] = useState<FilingsSearch | null>(null);
  const { state, run } = useRequest<FilingsResponse>();

  function requestFilings(criteria: FilingsSearch) {
    setSearch(criteria);
    void run((signal) => loadFilings(criteria, signal));
  }

  function changePage(page: number) {
    if (search) requestFilings({ ...search, page });
  }

  return (
    <section className="panel" aria-labelledby="filings-heading">
      <div className="section-heading">
        <span className="section-number">01</span>
        <h2 id="filings-heading">Filing history</h2>
      </div>
      <p className="muted">Explore complete available history, including archived submissions.</p>
      <FilingsSearchForm onSearch={requestFilings} />
      <div aria-live="polite" aria-atomic="true">
        {state.status === "idle" && (
          <p className="empty-state">Search a ticker to see its filings.</p>
        )}
        {state.status === "loading" && (
          <output className="loading">
            Loading filing history… Large histories can take a little longer.
          </output>
        )}
      </div>
      {state.status === "error" && (
        <div className="error-state">
          <p role="alert">{state.message}</p>
          <button
            type="button"
            onClick={() => {
              if (search) requestFilings(search);
            }}
          >
            Retry filings
          </button>
        </div>
      )}
      {state.status === "success" && search && (
        <FilingsResults data={state.data} search={search} onPage={changePage} />
      )}
    </section>
  );
}
