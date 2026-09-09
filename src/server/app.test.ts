import express from "express";
import { expect, it, vi } from "vitest";

it("imports and constructs the app without opening a listening port", async () => {
  const listen = vi.spyOn(express.application, "listen");
  try {
    const { createApp } = await import("./app");
    createApp();
    expect(listen).not.toHaveBeenCalled();
  } finally {
    listen.mockRestore();
  }
});
