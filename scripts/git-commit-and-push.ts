import fs from "fs";
import path from "path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

async function commitAndPush() {
  const dir = path.resolve(".");
  const token = process.env.GITHUB_TOKEN || process.argv[2];

  const ignorePatterns = [
    "node_modules",
    ".next",
    "dev.db",
    "dev.db-journal",
    ".env",
    "tsconfig.tsbuildinfo",
    ".git",
    "scripts/git-commit-and-push.ts",
  ];

  function getFiles(currentDir: string, relativePath = ""): string[] {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    let files: string[] = [];

    for (const entry of entries) {
      const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (ignorePatterns.some((pattern) => rel === pattern || rel.startsWith(`${pattern}/`))) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getFiles(fullPath, rel));
      } else {
        files.push(rel);
      }
    }
    return files;
  }

  const allFiles = getFiles(dir);
  console.log(`Staging ${allFiles.length} files...`);

  for (const filepath of allFiles) {
    await git.add({ fs, dir, filepath });
  }

  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: "sammiiii9",
      email: "119938641+sammiiii9@users.noreply.github.com",
    },
    message: "feat: implement admin teams & members CRUD, purge demo data, optimize lead ingestion, and clean UI",
  });
  console.log("✓ Created commit:", sha);

  if (!token) {
    console.log("ℹ️ No GITHUB_TOKEN provided. Commit created locally. Pass your token as an argument to push to GitHub remote.");
    return;
  }

  console.log("Pushing to GitHub origin/main...");
  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: "origin",
    ref: "main",
    force: false,
    onAuth: () => ({
      username: token,
      password: "",
    }),
  });

  console.log("✓ Push to GitHub successful!", pushResult);
}

commitAndPush().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
