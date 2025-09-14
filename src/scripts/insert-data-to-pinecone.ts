import FirecrawlApp from "@mendable/firecrawl-js";
import dotenv from "dotenv";
import { Logger } from "@/utils/logger";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const ai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const pineconeHost = process.env.PINECONE_HOST;
const logger = new Logger("InsertDataToPinecone");

async function main() {
  const app = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY,
  });

  const scrapeUrls = [
    "https://www.aven.com",
    "https://www.aven.com/home-equity-visa-card",
    "https://www.aven.com/home-equity-cash-card",
    "https://www.aven.com/rewards-visa-card",
    "https://www.aven.com/reviews",
    "https://www.aven.com/support",
    "https://www.aven.com/app",
    "https://www.aven.com/about",
    "https://www.aven.com/contact",
    "https://www.aven.com/blog",
    "https://www.aven.com/careers",
    "https://www.aven.com/press",
    "https://my.aven.com/login",
  ];

  let allText = "";

  // Scrape each URL individually
  for (let urlIndex = 0; urlIndex < scrapeUrls.length; urlIndex++) {
    const url = scrapeUrls[urlIndex];
    logger.info(`Scraping ${urlIndex + 1}/${scrapeUrls.length}: ${url}`);

    const scrapeResult = await app.scrape(url, {
      formats: ["markdown"],
      onlyMainContent: true,
    });

    if (!scrapeResult.markdown) {
      logger.warn(`Failed to scrape content from: ${url}`);
      continue;
    }

    // Add URL header and content
    allText += `\n\n=== Content from ${url} ===\n\n${scrapeResult.markdown}`;

    // Rate limit between scrapes (10 RPM = 6 seconds)
    if (urlIndex < scrapeUrls.length - 1) {
      logger.info("Waiting 6 seconds before next scrape...");
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }

  if (!allText.trim()) {
    throw new Error("Failed to scrape any content from the provided URLs");
  }

  logger.info(`Total scraped content length: ${allText.length} characters`);
  const text = allText;

  // Split text into chunks
  const chunkSize = 1000; // characters
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  logger.info(`Split content into ${chunks.length} chunks`);

  // Generate embeddings for each chunk with 10 RPM rate limit
  // Using embedding-001 which supports configurable dimensions up to 3072
  const model = ai.getGenerativeModel({ model: "text-embedding-004" });
  const index = pineconeHost
    ? pc.index("company-data", pineconeHost)
    : pc.index("company-data");

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    logger.info(`Processing chunk ${i + 1}/${chunks.length}`);

    const result = await model.embedContent(chunk);
    const embedding = result.embedding;

    // Pad 768-dimensional vector to 3072 dimensions to match your index
    const paddedValues = [...embedding.values];
    while (paddedValues.length < 3072) {
      paddedValues.push(0);
    }

    logger.info(
      `Original embedding dimensions: ${embedding.values.length}, Padded to: ${paddedValues.length}`
    );

    const embeddingData = {
      id: `aven-support-chunk-${i}-${Date.now()}`,
      values: paddedValues,
      metadata: {
        text: chunk,
        category: "website",
        source_urls: scrapeUrls.join(", "),
        chunk_index: i,
        total_chunks: chunks.length,
        chunk_size: chunk.length,
      },
    };

    // Insert each chunk individually into Pinecone under the 'company-data' namespace
    await index.namespace('company-data').upsert([embeddingData]);
    logger.info(`Inserted chunk ${i + 1}/${chunks.length} into Pinecone (ns: company-data)`);

    // Rate limit: 10 RPM = 6 seconds between requests
    if (i < chunks.length - 1) {
      logger.info("Waiting 6 seconds for rate limit...");
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }

  logger.info(
    `Successfully processed and inserted ${chunks.length} chunks into Pinecone`
  );
}

main().catch(error => {
  logger.error("Script failed:", error);
  process.exit(1);
});
