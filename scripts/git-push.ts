import fs from "fs";
import path from "path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

async function pushGit() {
  const dir = path.resolve(".");
  const token = process.argv[2] || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!token) {
    throw new Error("No GitHub token provided.");
  }

  console.log("Pushing main branch to https://github.com/sammiiii9/l2hCRM.git...");

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

  console.log("Push successful! Result:", pushResult);
}

pushGit().catch((err) => {
  console.error("Push error:", err.message || err);
  process.exit(1);
});
