import OpenAI from "openai";
import dotenv from "dotenv";
import { Intent } from "../types/types.js";

dotenv.config();

// Initialize client with env var: OPENAI_API_KEY
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseIntentWithLLM(nl: string): Promise<Intent> {
    const sysPrompt = `You are a parser that extracts target code symbols from natural language.
Return JSON only, no explanation.
Schema:
{
  "oldName": string | null,   // symbol or function name
  "hints": string[]           // file or module hints, can be empty
}`;

    const resp = await client.chat.completions.create({
        model: "gpt-4o-mini", // or gpt-4o, gpt-5 if available
        messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: nl }
        ],
        temperature: 0
    });

    try {
        const content = resp.choices[0].message.content;
        if (content) {
            return JSON.parse(content) as Intent;
        }
        return { oldName: null, hints: [] };
    } catch (e) {
        console.error("LLM parsing failed:", resp.choices[0].message.content);
        return { oldName: null, hints: [] };
    }
}
