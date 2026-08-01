import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const projectRoot = resolve(process.argv[2] ?? process.cwd());
const changelogPath = resolve(projectRoot, "CHANGELOG.md");

function git(args) {
  return execFileSync("git", ["-C", projectRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

let repositoryRoot;

try {
  repositoryRoot = resolve(git(["rev-parse", "--show-toplevel"]));
} catch {
  console.error(`Not inside a Git repository: ${projectRoot}`);
  process.exit(1);
}

const relativeProject = relative(repositoryRoot, projectRoot);

if (relativeProject.startsWith(`..${sep}`) || relativeProject === "..") {
  console.error("The project root must be inside the Git repository.");
  process.exit(1);
}

const pathspec = relativeProject
  ? `:(top)${relativeProject.split(sep).join("/")}`
  : ".";
const log = git([
  "log",
  "--date=short",
  "--pretty=format:%ad%x1f%s",
  "--",
  pathspec,
]);

if (!log) {
  console.error(`No commits affect project path: ${pathspec}`);
  process.exit(1);
}

const commitsByDate = new Map();

for (const line of log.split(/\r?\n/)) {
  const [date, subject] = line.split("\x1f", 2);

  if (!date || !subject) {
    continue;
  }

  const subjects = commitsByDate.get(date) ?? [];
  subjects.push(subject.trim());
  commitsByDate.set(date, subjects);
}

const lines = ["# Changelog", ""];

for (const [date, subjects] of commitsByDate) {
  lines.push(`## ${date}`, "");

  for (const subject of subjects) {
    lines.push(`- ${subject}`);
  }

  lines.push("");
}

const nextContent = `${lines.join("\n").trimEnd()}\n`;
const currentContent = existsSync(changelogPath)
  ? readFileSync(changelogPath, "utf8")
  : null;

if (currentContent === nextContent) {
  console.log("CHANGELOG.md is already up to date.");
} else {
  writeFileSync(changelogPath, nextContent, "utf8");
  const action = currentContent === null ? "Created" : "Updated";
  const commitCount = [...commitsByDate.values()].reduce(
    (total, subjects) => total + subjects.length,
    0,
  );
  console.log(
    `${action} CHANGELOG.md with ${commitCount} entries across ${commitsByDate.size} date(s).`,
  );
}

const dirty = git(["status", "--short", "--", pathspec]);

if (dirty) {
  console.warn(
    "Note: uncommitted project changes are not included; the changelog reflects Git commits only.",
  );
}
