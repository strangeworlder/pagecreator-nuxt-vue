import { describe, expect, it } from "vitest";
import { GOGAM_IDENTITY, PETRI_IDENTITY, buildKnowledgeGraph } from "../utils/knowledgeGraph";

const defaultOptions = {
  siteUrl: "https://gogam.eu",
  siteName: "Gogam",
  defaultLocale: "fi",
  documentLocale: "en",
};

describe("buildKnowledgeGraph", () => {
  it("builds full Organization Master Node and Game stubs on the Root Identity Hub (/)", () => {
    const graphResult = buildKnowledgeGraph(
      {
        title: "Gogam",
        description: "Finnish indie TTRPG studio",
        path: "/en",
        canonical: "/en",
        organization: {
          name: "Gogam",
          url: "https://gogam.eu",
          sameAs: ["https://www.youtube.com/@gogameu"],
          founder: {
            name: "Petri Leinonen",
          },
          games: [
            {
              "@type": "Game",
              "@id": "https://gogam.eu/#game-cars-and-family",
              name: "Cars and Family",
            },
          ],
        },
      },
      defaultOptions,
    );

    const nodes = graphResult["@graph"];
    const orgNode = nodes.find((n) => n["@type"] === "Organization");
    expect(orgNode).toBeDefined();
    expect(orgNode?.["@id"]).toBe(GOGAM_IDENTITY["@id"]);
    expect(orgNode?.sameAs).toEqual(["https://www.youtube.com/@gogameu"]);

    // Founder on / is still a stub pointing to Petri's master node
    const personNode = nodes.find((n) => n["@type"] === "Person");
    expect(personNode).toEqual({
      "@type": "Person",
      "@id": PETRI_IDENTITY["@id"],
      name: "Petri Leinonen",
    });

    // Homepage Game stub is emitted and linked in WebPage.mainEntity
    const gameNode = nodes.find((n) => n["@type"] === "Game");
    expect(gameNode).toEqual({
      "@type": "Game",
      "@id": "https://gogam.eu/#game-cars-and-family",
      name: "Cars and Family",
    });

    const webPageNode = nodes.find((n) => n["@type"] === "WebPage");
    expect(webPageNode?.mainEntity).toEqual([{ "@id": "https://gogam.eu/#game-cars-and-family" }]);
  });

  it("builds full Person Master Node on the Person Identity Hub (/en/petri-leinonen)", () => {
    const graphResult = buildKnowledgeGraph(
      {
        title: "Petri Leinonen",
        description: "Game designer",
        path: "/en/petri-leinonen",
        canonical: "/en/petri-leinonen",
        organization: {
          name: "Gogam",
        },
        author: {
          name: "Petri Leinonen",
          jobTitle: "Game Designer",
          sameAs: PETRI_IDENTITY.sameAs,
          knowsAbout: ["Tabletop role-playing games"],
        },
      },
      defaultOptions,
    );

    const nodes = graphResult["@graph"];
    // Organization on /en/petri-leinonen must be a Stub
    const orgNode = nodes.find((n) => n["@type"] === "Organization");
    expect(orgNode).toEqual({
      "@type": "Organization",
      "@id": GOGAM_IDENTITY["@id"],
      name: "Gogam",
    });

    // Person on /en/petri-leinonen is the full Master Node
    const personNode = nodes.find((n) => n["@type"] === "Person");
    expect(personNode?.["@id"]).toBe(PETRI_IDENTITY["@id"]);
    expect(personNode?.sameAs).toEqual(PETRI_IDENTITY.sameAs);
    expect(personNode?.jobTitle).toBe("Game Designer");
  });

  it("emits strict Person and Organization stubs on Game subpages", () => {
    const graphResult = buildKnowledgeGraph(
      {
        title: "Sormusaave",
        description: "Solo TTRPG",
        path: "/en/games/the-ring-wraith",
        canonical: "/en/games/the-ring-wraith",
        contentType: ["Game", "CreativeWork"],
        organization: {
          name: "Gogam",
        },
        author: {
          name: "Petri Leinonen",
        },
      },
      defaultOptions,
    );

    const nodes = graphResult["@graph"];
    const orgNode = nodes.find((n) => n["@type"] === "Organization");
    expect(orgNode).toEqual({
      "@type": "Organization",
      "@id": GOGAM_IDENTITY["@id"],
      name: "Gogam",
    });

    const personNode = nodes.find((n) => n["@type"] === "Person");
    expect(personNode).toEqual({
      "@type": "Person",
      "@id": PETRI_IDENTITY["@id"],
      name: "Petri Leinonen",
    });

    const gameNode = nodes.find((n) => n["@id"] === "https://gogam.eu/#game-the-ring-wraith");
    expect(gameNode).toBeDefined();
    expect(gameNode?.author).toEqual({
      "@id": PETRI_IDENTITY["@id"],
      name: "Petri Leinonen",
    });
  });

  it("preserves third-party author identity instead of overwriting with Petri's @id", () => {
    const graphResult = buildKnowledgeGraph(
      {
        title: "Kärpästen herra",
        description: "LoF",
        path: "/fi/games/karpasten-herra",
        canonical: "/fi/games/karpasten-herra",
        contentType: "Game",
        author: {
          "@type": "Person",
          name: "Wille Ruotsalainen",
          sameAs: ["https://rpggeek.com/rpgdesigner/114842/wille-ruotsalainen"],
        },
      },
      defaultOptions,
    );

    const nodes = graphResult["@graph"];
    const personNode = nodes.find((n) => n["@type"] === "Person");
    expect(personNode).toEqual({
      "@type": "Person",
      "@id": "https://gogam.eu/#author-wille-ruotsalainen",
      name: "Wille Ruotsalainen",
      sameAs: ["https://rpggeek.com/rpgdesigner/114842/wille-ruotsalainen"],
    });

    const gameNode = nodes.find((n) => n["@id"] === "https://gogam.eu/#game-karpasten-herra");
    expect(gameNode?.author).toEqual({
      "@id": "https://gogam.eu/#author-wille-ruotsalainen",
      name: "Wille Ruotsalainen",
    });
  });
});
