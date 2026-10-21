import fs from "node:fs/promises";
import { glob } from "glob";
import matter from "gray-matter";
import { frontMatterSchema } from "../server/utils/contentSchema";

const strictFrontMatterSchema = frontMatterSchema.strict();

export function validateStubRules(filePath: string, data: Record<string, unknown>): string[] {
  const normalized = filePath.replace(/\\/g, "/");
  const isHomeHub =
    normalized.endsWith("content/en/index.md") || normalized.endsWith("content/fi/index.md");
  const isPersonHub =
    normalized.endsWith("content/en/petri-leinonen.md") ||
    normalized.endsWith("content/fi/petri-leinonen.md");

  const issues: string[] = [];

  if (!isHomeHub && data.organization && typeof data.organization === "object") {
    const org = data.organization as Record<string, unknown>;
    if (org.sameAs) {
      issues.push(
        "- organization.sameAs: Forbidden on subpages by Rule of Stubs (define only on / index)",
      );
    }
    if (org.url) {
      issues.push(
        "- organization.url: Forbidden on subpages by Rule of Stubs (define only on / index)",
      );
    }
  }

  if (!isPersonHub && data.author && typeof data.author === "object") {
    const author = data.author as Record<string, unknown>;
    const isInternalAuthor =
      author.name === "Petri Leinonen" ||
      author.name === "TBD" ||
      (typeof author["@id"] === "string" && author["@id"].includes("#petri"));

    if (isInternalAuthor) {
      if (author.sameAs) {
        issues.push(
          "- author.sameAs: Forbidden for Petri Leinonen on subpages by Rule of Stubs (define only on petri-leinonen.md)",
        );
      }
      if (author.url) {
        issues.push(
          "- author.url: Forbidden for Petri Leinonen on subpages by Rule of Stubs (define only on petri-leinonen.md)",
        );
      }
    }
  }

  return issues;
}

async function main() {
  const files = await glob("content/**/*.md");
  const errors: string[] = [];
  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const { data } = matter(raw);
    const fileIssues: string[] = [];

    const result = strictFrontMatterSchema.safeParse(data);
    if (!result.success) {
      for (const i of result.error.issues) {
        fileIssues.push(`- ${i.path.join(".") || "(root)"}: ${i.message}`);
      }
    }

    const stubIssues = validateStubRules(file, data);
    fileIssues.push(...stubIssues);

    if (fileIssues.length > 0) {
      errors.push(`${file}:\n${fileIssues.join("\n")}`);
    }
  }
  if (errors.length) {
    console.error("\nFront-matter validation failed:\n");
    console.error(errors.join("\n\n"));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  // Also run when invoked via tsx scripts/validate-content.ts
  const invokedFile = process.argv[1]?.replace(/\\/g, "/") || "";
  if (invokedFile.endsWith("scripts/validate-content.ts")) {
    main().catch((e) => {
      console.error(e);
      process.exit(1);
    });
  }
}
