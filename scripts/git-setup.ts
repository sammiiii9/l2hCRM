import fs from "fs";
import path from "path";
import git from "isomorphic-git";

async function setupGit() {
  const dir = path.resolve(".");
  console.log("Initializing git repository in:", dir);

  // 1. Initialize git repo
  await git.init({ fs, dir, defaultBranch: "main" });
  console.log("✓ Initialized git repository with branch 'main'");

  // 2. Read all files recursively (ignoring .gitignore patterns)
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
  console.log("✓ Staged all project files");

  // 3. Commit
  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: "L2H Team",
      email: "admin@l2hsolution.com",
    },
    message: "Initial commit: L2H Solution CRM - Call Floor & Portfolio Operating System with Admin Lead Assignment & Multi-Source Ingestion",
  });
  console.log("✓ Created commit:", sha);

  // 4. Add Remote
  await git.addRemote({
    fs,
    dir,
    remote: "origin",
    url: "https://github.com/sammiiii9/l2hCRM.git",
    force: true,
  });
  console.log("✓ Configured remote 'origin' -> https://github.com/sammiiii9/l2hCRM.git");

  console.log("\n🚀 Git repository successfully initialized and committed locally on branch 'main'!");
}

setupGit().catch((err) => {
  console.error("Git setup failed:", err);
  process.exit(1);
});
