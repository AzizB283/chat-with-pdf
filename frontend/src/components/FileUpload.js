import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { UploadIcon, CheckIcon, AlertIcon } from "./Icons";
import FileBadge from "./FileBadge";
import {
  API_BASE_URL,
  MAX_FILE_SIZE_MB,
  MAX_FILES,
  ACCEPTED_FILES,
  getFileType
} from "../config";
import "./FileUpload.css";

const STAGES = [
  "Uploading files",
  "Extracting text",
  "Creating embeddings",
  "Preparing chat"
];

export const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Upload one or more PDF / Markdown files.
 * Calls onUploaded({ documents, errors }) when at least one file succeeds.
 * `maxFiles` lets the workspace limit how many more files can be added.
 */
const FileUpload = ({ onUploaded, maxFiles = MAX_FILES }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const onDrop = useCallback(
    async (acceptedFiles, fileRejections) => {
      setError("");

      if (fileRejections?.some((r) => r.errors[0]?.code === "too-many-files")) {
        setError(`You can upload up to ${maxFiles} files at once.`);
        return;
      }
      if (fileRejections?.length) {
        setError(
          "Some files were skipped. Only PDF and Markdown (.md) files are supported."
        );
        if (!acceptedFiles.length) return;
      }

      const tooBig = acceptedFiles.find(
        (f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024
      );
      if (tooBig) {
        setError(
          `"${tooBig.name}" is too large. Each file must be ${MAX_FILE_SIZE_MB}MB or smaller.`
        );
        return;
      }
      if (!acceptedFiles.length) return;

      setFiles(acceptedFiles);
      setUploading(true);
      setProgress(0);
      setStage(0);

      try {
        const formData = new FormData();
        acceptedFiles.forEach((f) => formData.append("files", f));

        const response = await axios.post(
          `${API_BASE_URL}/api/upload`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 600000,
            onUploadProgress: (e) => {
              if (!e.total) return;
              const pct = Math.round((e.loaded / e.total) * 100);
              setProgress(Math.min(pct * 0.35, 35));
              if (pct >= 100 && timers.current.length === 0) {
                // Server-side stages are approximate and only give visual feedback
                setStage(1);
                setProgress(45);
                timers.current.push(
                  setTimeout(() => {
                    setStage(2);
                    setProgress(70);
                  }, 1800),
                  setTimeout(() => setProgress(85), 5000)
                );
              }
            }
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.error || "Upload failed");
        }

        clearTimers();
        setStage(3);
        setProgress(100);

        // Match server results back to the File objects (for previewing)
        const pool = [...acceptedFiles];
        const documents = response.data.documents.map((doc) => {
          const idx = pool.findIndex((f) => f.name === doc.fileName);
          const file = idx >= 0 ? pool.splice(idx, 1)[0] : null;
          return {
            ...doc,
            fileType: doc.fileType || getFileType(doc.fileName),
            fileSize: file?.size,
            file,
            uploadedAt: new Date()
          };
        });

        setTimeout(
          () => onUploaded({ documents, errors: response.data.errors || [] }),
          450
        );
      } catch (err) {
        console.error("Upload error:", err);
        clearTimers();
        setUploading(false);
        setFiles([]);
        const failed = err.response?.data?.errors;
        setError(
          failed?.length > 1
            ? failed.map((f) => `${f.fileName}: ${f.error}`).join(" · ")
            : err.response?.data?.error ||
                (err.code === "ERR_NETWORK"
                  ? "Can't reach the server. Make sure the backend is running."
                  : err.message)
        );
      }
    },
    [onUploaded, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILES,
    multiple: maxFiles > 1,
    maxFiles,
    disabled: uploading,
    noClick: true
  });

  if (uploading && files.length) {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    return (
      <div className="upload-processing">
        <div className="processing-head">
          <span className="processing-title">
            {files.length === 1
              ? files[0].name
              : `Processing ${files.length} files`}
          </span>
          <span className="processing-pct">{Math.round(progress)}%</span>
        </div>
        <span className="processing-sub">{formatFileSize(totalSize)} total</span>

        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {files.length > 1 && (
          <ul className="processing-files">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                <FileBadge type={getFileType(f.name)} size="sm" />
                <span className="pf-name">{f.name}</span>
                <span className="pf-size">{formatFileSize(f.size)}</span>
              </li>
            ))}
          </ul>
        )}

        <ul className="stage-list">
          {STAGES.map((label, i) => {
            const state = i < stage ? "done" : i === stage ? "active" : "";
            return (
              <li key={label} className={`stage ${state}`}>
                <span className="stage-dot">
                  {i < stage ? <CheckIcon size={12} strokeWidth={3} /> : null}
                </span>
                {label}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="file-upload">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "active" : ""}`}
        onClick={open}
      >
        <input {...getInputProps()} />
        <div className="dropzone-icon">
          <UploadIcon size={26} />
        </div>
        <h3 className="dropzone-title">
          {isDragActive ? "Drop your files here" : "Drag & drop your files here"}
        </h3>
        <div className="format-chips">
          <span className="format-chip pdf">PDF</span>
          <span className="format-chip md">Markdown</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          <UploadIcon size={16} /> Browse files
        </button>
        <p className="dropzone-hint">
          {maxFiles > 1 ? `Up to ${maxFiles} files · ` : ""}Max{" "}
          {MAX_FILE_SIZE_MB}MB each
        </p>
      </div>

      {error && (
        <div className="upload-error" role="alert">
          <AlertIcon size={18} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
