import { FilingsBrowser } from "./filings/FilingsBrowser";
import { SummaryBrowser } from "./summary/SummaryBrowser";

export function App() {
  return (
    <main>
      <header className="page-header">
        <p className="eyebrow">EDGAR · Company research</p>
        <h1>SEC filings</h1>
        <p>Company filing history and summaries, with original documents one click away.</p>
      </header>
      <FilingsBrowser />
      <SummaryBrowser />
      <footer>
        Public filing data from the U.S. Securities and Exchange Commission. Filing dates use
        YYYY-MM-DD.
      </footer>
    </main>
  );
}
