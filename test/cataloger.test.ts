import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { catalogArtifacts } from "../src/cataloger.js";
import { Logger } from "../src/utils/logger.js";
import type { ArtifactInventoryItem } from "../src/types.js";
import { writePytestHtml } from "./helpers/pytest-html.js";

describe("catalogArtifacts", () => {
  it("keeps same-named reports from different artifacts of a run apart", async () => {
    const out = mkdtempSync(join(tmpdir(), "catalog-"));
    const inventory: ArtifactInventoryItem[] = [1, 2].map((id) => ({
      runId: "10",
      artifactName: `results ${id}`,
      artifactId: id,
      sizeBytes: 1,
      status: "success",
    }));
    writePytestHtml(join(out, "raw/10/artifact-1/report.html"), {
      "a.py::one": [{ result: "Failed" }],
    });
    writePytestHtml(join(out, "raw/10/artifact-2/report.html"), {
      "b.py::two": [{ result: "Failed" }],
    });

    const { catalog } = await catalogArtifacts(
      out,
      ["10"],
      inventory,
      new Logger(false),
    );

    const converted = catalog.filter((c) => c.converted);
    expect(new Set(converted.map((c) => c.filePath)).size).toBe(2);
    const ids = converted
      .map((c) => JSON.parse(readFileSync(c.filePath, "utf-8")).tests[0].nodeid)
      .sort();
    expect(ids).toEqual(["a.py::one", "b.py::two"]);
  });
});
