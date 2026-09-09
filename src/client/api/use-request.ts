import { useEffect, useRef, useState } from "react";
import { ApiError } from "./errors/api";
import type { RequestState } from "./types/request";

export function useRequest<T>() {
  const activeRequest = useRef<AbortController | null>(null);
  const [state, setState] = useState<RequestState<T>>({ status: "idle" });

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function run(load: (signal: AbortSignal) => Promise<T>) {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setState({ status: "loading" });
    try {
      const data = await load(controller.signal);
      // Some transports can finish after cancellation; never let an old result replace a new one.
      if (!controller.signal.aborted) setState({ status: "success", data });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof ApiError ? error.message : "Could not reach the server. Please try again.";
      setState({ status: "error", message });
    }
  }

  return { state, run };
}
