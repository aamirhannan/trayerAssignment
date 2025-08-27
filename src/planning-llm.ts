import OpenAI from "openai";
import dotenv from "dotenv";
import { PlanningResult } from "./types.js";

dotenv.config();

// Initialize client with env var: OPENAI_API_KEY
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function planningWithLLM(nl: string, code: string): Promise<PlanningResult> {
    const sysPrompt = `You are a planning agent that helps developers achieve coding goals by analyzing code and proposing the next actionable step.

You will be given:
- A high-level goal (natural language)
- A code snippet (current implementation)

Your task:
1. Understand the goal and the code context.
2. Identify the most logical next step toward achieving the goal.
3. Return a JSON object with:
   - "action": a concise, specific code-level change or addition.
   - "reasoning": a clear explanation of why this step is necessary and how it moves toward the goal.

Guidelines:
- Focus on atomic, verifiable steps (e.g., add a function, refactor a block, update a prop).
- Avoid vague suggestions. Be precise and grounded in the code snippet.
- If the goal is too broad, suggest a scoped subgoal as the next step.
- If the code is already aligned with the goal, suggest a verification or test step.

Schema:
{
  "action": string,    // e.g., "Add a useEffect hook to fetch data on mount"
  "reasoning": string  // e.g., "The component needs to load data when mounted to display user info"
}`;


    const resp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: nl },
            { role: "user", content: code }
        ],
        temperature: 0
    });

    try {
        const content = resp.choices[0].message.content;
        if (content) {
            return JSON.parse(content) as PlanningResult;
        }
        return { action: null, reasoning: null };
    } catch (e) {
        console.error("LLM parsing failed:", resp.choices[0].message.content);
        return { action: null, reasoning: null };
    }
}
