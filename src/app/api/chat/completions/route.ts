import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@/utils/logger";
import OpenAI from "openai";
import { env } from "@/config/env";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const logger = new Logger("API:Chat");

const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });

const namespace = pinecone.index("company-data").namespace("aven");

const ai = new GoogleGenerativeAI(env.GOOGLE_API_KEY!);
const embeddingModel = ai.getGenerativeModel({ model: "text-embedding-004" });

const gemini = new OpenAI({
  apiKey: env.GOOGLE_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const {
      model,
      messages,
      max_tokens,
      temperature,
      stream,
      call,
      ...restParams
    } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
      return NextResponse.json(
        { error: "Last message must have content" },
        { status: 400 }
      );
    }

    logger.info("Creating prompt enhancement", {
      messageCount: messages.length,
    });

    const query = lastMessage.content;
    logger.info("Query", query);
    const embedding = await embeddingModel.embedContent(query);
    logger.info("Embedding", embedding);
    const response = await namespace.query({
      vector: embedding.embedding.values,
      topK: 2,
      includeMetadata: true,
    });

    logger.info("Pinecone response", response);
    const context = response.matches
      ?.map(match => match.metadata?.text)
      .join("\n\n");

    logger.info("Context", context);
    const contextPrompt = `Answer the question based on the context provided.
    Context: ${context}
    `;
    logger.info("Context prompt", contextPrompt);
    const prompt = await gemini.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: [
        {
          role: "user",
          content: ` `,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const modifiedMessage = [
      ...messages.slice(0, messages.length - 1),
      { ...lastMessage, content: prompt.choices[0].message.content },
    ];

    if (stream) {
      logger.info("Creating streaming completion");
      const completionStream = await gemini.chat.completions.create({
        model: "gemini-1.5-flash",
        messages: modifiedMessage,
        max_tokens: max_tokens || 150,
        temperature: temperature || 0.7,
        stream: true,
      });

      // Create a proper streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completionStream) {
              const chunkText = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            logger.error("Streaming error", error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      logger.info("Creating non-streaming completion");
      const completion = await gemini.chat.completions.create({
        model: "gemini-1.5-flash",
        messages: modifiedMessage,
        max_tokens: max_tokens || 150,
        temperature: temperature || 0.7,
        stream: false,
      });
      return NextResponse.json(completion);
    }
  } catch (error) {
    logger.error("Chat completion error", error);

    // Handle specific API errors
    if (error instanceof Error) {
      if (error.message.includes("400")) {
        return NextResponse.json(
          {
            error: "Invalid request parameters. Please check your input.",
          },
          { status: 400 }
        );
      }
      if (error.message.includes("401")) {
        return NextResponse.json(
          {
            error: "Invalid API key. Please check your GOOGLE_API_KEY.",
          },
          { status: 401 }
        );
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
