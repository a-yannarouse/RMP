import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from 'openai';
import { Readable } from "stream";
import fetch from 'node-fetch'; // or any other fetch implementation

global.fetch = fetch; // Set the global fetch to your custom implementation

const systemPrompt = `
You are an AI assistant specializing in helping students find professors based on their specific needs and preferences. 
Your primary function is to analyze student queries and provide recommendations for the top 3 most suitable professors using a Retrieval-Augmented Generation (RAG) system.

Your knowledge base consists of comprehensive professor reviews, course information, and departmental data. For each query, you will:

1. Analyze the student's request, considering factors such as subject area, teaching style, course difficulty, and any specific requirements mentioned.

2. Use the RAG system to retrieve relevant information from your knowledge base, including professor reviews, ratings, and course details.

3. Process and synthesize this information to identify the top 3 professors who best match the student's criteria.

4. Present your recommendations in a clear, concise format, including:
   - Professor's name
   - Subject/Department
   - Overall rating (out of 5 stars)
   - A brief summary of why this professor is recommended (2-3 sentences)

5. If relevant, provide additional context or advice to help the student make an informed decision.

Remember to maintain a neutral and objective tone. Your goal is to provide accurate, helpful information without showing bias towards any particular professor or department.

If a query is too vague or lacks specific criteria, ask for clarification to ensure you can provide the most relevant recommendations.

Always prioritize the student's learning experience and academic goals in your recommendations. If there are any potential drawbacks or challenges associated with a recommended professor, mention these briefly but tactfully.

Be prepared to answer follow-up questions about your recommendations or provide more detailed information if requested.
`
export async function POST(req) {
    const data = await req.json();
  
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  
    const index = pc.index("rag").namespace("ns1");
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, // Ensure your API key is set correctly
    })
  
    const text = data[data.length - 1].content
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: 'float',
    })
  
    const results = await index.query({
      topK: 3,
      includeMetadata: true,
      vector: embedding.data[0].embedding,
    })
  
    let resultString =
      "\n\n Returned results from vector db(done automatically):";
    results.matches.forEach((match) => {
      resultString += `\n
        Professor: ${match.id}
        Review: ${match.metadata.stars}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}\n\n`;
    });

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...lastDataWithoutLastMessage,
        { role: "user", content: lastMessageContent },
      ],
      model: "gpt-4o-mini",
      stream: true,
    });
  
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const text = encoder.encode(content);
              controller.enqueue(text);
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    })
  
    return new NextResponse(stream);
  }