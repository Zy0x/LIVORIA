import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(repoRoot, 'apps/web/public/version.json');

function readGitCommit() {
  const fromEnv =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.COMMIT_REF ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA;

  if (fromEnv) return fromEnv;

  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'local';
  }
}

const commit = readGitCommit();
const builtAt = new Date().toISOString();

const payload = {
  version: `${commit.slice(0, 12)}-${builtAt}`,
  commit,
  builtAt,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
