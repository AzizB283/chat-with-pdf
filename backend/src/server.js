const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const pdfService = require("./services/pdfService");
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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  }
});

// Routes
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`Processing PDF: ${fileName}`);

    // File validation
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return res.status(400).json({ error: "Uploaded file is empty" });
    }

    // Extract text from PDF
    const extractedText = await pdfService.extractTextFromPDF(filePath);

    fs.unlinkSync(filePath);
    filePath = null; // Mark as cleaned up

    // Process and store in vector database
    const documentId = await vectorService.processAndStoreDocument(
      fileName,
      extractedText
    );

    res.json({
      success: true,
      documentId: documentId,
      fileName: fileName,
      textLength: extractedText.length,
      message: "PDF processed successfully"
    });
  } catch (error) {
    console.error("Upload error:", error);

    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }

    res.status(500).json({
      error: "Server error during upload processing",
      details: error.message
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, documentId } = req.body;

    if (!message || !documentId) {
      return res
        .status(400)
        .json({ error: "Message and documentId are required" });
    }

    const response = await chatService.processQuery(message, documentId);

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
