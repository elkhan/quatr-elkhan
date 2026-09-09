import { type SubmitEvent, useState } from "react";
import type { FilingsSearch } from "./types/filings";

interface FilingsSearchFormProps {
  readonly onSearch: (criteria: FilingsSearch) => void;
}

export function FilingsSearchForm({ onSearch }: FilingsSearchFormProps) {
  const [ticker, setTicker] = useState("AAPL");
  const [form, setForm] = useState("");
  const [sort, setSort] = useState<FilingsSearch["sort"]>("desc");

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch({ ticker, form, sort, page: 1 });
  }

  function selectCompany(value: string) {
    setTicker(value);
    onSearch({ ticker: value, form, sort, page: 1 });
  }

  return (
    <>
      <form onSubmit={submit} className="filing-controls" noValidate>
        <div className="field">
          <label htmlFor="ticker">Ticker</label>
          <input
            id="ticker"
            value={ticker}
            onChange={(event) => setTicker(event.target.value)}
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby="ticker-help"
          />
        </div>
        <div className="field">
          <label htmlFor="form-filter">Form filter</label>
          <input
            id="form-filter"
            value={form}
            onChange={(event) => setForm(event.target.value)}
            placeholder="All forms"
            list="common-forms"
            aria-describedby="form-help"
          />
        </div>
        <datalist id="common-forms">
          {["10-K", "10-Q", "8-K", "10-K/A", "20-F", "6-K"].map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <div className="field">
          <label htmlFor="sort">Filing date order</label>
          <select
            id="sort"
            value={sort}
            onChange={(event) => {
              if (event.target.value === "asc" || event.target.value === "desc")
                setSort(event.target.value);
            }}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <button className="primary" type="submit">
          Search filings
        </button>
      </form>
      <p id="form-help" className="help">
        Exact form names, including amendments and foreign forms. Leave blank for all forms; submit
        to apply changes.
      </p>
      <div className="shortcuts">
        <span>Try a company</span>
        {["AAPL", "SPOT", "JPM"].map((value) => (
          <button key={value} type="button" onClick={() => selectCompany(value)}>
            {value}
          </button>
        ))}
      </div>
      <p id="ticker-help" className="help">
        Ticker lookup does not cover every SEC filer. An unmapped ticker does not mean the company
        does not exist.
      </p>
    </>
  );
}
