const { Pinecone } = require("@pinecone-database/pinecone");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require("uuid");
const pdfService = require("./pdfService");

class VectorService {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    // ✅ Use Gemini instead of OpenAI
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({
      model: "embedding-001"
    });

    this.indexName = process.env.PINECONE_INDEX_NAME;
  }

  async ensureIndexExists() {
    try {
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(
        (index) => index.name === this.indexName
      );

      if (!indexExists) {
        console.log(`Creating index: ${this.indexName}`);
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 768, // ✅ Gemini embedding dimension
          metric: "cosine",
          spec: {
            serverless: {
              cloud: "aws",
              region: "us-east-1"
            }
          }
        });

        // Wait for index to be ready
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    } catch (error) {
      console.error("Error ensuring index exists:", error);
      throw error;
    }
  }

  // ✅ Use Gemini for embeddings
  async getEmbedding(text) {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error("Error creating Gemini embedding:", error);

      // ✅ Fallback: Simple text-to-vector conversion (basic but fast)
      // This is a simple hash-based embedding as emergency fallback
      return this.createSimpleEmbedding(text);
    }
  }

  // ✅ Emergency fallback embedding (very basic)
  createSimpleEmbedding(text) {
    const embedding = new Array(768).fill(0);
    const words = text.toLowerCase().split(/\s+/).slice(0, 100);

    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      embedding[hash % 768] += 1;
    });

    // Normalize
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    return embedding.map((val) => (magnitude > 0 ? val / magnitude : 0));
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // ✅ Optimized batch processing
  async processAndStoreDocument(fileName, text) {
    try {
      await this.ensureIndexExists();

      const documentId = uuidv4();
      const chunks = pdfService.splitTextIntoChunks(text, 800, 100); // Smaller chunks

      console.log(
        `Processing ${chunks.length} chunks for document ${documentId}`
      );

      const index = this.pinecone.index(this.indexName);

      // ✅ Larger batches with concurrency control
      const batchSize = 50; // Increased batch size
      const concurrentBatches = 3; // Process multiple batches concurrently

      for (let i = 0; i < chunks.length; i += batchSize * concurrentBatches) {
        const batchPromises = [];

        for (
          let j = 0;
          j < concurrentBatches && i + j * batchSize < chunks.length;
          j++
        ) {
          const startIdx = i + j * batchSize;
          const endIdx = Math.min(startIdx + batchSize, chunks.length);
          const batch = chunks.slice(startIdx, endIdx);

          batchPromises.push(
            this.processBatch(batch, documentId, fileName, startIdx)
          );
        }

        const batchResults = await Promise.all(batchPromises);

        // Upsert all batches
        for (const vectors of batchResults) {
          if (vectors.length > 0) {
            await index.upsert(vectors);
          }
        }

        console.log(
          `Processed ${Math.min(
            i + batchSize * concurrentBatches,
            chunks.length
          )}/${chunks.length} chunks`
        );
      }

      console.log(`Stored ${chunks.length} chunks for document ${documentId}`);
      return documentId;
    } catch (error) {
      console.error("Error processing document:", error);
      throw error;
    }
  }

  // ✅ Process batch with concurrent embedding generation
  async processBatch(batch, documentId, fileName, startIndex) {
    const vectors = [];

    // Process embeddings concurrently within batch
    const embeddingPromises = batch.map((chunk) =>
      this.getEmbedding(chunk.text)
    );
    const embeddings = await Promise.all(embeddingPromises);

    embeddings.forEach((embedding, index) => {
      if (embedding && embedding.length > 0) {
        vectors.push({
          id: `${documentId}_${startIndex + index}`,
          values: embedding,
          metadata: {
            documentId: documentId,
            fileName: fileName,
            text: batch[index].text,
            chunkIndex: startIndex + index,
            startIndex: batch[index].startIndex,
            endIndex: batch[index].endIndex
          }
        });
      }
    });

    return vectors;
  }

  async searchSimilarChunks(query, documentId, topK = 5) {
    try {
      const queryEmbedding = await this.getEmbedding(query);
      const index = this.pinecone.index(this.indexName);

      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK: topK,
        filter: { documentId: documentId },
        includeMetadata: true
      });

      return searchResponse.matches || [];
    } catch (error) {
      console.error("Error searching similar chunks:", error);
      throw error;
    }
  }
}

module.exports = new VectorService();
