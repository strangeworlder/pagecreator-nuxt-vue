import { describe, expect, it } from "vitest";
import { frontMatterSchema } from "../server/utils/contentSchema";

describe("frontMatterSchema", () => {
  it("accepts minimal valid front matter", () => {
    const res = frontMatterSchema.safeParse({ title: "t", description: "d" });
    expect(res.success).toBe(true);
  });

  it("rejects missing title", () => {
    const res = frontMatterSchema.safeParse({ description: "d" });
    expect(res.success).toBe(false);
  });
});
