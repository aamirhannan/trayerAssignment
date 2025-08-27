# AST Parsing Project

A TypeScript-based code analysis tool that uses natural language to find and understand code symbols in a repository.

## Features

- **Natural Language Search**: Query code using natural language descriptions
- **AST Parsing**: Parse JavaScript/TypeScript files to extract functions, classes, variables, and properties
- **Semantic Search**: Use embeddings to find semantically similar code
- **Hybrid Ranking**: Combine lexical and semantic search for better results
- **Planning Assistant**: Get AI-powered suggestions for code modifications

## Installation

```bash
npm install
```

## Usage

### Build the project

```bash
npm run build
```

### Run the CLI

```bash
npm start "<natural language query>" [repoDir]
```

Example:
```bash
npm start "refactor the addTwoNumbers function to handle 3 parameters and return sum of all 3" .
```

### Development

```bash
npm run dev "<query>" [repoDir]
```

This will build and run the project in one command.

## Project Structure

- `src/types.ts` - TypeScript type definitions
- `src/cli.ts` - Main CLI entry point
- `src/indexer.ts` - AST parsing and symbol extraction
- `src/intent-llm.ts` - Natural language intent parsing
- `src/planning-llm.ts` - Code planning and suggestions
- `src/vectorstore.ts` - Embedding and semantic search
- `src/embedder.ts` - Text embedding utilities

## TypeScript Conversion

This project has been fully converted from JavaScript to TypeScript with:

- Strong typing for all functions and data structures
- Interface definitions for AST nodes and search results
- Proper error handling with type safety
- Source maps for debugging
- Declaration files for better IDE support

## Dependencies

- `@babel/parser` - JavaScript/TypeScript parsing
- `@babel/traverse` - AST traversal
- `openai` - AI/LLM integration
- `dotenv` - Environment variable management

## Environment Variables

Create a `.env` file with:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## License

ISC
