import { readFileSync } from "node:fs";

const lock = JSON.parse(readFileSync(
  new URL("../fixtures/historical-git-fixture-lock.json", import.meta.url),
  "utf8",
));

export function historicalFixture(commit, path) {
  const matches = lock.entries.filter((entry) => (
    entry.path === path
    && (
      entry.commit === commit
      || entry.commit.startsWith(commit)
      || commit.startsWith(entry.commit)
    )
  ));
  if (matches.length !== 1) {
    throw new Error(
      `历史 fixture 必须精确匹配一次：${commit}:${path}，实际 ${matches.length} 次`,
    );
  }
  return matches[0];
}

export function historicalSha256(commit, path) {
  return historicalFixture(commit, path).sha256;
}

export function historicalJsonProjection(commit, path) {
  const fixture = historicalFixture(commit, path);
  if (!fixture.jsonProjection) {
    throw new Error(`历史 fixture 没有 JSON 投影：${commit}:${path}`);
  }
  return fixture.jsonProjection;
}

export function historicalFixtureArchive() {
  return lock.archive;
}
