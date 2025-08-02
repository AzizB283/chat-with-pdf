import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import "./FileUpload.css";

const FileUpload = ({ onDocumentUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadedDocument, setUploadedDocument] = useState(null);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      const file = acceptedFiles[0];

      if (!file) return;

      if (file.type !== "application/pdf") {
        setUploadStatus("Please upload a PDF file only");
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setUploadStatus("File size should be less than 50MB");
        return;
      }

      setUploading(true);
      setUploadStatus("Uploading and processing PDF...");

      try {
        const formData = new FormData();
        formData.append("pdf", file);

        const response = await axios.post("/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          timeout: 300000
        });

        if (response.data.success) {
          // ✅ CORRECT: Pass the file directly as per official docs
          const documentData = {
            documentId: response.data.documentId,
            fileName: response.data.fileName,
            textLength: response.data.textLength,
            fileSize: file.size,
            uploadedAt: new Date(),
            pdfFile: file, // ✅ Pass the File object directly
            originalFile: file
          };

          setUploadedDocument(documentData);
          setUploadStatus("PDF processed successfully!");
          onDocumentUploaded(documentData);
        }
      } catch (error) {
        console.error("Upload error:", error);
        setUploadStatus(
          `Upload failed: ${error.response?.data?.error || error.message}`
        );
        setUploadedDocument(null);
      } finally {
        setUploading(false);
      }
    },
    [onDocumentUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"]
    },
    multiple: false,
    disabled: uploading || uploadedDocument
  });

  const handleNewUpload = () => {
    setUploadedDocument(null);
    setUploadStatus("");
    onDocumentUploaded(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date) => {
    return date.toLocaleString();
  };

  return (
    <div className="file-upload">
      {!uploadedDocument ? (
        <>
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? "active" : ""} ${
              uploading ? "uploading" : ""
            }`}
          >
            <input {...getInputProps()} />

            <div className="dropzone-content">
              <div className="upload-icon">📎</div>

              {uploading ? (
                <div className="upload-progress">
                  <div className="spinner"></div>
                  <p>Processing your PDF...</p>
                </div>
              ) : (
                <>
                  <h3>Drop your PDF here</h3>
                  <p>or click to browse files</p>
                  <small>Maximum file size: 50MB</small>
                </>
              )}
            </div>
          </div>

          {uploadStatus && (
            <div
              className={`upload-status ${
                uploadStatus.includes("success")
                  ? "success"
                  : uploadStatus.includes("failed") ||
                    uploadStatus.includes("Please")
                  ? "error"
                  : "info"
              }`}
            >
              {uploadStatus}
            </div>
          )}
        </>
      ) : (
        <div className="uploaded-document-info">
          <div className="document-header">
            <div className="document-icon">📄</div>
            <div className="document-info">
              <h3 className="document-title">{uploadedDocument.fileName}</h3>
              <div className="document-meta">
                <span className="meta-item">
                  📊 {uploadedDocument.textLength?.toLocaleString()} characters
                </span>
                <span className="meta-item">
                  💾 {formatFileSize(uploadedDocument.fileSize)}
                </span>
                <span className="meta-item">
                  🕒 {formatDate(uploadedDocument.uploadedAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="document-status">
            <div className="status-indicator success">
              <span className="status-dot"></span>
              Ready for viewing and chat
            </div>
          </div>

          <div className="document-actions">
            <button onClick={handleNewUpload} className="new-upload-btn">
              📎 Upload New PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
