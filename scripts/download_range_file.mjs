import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { resolve } from "node:path";

function argumentValue(argumentsList, flag) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : null;
}

function requiredArgument(argumentsList, flag) {
  const value = argumentValue(argumentsList, flag);
  if (!value) throw new Error(`缺少必需参数 ${flag}`);
  return value;
}

function positiveInteger(value, label) {
  const number = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${label} 必须是正整数`);
  }
  return number;
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function downloadRangeFile({
  url,
  outputPath,
  expectedSize,
  expectedSha256,
  concurrency,
  chunkBytes,
  retries,
  resume,
}) {
  const file = await open(outputPath, resume ? "r+" : "wx");
  if (resume) {
    const outputStat = await stat(outputPath);
    if (outputStat.size !== expectedSize) {
      throw new Error(
        `断点文件大小不一致：实际 ${outputStat.size}，预期 ${expectedSize}`,
      );
    }
  } else {
    await file.truncate(expectedSize);
  }
  const allRanges = [];
  for (let start = 0; start < expectedSize; start += chunkBytes) {
    allRanges.push({
      start,
      end: Math.min(expectedSize - 1, start + chunkBytes - 1),
    });
  }

  const ranges = [];
  let completedBytes = 0;
  if (resume) {
    for (const range of allRanges) {
      const length = range.end - range.start + 1;
      const bytes = Buffer.allocUnsafe(length);
      await file.read(bytes, 0, length, range.start);
      if (bytes.some((byte) => byte !== 0)) {
        completedBytes += length;
      } else {
        ranges.push(range);
      }
    }
  } else {
    ranges.push(...allRanges);
  }

  let nextRange = 0;
  const startedAt = Date.now();
  const downloadRange = async (range, attempt = 1) => {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          Range: `bytes=${range.start}-${range.end}`,
        },
      });
      if (response.status !== 206) {
        throw new Error(
          `服务器没有返回分段响应：status=${response.status}, range=${range.start}-${range.end}`,
        );
      }
      const contentRange = response.headers.get("content-range");
      const expectedContentRange = `bytes ${range.start}-${range.end}/${expectedSize}`;
      if (contentRange !== expectedContentRange) {
        throw new Error(
          `Content-Range 不一致：实际 ${contentRange}，预期 ${expectedContentRange}`,
        );
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      const expectedLength = range.end - range.start + 1;
      if (bytes.length !== expectedLength) {
        throw new Error(
          `分段大小不一致：实际 ${bytes.length}，预期 ${expectedLength}`,
        );
      }
      return bytes;
    } catch (error) {
      if (attempt >= retries) throw error;
      const delayMilliseconds = Math.min(8_000, 500 * (2 ** (attempt - 1)));
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMilliseconds));
      return downloadRange(range, attempt + 1);
    }
  };
  const worker = async () => {
    while (true) {
      const rangeIndex = nextRange;
      nextRange += 1;
      if (rangeIndex >= ranges.length) return;
      const range = ranges[rangeIndex];
      const bytes = await downloadRange(range);
      await file.write(bytes, 0, bytes.length, range.start);
      completedBytes += bytes.length;
      const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
      process.stdout.write(`${JSON.stringify({
        completedRanges: rangeIndex + 1,
        totalRanges: ranges.length,
        completedBytes,
        expectedSize,
        averageBytesPerSecond: Math.round(completedBytes / elapsedSeconds),
      })}\n`);
    }
  };

  try {
    await Promise.all(Array.from(
      { length: Math.min(concurrency, ranges.length) },
      () => worker(),
    ));
  } finally {
    await file.close();
  }

  const actualSha256 = await sha256File(outputPath);
  if (expectedSha256 && actualSha256 !== expectedSha256) {
    throw new Error(
      `SHA-256 不一致：实际 ${actualSha256}，预期 ${expectedSha256}`,
    );
  }
  return {
    outputPath,
    bytes: expectedSize,
    sha256: actualSha256,
    verified: Boolean(expectedSha256),
  };
}

const argumentsList = process.argv.slice(2);
const result = await downloadRangeFile({
  url: requiredArgument(argumentsList, "--url"),
  outputPath: resolve(requiredArgument(argumentsList, "--output")),
  expectedSize: positiveInteger(requiredArgument(argumentsList, "--size"), "--size"),
  expectedSha256: argumentValue(argumentsList, "--sha256"),
  concurrency: positiveInteger(
    argumentValue(argumentsList, "--concurrency") ?? "12",
    "--concurrency",
  ),
  chunkBytes: positiveInteger(
    argumentValue(argumentsList, "--chunk-bytes") ?? String(8 * 1024 * 1024),
    "--chunk-bytes",
  ),
  retries: positiveInteger(
    argumentValue(argumentsList, "--retries") ?? "6",
    "--retries",
  ),
  resume: argumentsList.includes("--resume"),
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
