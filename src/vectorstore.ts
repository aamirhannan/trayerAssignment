import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { embed } from "./embedder.js";
import { Symbol, Cache, CacheEntry, RerankOptions, RerankResult } from "./types.js";

const CACHE_DIR = ".cache";
const CACHE_FILE = path.join(CACHE_DIR, "symbol-embeddings.json");

const toKey = (sym: Symbol): string => `${sym.file}::${sym.loc?.start}-${sym.loc?.end}`;
const hash = (s: string): string => crypto.createHash("sha1").update(s).digest("hex");

function symbolText(sym: Symbol): string {
    const preview = (sym.code || "").replace(/\s+/g, " ").slice(0, 200);
    return [
        `${sym.kind} ${sym.signature || sym.name}`,
        `file ${sym.file}`,
        preview
    ].join(" | ");
}

export async function loadCache(): Promise<Cache> {
    try { await fs.mkdir(CACHE_DIR, { recursive: true }); } catch { }
    try { return JSON.parse(await fs.readFile(CACHE_FILE, "utf8")); }
    catch { return {}; }
}

export async function saveCache(cache: Cache): Promise<void> {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache), "utf8");
}

export function cosine(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) { const x = a[i], y = b[i]; dot += x * y; na += x * x; nb += y * y; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function ensureEmbeddings(symbols: Symbol[], cache: Cache): Promise<Cache> {
    const out = { ...cache };
    for (const s of symbols) {
        const key = toKey(s);
        const text = symbolText(s);
        const h = hash(text);
        if (out[key]?.h === h) continue; // up to date
        const vec = await embed(text);
        out[key] = { h, vec, meta: { name: s.name, kind: s.kind, file: s.file } };
    }
    return out;
}

// Hybrid rerank over a candidate set
export async function rerank(query: string, candidates: Symbol[], cache: Cache, { alpha = 1, beta = 100 }: RerankOptions = {}): Promise<RerankResult[]> {
    if (candidates.length === 0) return [];
    const qv = await embed(query);
    const scored = candidates.map(c => {
        const key = toKey(c);
        const ce = cache[key];
        const sem = ce?.vec ? cosine(qv, ce.vec) : 0;
        const final = alpha * (c._score || 0) + beta * sem;
        return { ...c, _score: c._score || 0, _sem: sem, _final: final };
    });
    return scored.sort((a, b) => b._final - a._final);
}
