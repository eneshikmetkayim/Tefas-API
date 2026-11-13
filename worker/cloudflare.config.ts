import { defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "tefasapi",
    compatibilityDate: "2026-11-10",
    workersDev: true,
    previewUrls: false,
    observability: {
      enabled: true,
    },
    entrypoint,
  },
});
