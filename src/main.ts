import path from "path";
import { buildIndex, search } from "./indexer.js";
import { parseIntentWithLLM } from "./intent-llm.js";
import { loadCache, saveCache, ensureEmbeddings, rerank } from "./vectorstore.js";
import { fileURLToPath } from 'url';
import { planningWithLLM } from "./planning-llm.js";
import { Symbol, RerankResult } from "./types.js";

async function main(): Promise<void> {
    const [, , ...args] = process.argv;
    if (args.length === 0) {
        console.error('Usage: node src/cli.js "<natural language>" [repoDir]');
        process.exit(1);
    }
    const nl = args[0];
    const repo = args[1] || ".";

    console.log("> NL:", nl);
    const intent = await parseIntentWithLLM(nl);
    console.log("> intent:", intent);

    const index = await buildIndex(repo);

    // lexical candidates
    let candidates: Symbol[] = [];
    if (intent.oldName) candidates = search(index, intent.oldName);

    if (candidates.length === 0 && intent.hints?.length) {
        for (const h of intent.hints) candidates.push(...search(index, h));
    }

    // semantic recall fallback: if still empty, use broad lexical (top N names)
    if (candidates.length === 0) {
        candidates = index
            .filter(x => x.kind === "function")
            .slice(0, 50)
            .map(x => ({ ...x, _score: 0 }));
    }

    // cache + rerank
    const cache = await loadCache();
    const cache2 = await ensureEmbeddings(candidates, cache);
    if (cache !== cache2) await saveCache(cache2);

    const reranked = await rerank(nl, candidates, cache2, { alpha: 1, beta: 120 });
    if (reranked.length === 0) {
        console.log("No match found.");
        return;
    }

    // console.log("reranked", reranked);
    const best = reranked[0];
    // Safety: only accept if either lexical overlap or semantic is strong
    const ACCEPT_SEM = 0.75; // tighten/loosen as needed
    const hasLex = (best._score || 0) >= 30;
    const ok = hasLex || best._sem >= ACCEPT_SEM;

    if (!ok) {
        console.log("Low confidence. Top 5 for review:");
        console.table(reranked.slice(0, 5).map(x => ({
            final: Math.round(x._final),
            sem: +x._sem.toFixed(3),
            lex: x._score || 0,
            name: x.name,
            kind: x.kind,
            file: x.file
        })));
        return;
    }

    console.log(`\n> Best match: [${best.kind}] ${best.name}\nFile: ${best.file}`);
    console.log(`Scores → semantic: ${best._sem.toFixed(3)}, lexical: ${best._score || 0}, final: ${Math.round(best._final)}`);
    console.log("\n--- snippet ---\n");
    console.log(best);

    const planning = await planningWithLLM(nl, best.code);
    console.log("> planning:", planning);
}

const thisFile = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1] || '') === path.resolve(thisFile)) {
    main();
}
