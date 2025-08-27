import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embed(text: string): Promise<number[]> {
    const input = text.slice(0, 8000); // guard
    const res = await client.embeddings.create({
        model: "text-embedding-3-small", // cheap+good; use -large for max quality
        input
    });
    return res.data[0].embedding; // number[]
}
