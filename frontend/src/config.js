// Central place for branding and limits. Change values here and they update everywhere.
export const APP_NAME = "DocuChat AI";
export const APP_TAGLINE = "Chat with your documents and get cited answers in seconds";
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILES = 10;

// Keep in sync with the backend's allowed extensions (backend/src/server.js)
export const ACCEPTED_FILES = {
  "application/pdf": [".pdf"],
  "text/markdown": [".md", ".markdown"]
};

export const getFileType = (fileName = "") => {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
  return null;
};
