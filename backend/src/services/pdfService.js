const fs = require("fs");
const pdfParse = require("pdf-parse");

class PDFService {
  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);

      const options = {
        max: 0, // No page limit
        normalizeWhitespace: true, // ✅ Enable normalization
        disableCombineTextItems: false
      };

      let pdfData;

      try {
        pdfData = await pdfParse(dataBuffer, options);
      } catch (primaryError) {
        console.log("Primary PDF parsing failed, trying recovery mode...");

        const recoveryOptions = {
          ...options,
          max: 200 // ✅ Limit pages for large books
        };

        pdfData = await pdfParse(dataBuffer, recoveryOptions);
      }

      // ✅ Better text cleaning
      const cleanText = pdfData.text
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n")
        .replace(/[^\x20-\x7E\n]/g, "") // Remove non-printable characters
        .trim();

      if (!cleanText || cleanText.length < 10) {
        throw new Error(
          "PDF appears to be empty or contains no extractable text"
        );
      }

      console.log(
        `Successfully extracted ${cleanText.length} characters from PDF`
      );
      return cleanText;
    } catch (error) {
      console.error("PDF extraction error:", error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  // ✅ Optimized chunking strategy
  splitTextIntoChunks(text, maxChunkSize = 800, overlap = 100) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    let currentChunk = "";
    let currentSize = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.trim().length;

      if (
        currentSize + sentenceLength > maxChunkSize &&
        currentChunk.length > 0
      ) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          startIndex: chunks.length * (maxChunkSize - overlap),
          endIndex:
            chunks.length * (maxChunkSize - overlap) + currentChunk.length
        });

        // Start new chunk with overlap
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + " " + sentence.trim();
        currentSize = overlapText.length + sentenceLength + 1;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence.trim();
        currentSize += sentenceLength + 1;
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex: chunks.length * (maxChunkSize - overlap),
        endIndex: chunks.length * (maxChunkSize - overlap) + currentChunk.length
      });
    }

    console.log(
      `Created ${chunks.length} chunks (avg size: ${Math.round(
        text.length / chunks.length
      )} chars)`
    );
    return chunks;
  }
}

module.exports = new PDFService();
