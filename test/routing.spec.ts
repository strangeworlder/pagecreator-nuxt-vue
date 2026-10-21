import { describe, expect, it } from "vitest";
import {
  buildNewsArticlePath,
  ensureLeadingSlash,
  getLocaleFromPath,
  removeTrailingSlash,
  resolveCanonicalPath,
  resolveContentPath,
  resolveNewsRouting,
} from "../utils/routing";

describe("utils/routing", () => {
  it("normalizes slashes with ensureLeadingSlash and removeTrailingSlash", () => {
    expect(ensureLeadingSlash("en/games")).toBe("/en/games");
    expect(ensureLeadingSlash("/en/games")).toBe("/en/games");
    expect(removeTrailingSlash("/en/games/")).toBe("/en/games");
    expect(removeTrailingSlash("/")).toBe("/");
  });

  it("resolves content paths and default locale", () => {
    expect(resolveContentPath("/", "fi")).toBe("/fi");
    expect(resolveContentPath("/en/index", "fi")).toBe("/en");
    expect(resolveContentPath("/fi/games/sormusaave/", "fi")).toBe("/fi/games/sormusaave");
  });

  it("extracts locale from paths", () => {
    expect(getLocaleFromPath("/", "fi")).toBe("fi");
    expect(getLocaleFromPath("/en/games/cars-and-family", "fi")).toBe("en");
    expect(getLocaleFromPath("/fi/uutiset", "fi")).toBe("fi");
  });

  it("parses news article and archive routes via resolveNewsRouting", () => {
    expect(resolveNewsRouting("/en/2025/09/15/launch-post", "fi")).toEqual({
      type: "article",
      queryPath: "/en/news/launch-post",
      expectedDate: "2025-09-15",
      paramYear: "2025",
      lang: "en",
    });

    expect(resolveNewsRouting("/fi/2025/09/15/julkaisu", "fi")).toEqual({
      type: "article",
      queryPath: "/fi/uutiset/julkaisu",
      expectedDate: "2025-09-15",
      paramYear: "2025",
      lang: "fi",
    });

    expect(resolveNewsRouting("/en/2025", "fi")).toEqual({
      type: "archive",
      queryPath: "/en/2025",
      paramYear: "2025",
      lang: "en",
    });

    expect(resolveNewsRouting("/en/games/cars-and-family", "fi")).toEqual({
      type: "standard",
      queryPath: "/en/games/cars-and-family",
    });
  });

  it("builds canonical date-prefixed news URLs", () => {
    expect(buildNewsArticlePath("/en/news/my-update", "2025-10-04", "fi")).toBe(
      "/en/2025/10/04/my-update",
    );
    expect(buildNewsArticlePath("/fi/uutiset/tiedote", "2025-01-09T12:00:00Z", "fi")).toBe(
      "/fi/2025/01/09/tiedote",
    );
    expect(buildNewsArticlePath("/en/news/index", "2025-10-04", "fi")).toBeNull();
  });

  it("resolves canonical paths across explicit canonicals, news posts, and standard pages", () => {
    expect(
      resolveCanonicalPath({
        path: "/en/news/my-update",
        datePublished: "2025-10-04",
      }),
    ).toBe("/en/2025/10/04/my-update");

    expect(
      resolveCanonicalPath({
        path: "/en/news",
        template: "news-list",
        datePublished: "2025-10-04",
      }),
    ).toBe("/en/news");

    expect(
      resolveCanonicalPath({
        path: "/fi/index",
        canonical: "/",
      }),
    ).toBe("/");
  });
});
