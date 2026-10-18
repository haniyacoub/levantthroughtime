import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA = join(ROOT, 'data');
export const PUBLIC = join(ROOT, 'public');

export function rel(p: string): string {
  return relative(ROOT, p);
}

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Write JSON with stable formatting. `compact` for generated files the browser loads. */
export function writeJson(path: string, value: unknown, compact = false): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, compact ? JSON.stringify(value) : JSON.stringify(value, null, 2) + '\n');
}

export function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

/** Download a URL to a file unless it is already there; returns the file's bytes. */
export async function download(url: string, dest: string): Promise<Buffer> {
  if (existsSync(dest)) return readFileSync(dest);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  return buf;
}
