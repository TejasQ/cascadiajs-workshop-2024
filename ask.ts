import { DataAPIClient } from "@datastax/astra-db-ts";
import { OpenAI } from "openai";

async function ask() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
  const db = client.db(process.env.ASTRA_DB_API_ENDPOINT!);
  const question = "Are you political?";
  const vector = await openai.embeddings
    .create({
      input: question,
      model: "text-embedding-3-small",
      dimensions: 1536,
    })
    .then((data) => data.data[0].embedding);

  const data = await db
    .collection("x_posts")
    .find({}, { vector, includeSimilarity: true, limit: 5 })
    .toArray();

  const context = data
    .map(
      (d) =>
        `The tweet says: ${d.text}, and the link is https://x.com/someuser/status/${d.id}`
    )
    .join("\n\n");

  const answer = await openai.chat.completions
    .create({
      messages: [
        {
          role: "system",
          content:
            "You answer a question from a user, and share a link to the relevant source.",
        },
        {
          role: "user",
          content: `Using this context: ${context},
            
            Answer the question: ${question}`,
        },
      ],
      model: "gpt-4o",
    })
    .then((result) => result.choices[0].message.content);

  console.log({ context, question, answer });
}

ask();
