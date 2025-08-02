const { GoogleGenerativeAI } = require("@google/generative-ai");
const vectorService = require("./vectorService");

class ChatService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
  }

  async processQuery(userQuery, documentId) {
    try {
      console.log(
        `Processing query: "${userQuery}" for document: ${documentId}`
      );

      // Search for relevant chunks in the document
      const similarChunks = await vectorService.searchSimilarChunks(
        userQuery,
        documentId,
        5
      );

      if (similarChunks.length === 0) {
        return {
          answer:
            "I couldn't find relevant information in the document to answer your question. Please try rephrasing your question or ask about different topics covered in the document.",
          sources: []
        };
      }

      // Extract text from similar chunks
      const relevantTexts = similarChunks.map((chunk) => chunk.metadata.text);
      const context = relevantTexts.join("\n\n");

      // prompt for Gemini
      const prompt = `
Based on the following context from a document, please answer the user's question. Use only the information provided in the context. If the answer cannot be found in the context, please say so clearly.

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
          chunkIndex: chunk.metadata.chunkIndex
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
