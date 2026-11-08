const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const pdfService = require("./services/pdfService");
const markdownService = require("./services/markdownService");
const vectorService = require("./services/vectorService");
const chatService = require("./services/chatService");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1); // Trust first proxy

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests, please try again later.",
      retryAfter: Math.round(15 * 60) // 15 minutes in seconds
    });
  }
});

// Middleware
app.use(limiter);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  }
});

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 50;
const PDF_EXTENSIONS = [".pdf"];
const MARKDOWN_EXTENSIONS = [".md", ".markdown"];

const getFileType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  if (PDF_EXTENSIONS.includes(ext)) return "pdf";
  if (MARKDOWN_EXTENSIONS.includes(ext)) return "markdown";
  return null;
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // per file
    files: MAX_FILES
  },
  fileFilter: function (req, file, cb) {
    // Check the extension: browsers report inconsistent MIME types for Markdown
    if (getFileType(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Markdown (.md) files are allowed"), false);
    }
  }
});

const extractText = async (file) => {
  switch (getFileType(file.originalname)) {
    case "pdf":
      return pdfService.extractTextFromPDF(file.path);
    case "markdown":
      return markdownService.extractTextFromMarkdown(file.path);
    default:
      throw new Error("Unsupported file type");
  }
};

const removeFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Cleanup error:", err);
  }
};

const uploadErrorMessage = (err) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return `Each file must be ${MAX_FILE_SIZE_MB}MB or smaller`;
  }
  if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
    return `You can upload up to ${MAX_FILES} files at once`;
  }
  return err.message;
};

// Routes

// Accepts one or more PDF / Markdown files in the "files" field.
// Each file is processed on its own, so one bad file doesn't fail the rest.
app.post("/api/upload", (req, res) => {
  upload.array("files", MAX_FILES)(req, res, async (uploadError) => {
    if (uploadError) {
      (req.files || []).forEach((f) => removeFile(f.path));
      return res.status(400).json({ error: uploadErrorMessage(uploadError) });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const documents = [];
    const errors = [];

    for (const file of files) {
      const fileName = file.originalname;
      try {
        console.log(`Processing file: ${fileName}`);

        if (file.size === 0) {
          throw new Error("File is empty");
        }

        const extractedText = await extractText(file);
        removeFile(file.path);

        const documentId = await vectorService.processAndStoreDocument(
          fileName,
          extractedText
        );

        documents.push({
          documentId,
          fileName,
          fileType: getFileType(fileName),
          textLength: extractedText.length
        });
      } catch (error) {
        console.error(`Upload error for ${fileName}:`, error);
        removeFile(file.path);
        errors.push({ fileName, error: error.message });
      }
    }

    if (documents.length === 0) {
      return res.status(500).json({
        error:
          errors.length === 1
            ? errors[0].error
            : "None of the files could be processed",
        errors
      });
    }

    res.json({
      success: true,
      documents,
      errors,
      message: `${documents.length} file(s) processed successfully`
    });
  });
});

// Body: { message, documentIds: [...] }  (a single documentId is also accepted)
app.post("/api/chat", async (req, res) => {
  try {
    const { message, documentId, documentIds } = req.body;
    const ids = Array.isArray(documentIds)
      ? documentIds.filter(Boolean)
      : documentId
      ? [documentId]
      : [];

    if (!message || ids.length === 0) {
      return res
        .status(400)
        .json({ error: "Message and at least one documentId are required" });
    }

    const response = await chatService.processQuery(message, ids);

    res.json({
      success: true,
      response: response
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
