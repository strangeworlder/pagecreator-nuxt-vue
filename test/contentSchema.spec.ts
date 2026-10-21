import fs from "node:fs/promises";
import { glob } from "glob";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { validateStubRules } from "../scripts/validate-content";
import { frontMatterSchema } from "../server/utils/contentSchema";

const strictFrontMatterSchema = frontMatterSchema.strict();

describe("frontMatterSchema", () => {
  it("accepts minimal valid front matter", () => {
    const res = strictFrontMatterSchema.safeParse({ title: "t", description: "d" });
    expect(res.success).toBe(true);
  });

  it("rejects missing title", () => {
    const res = strictFrontMatterSchema.safeParse({ description: "d" });
    expect(res.success).toBe(false);
  });

  it("rejects unknown front-matter properties in strict mode", () => {
    const res = strictFrontMatterSchema.safeParse({
      title: "t",
      description: "d",
      unrecognizedProperty: "foo",
    });
    expect(res.success).toBe(false);
  });

  it("validates all content/**/*.md files against strictFrontMatterSchema and Rule of Stubs", async () => {
    const files = await glob("content/**/*.md");
    expect(files.length).toBeGreaterThan(0);

    const failures: string[] = [];
    for (const file of files) {
      const raw = await fs.readFile(file, "utf8");
      const { data } = matter(raw);
      const parsed = strictFrontMatterSchema.safeParse(data);
      if (!parsed.success) {
        failures.push(
          `${file}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
        );
      }
      const stubIssues = validateStubRules(file, data);
      if (stubIssues.length > 0) {
        failures.push(`${file}: ${stubIssues.join(", ")}`);
      }
    }

    expect(failures).toEqual([]);
  });
});
