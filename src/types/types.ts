// Type definitions for the AST parsing project

export interface Symbol {
    name: string;
    kind: 'function' | 'class' | 'variable' | 'property';
    file: string;
    loc: {
        start: number;
        end: number;
    };
    exported: boolean;
    signature: string;
    code: string;
    _score?: number;
    _sem?: number;
    _final?: number;
}

export interface Intent {
    oldName: string | null;
    hints: string[];
}

export interface PlanningResult {
    action: string | null;
    reasoning: string | null;
}

export interface CacheEntry {
    h: string;
    vec: number[];
    meta: {
        name: string;
        kind: string;
        file: string;
    };
}

export interface Cache {
    [key: string]: CacheEntry;
}

export interface RerankOptions {
    alpha?: number;
    beta?: number;
}

export interface SearchResult extends Symbol {
    _score: number;
}

export interface RerankResult extends Symbol {
    _score: number;
    _sem: number;
    _final: number;
}

// Babel AST types (simplified)
export interface ASTNode {
    type: string;
    start?: number;
    end?: number;
    id?: {
        name: string;
        type: string;
    };
    params?: ASTNode[];
    declarations?: ASTNode[];
    init?: ASTNode;
    key?: ASTNode;
    left?: ASTNode;
    specifiers?: Array<{
        exported: {
            name: string;
        };
    }>;
    declaration?: ASTNode;
}

export interface FunctionDeclaration extends ASTNode {
    type: 'FunctionDeclaration';
    id: {
        name: string;
        type: 'Identifier';
    };
    params: ASTNode[];
}

export interface ClassDeclaration extends ASTNode {
    type: 'ClassDeclaration';
    id: {
        name: string;
        type: 'Identifier';
    };
}

export interface VariableDeclaration extends ASTNode {
    type: 'VariableDeclaration';
    declarations: ASTNode[];
}

export interface VariableDeclarator extends ASTNode {
    type: 'VariableDeclarator';
    id: {
        name: string;
        type: string;
    };
    init?: ASTNode;
}

export interface ObjectProperty extends ASTNode {
    type: 'ObjectProperty';
    key: ASTNode;
}

export interface ExportNamedDeclaration extends ASTNode {
    type: 'ExportNamedDeclaration';
    declaration?: ASTNode;
    specifiers?: Array<{
        exported: {
            name: string;
        };
    }>;
}

export interface ExportDefaultDeclaration extends ASTNode {
    type: 'ExportDefaultDeclaration';
    declaration?: ASTNode;
}
