import fs from "node:fs/promises";
import { glob } from "glob";
import matter from "gray-matter";
import { frontMatterSchema } from "../server/utils/contentSchema";

async function main() {
  const files = await glob("content/**/*.md");
  const errors: string[] = [];
  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const { data } = matter(raw);
    const result = frontMatterSchema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n");
      errors.push(`${file}:\n${issues}`);
    }
  }
  if (errors.length) {
    console.error("\nFront-matter validation failed:\n");
    console.error(errors.join("\n\n"));
    process.exit(1);
  }
  console.log("Front-matter OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
