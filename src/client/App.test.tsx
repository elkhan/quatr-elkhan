import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { App } from "./App";

it("renders the filing browser introduction", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1, name: "SEC filings" })).toBeVisible();
  expect(screen.getByRole("main")).toHaveTextContent("Company filing history and summaries");
});
