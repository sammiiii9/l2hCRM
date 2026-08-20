import fs from "fs";
import path from "path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

async function commitAndPush() {
  const dir = path.resolve(".");
  const token = process.argv[2];

  if (!token) {
    throw new Error("No token provided");
  }

  const ignorePatterns = [
    "node_modules",
    ".next",
    "dev.db",
    "dev.db-journal",
    ".env",
    "tsconfig.tsbuildinfo",
    ".git",
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
      name: "L2H Team",
      email: "admin@l2hsolution.com",
    },
    message: "feat: configure PostgreSQL & Supabase connection pooling for Vercel production deployment",
  });
  console.log("✓ Created commit:", sha);

  console.log("Pushing to GitHub origin/main...");
  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: "origin",
    ref: "main",
    force: true,
    onAuth: () => ({
      username: token,
      password: "",
    }),
  });

  console.log("✓ Push successful!", pushResult);
}

commitAndPush().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
