import tweets from "./tweets.json";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { OpenAI } from "openai";

async function sendToAstra() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const arrayOfTweets =
    tweets.data.search_by_raw_query.search_timeline.timeline.instructions[0]
      .entries;

  const dataToImport = await Promise.all(
    arrayOfTweets.map(async (t) => {
      const id =
        t.content.itemContent?.tweet_results.result.legacy.id_str ?? "";
      const date =
        t.content.itemContent?.tweet_results.result.legacy.created_at ?? "";
      const text =
        t.content.itemContent?.tweet_results.result.legacy.full_text ?? "";

      const $vector = await openai.embeddings
        .create({
          input: text,
          model: "text-embedding-3-small",
          dimensions: 1536,
        })
        .then((data) => data.data[0].embedding);

      return {
        id,
        date,
        text,
        $vector,
      };
    })
  );

  const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
  const db = client.db(process.env.ASTRA_DB_API_ENDPOINT!);
  await db.collection("x_posts").insertMany(dataToImport);
}

sendToAstra();
