const { GoogleGenerativeAI } = require("@google/generative-ai");
const vectorService = require("./vectorService");

class ChatService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
  }

  // documentIds: one id or an array of ids; the search runs across all of them
  async processQuery(userQuery, documentIds) {
    const ids = Array.isArray(documentIds) ? documentIds : [documentIds];
    const multiple = ids.length > 1;

    try {
      console.log(
        `Processing query: "${userQuery}" across ${ids.length} document(s)`
      );

      // Search for relevant chunks in the selected documents
      const similarChunks = await vectorService.searchSimilarChunks(
        userQuery,
        ids,
        multiple ? 8 : 5
      );

      if (similarChunks.length === 0) {
        return {
          answer:
            "I couldn't find relevant information in the document to answer your question. Please try rephrasing your question or ask about different topics covered in the document.",
          sources: []
        };
      }

      // Label each passage with its file so the answer can name the right document
      const context = similarChunks
        .map(
          (chunk) =>
            `[Source: ${chunk.metadata.fileName}]\n${chunk.metadata.text}`
        )
        .join("\n\n");

      // prompt for Gemini
      const prompt = `
Based on the following context from ${
        multiple ? "the user's documents" : "a document"
      }, please answer the user's question. Use only the information provided in the context. If the answer cannot be found in the context, please say so clearly.${
        multiple
          ? " When information comes from a specific file, mention the file name."
          : ""
      } You may use Markdown (bold text, bullet lists) to format the answer.

Context:
${context}

Question: ${userQuery}

Please provide a helpful and accurate answer based only on the context provided:`;

      console.log("Sending request to Gemini...");

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const answer = response.text();

      console.log("Received response from Gemini");

      return {
        answer: answer,
        sources: similarChunks.map((chunk) => ({
          text: chunk.metadata.text.substring(0, 200) + "...",
          score: chunk.score,
          chunkIndex: chunk.metadata.chunkIndex,
          fileName: chunk.metadata.fileName,
          documentId: chunk.metadata.documentId
        }))
      };
    } catch (error) {
      console.error("Error processing query:", error);

      return {
        answer: `I encountered an error while processing your question: ${error.message}. Please try again with a different question.`,
        sources: []
      };
    }
  }
}

module.exports = new ChatService();
