import type { ToolResult } from "./types";

const REFERENCE = /^prev:([A-Za-z0-9_-]+)\.(.+)$/;

function pathParts(path: string): string[] {
  return path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
}

export function resolveReference(
  value: string,
  results: Map<string, ToolResult>,
): unknown {
  const match = value.match(REFERENCE);
  if (!match) return value;

  const result = results.get(match[1]);
  if (!result) throw new Error(`Unknown tool call reference: ${match[1]}`);

  let cursor: unknown = result.structured;
  for (const part of pathParts(match[2])) {
    if (cursor === null || typeof cursor !== "object" || !(part in cursor)) {
      throw new Error(`Reference path not found: ${value}`);
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

export function resolveReferences(
  value: unknown,
  results: Map<string, ToolResult>,
): unknown {
  if (typeof value === "string") return resolveReference(value, results);
  if (Array.isArray(value)) return value.map((item) => resolveReferences(item, results));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveReferences(item, results),
      ]),
    );
  }
  return value;
}

