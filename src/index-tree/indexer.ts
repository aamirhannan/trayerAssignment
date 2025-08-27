import { promises as fs } from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { Symbol, SearchResult, ASTNode } from '../types/types.js';

const require = createRequire(import.meta.url);
const traverse = require('@babel/traverse').default;

const isCode = (p: string): boolean => /\.(mjs|cjs|js|jsx|ts|tsx)$/.test(p);

async function* walk(dir: string): AsyncGenerator<string, void, unknown> {
    for (const d of await fs.readdir(dir, { withFileTypes: true })) {
        const res = path.join(dir, d.name);
        if (d.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'build', '.next', 'out'].includes(d.name)) continue;
            yield* walk(res);
        } else if (isCode(res)) {
            yield res;
        }
    }
}

function parseFile(code: string, filename: string): ASTNode {
    return parse(code, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
        sourceFilename: filename,
        ranges: true
    }) as ASTNode;
}

export async function buildIndex(repoRoot: string): Promise<Symbol[]> {
    const index: Symbol[] = []; // {name, kind, file, loc, exported, code, signature}
    for await (const file of walk(repoRoot)) {
        const src = await fs.readFile(file, 'utf8');
        let ast: ASTNode;
        try { ast = parseFile(src, file); } catch { continue; }

        const push = (name: string, kind: Symbol['kind'], node: ASTNode, exported = false, signature = ""): void => {
            const { start, end } = node; // byte offsets
            if (start !== undefined && end !== undefined) {
                index.push({
                    name, kind, file,
                    loc: { start, end },
                    exported,
                    signature,
                    code: src.slice(start, end)
                });
            }
        };

        const exportedNames = new Set<string>();
        traverse(ast, {
            ExportNamedDeclaration(p: { node: any }) {
                const d = p.node.declaration;
                if (d?.id?.name) exportedNames.add(d.id.name);
                if (d?.declarations) d.declarations.forEach((x: any) => x.id?.name && exportedNames.add(x.id.name));
                if (p.node.specifiers) p.node.specifiers.forEach((s: any) => exportedNames.add(s.exported.name));
            },
            ExportDefaultDeclaration(p: { node: any }) {
                const d = p.node.declaration;
                if (d?.id?.name) exportedNames.add(d.id.name);
            }
        });

        const sigFromParams = (params: ASTNode[] = []): string =>
            `(${params.map((p, i) => {
                if (p.type === 'Identifier') return (p as any).name;
                if (p.type === 'AssignmentPattern' && (p as any).left?.type === 'Identifier') return `${(p as any).left.name}?`;
                return `arg${i + 1}`;
            }).join(', ')})`;

        traverse(ast, {
            FunctionDeclaration(p: { node: any }) {
                const name = p.node.id?.name;
                if (name) push(name, 'function', p.node, exportedNames.has(name), `${name}${sigFromParams(p.node.params)}`);
            },
            ClassDeclaration(p: { node: any }) {
                const name = p.node.id?.name;
                if (name) push(name, 'class', p.node, exportedNames.has(name), name);
            },
            VariableDeclaration(p: { node: any }) {
                for (const d of p.node.declarations) {
                    const id = d.id;
                    if (id.type === 'Identifier') {
                        push(id.name, 'variable', d, exportedNames.has(id.name), id.name);
                    }
                }
            },
            VariableDeclarator(p: { node: any }) {
                const id = p.node.id;
                const init = p.node.init;
                if (id.type === 'Identifier' && init && /Function|ArrowFunction/.test(init.type)) {
                    const name = id.name;
                    const params = init.params ?? [];
                    push(name, 'function', p.node, exportedNames.has(name), `${name}${sigFromParams(params)}`);
                }
            },
            ObjectProperty(p: { node: any }) {
                const key = p.node.key;
                if (key.type === 'Identifier') {
                    const propertyName = key.name;
                    push(propertyName, 'property', p.node, exportedNames.has(propertyName), propertyName);
                }
            }
        });
    }
    return index;
}

export function search(index: Symbol[], q: string): SearchResult[] {
    const Q = (q || '').toLowerCase().trim();
    if (!Q) return [];

    // split into tokens: words + camelCase parts
    const qTokens = Q
        .split(/[^a-z0-9]+/i)
        .flatMap(tok => tok.split(/(?=[A-Z])/))
        .map(t => t.toLowerCase())
        .filter(Boolean);

    const nameTokens = (s: string): string[] =>
        s
            .split(/[^a-z0-9]+/i)
            .flatMap(tok => tok.split(/(?=[A-Z])/))
            .map(t => t.toLowerCase())
            .filter(Boolean);

    const hasOverlap = (item: Symbol): boolean => {
        const name = item.name.toLowerCase();
        const file = item.file.toLowerCase();
        const nTok = nameTokens(item.name);
        // overlap if: exact, substring, any token match, or file contains any token
        if (name === Q) return true;
        if (name.includes(Q)) return true;
        if (qTokens.some(t => t.length >= 2 && nTok.includes(t))) return true;
        if (qTokens.some(t => t.length >= 3 && file.includes(t))) return true;
        return false;
    };

    const score = (item: Symbol): number => {
        if (!hasOverlap(item)) return 0; // HARD GATE

        const name = item.name.toLowerCase();
        const file = item.file.toLowerCase();
        let s = 0;

        if (name === Q) s += 100;                       // exact
        if (name.includes(Q)) s += 50;                  // substring
        const nTok = nameTokens(item.name);
        const tokHits = qTokens.filter(t => nTok.includes(t)).length;
        s += Math.min(tokHits * 10, 30);                // token overlap bonus
        if (file.includes(Q)) s += 15;                  // filename contains
        // secondary bonuses only AFTER overlap is established:
        if (item.exported) s += 5;
        if (item.kind === 'function') s += 2;

        return s;
    };

    const MIN_SCORE = 30; // confidence threshold

    return [...index]
        .map(it => ({ ...it, _score: score(it) }))
        .filter(it => it._score >= MIN_SCORE)
        .sort((a, b) => b._score - a._score)
        .slice(0, 10);
}

const thisFile = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1] || '') === path.resolve(thisFile)) {
    const [, , repo = '.', $query = ''] = process.argv;
    (async () => {
        const idx = await buildIndex(repo);
        const hits = search(idx, $query);
        for (const h of hits) {
            console.log(`${h._score.toString().padStart(3)} [${h.kind}] ${h.name}  ${h.file}  ${h.signature || ''}`);
        }
        if (hits[0]) {
            console.log('\n--- top hit snippet ---\n');
            console.log(hits[0].code);
        }
    })();
}
