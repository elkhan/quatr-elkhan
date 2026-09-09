import { type SubmitEvent, useState } from "react";
import { useRequest } from "../api/use-request";
import { loadSummary } from "./api";
import { SummaryResults } from "./SummaryResults";
import type { SummaryResponse } from "./types/summary";

export function SummaryBrowser() {
  const [tickers, setTickers] = useState("AAPL,SPOT,JPM");
  const [submitted, setSubmitted] = useState("");
  const { state, run } = useRequest<SummaryResponse>();

  function requestSummary(input: string) {
    setSubmitted(input);
    void run((signal) => loadSummary(input, signal));
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    requestSummary(tickers);
  }

  return (
    <section className="panel" aria-labelledby="summary-heading">
      <div className="section-heading">
        <span className="section-number">02</span>
        <h2 id="summary-heading">Company summaries</h2>
      </div>
      <p className="muted">Compare filing activity over the last 12 months.</p>
      <form className="summary-controls" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="summary-tickers">Summary tickers</label>
          <input
            id="summary-tickers"
            value={tickers}
            onChange={(event) => setTickers(event.target.value)}
            aria-describedby="summary-help"
            spellCheck={false}
            autoCapitalize="characters"
          />
        </div>
        <button className="primary" type="submit">
          Summarize
        </button>
      </form>
      <p id="summary-help" className="help">
        Up to 10 tickers, separated by commas. Counts keep exact form names; latest 10-K considers
        all history through today. Foreign annual reports and amendments are separate forms.
      </p>
      <div aria-live="polite" aria-atomic="true">
        {state.status === "idle" && (
          <p className="empty-state">Enter tickers to compare their filings.</p>
        )}
        {state.status === "loading" && (
          <output className="loading">
            Loading summaries… Each company requires its complete history.
          </output>
        )}
      </div>
      {state.status === "error" && (
        <div className="error-state">
          <p role="alert">{state.message}</p>
          <button type="button" onClick={() => requestSummary(submitted)}>
            Retry summary
          </button>
        </div>
      )}
      {state.status === "success" && <SummaryResults data={state.data} />}
    </section>
  );
}
