import React, { useState, useEffect } from "react";
import { ExternalLinkIcon, AlertIcon, XIcon } from "./Icons";
import FileBadge from "./FileBadge";
import Markdown from "./Markdown";
import { formatFileSize } from "./FileUpload";
import "./DocumentViewer.css";

const PdfPreview = ({ file, fileName, onUrl }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    onUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      onUrl(null);
    };
  }, [file, onUrl]);

  if (!url) return <Loading />;
  return (
    <iframe src={url} title={`Preview: ${fileName}`} className="pdf-iframe" />
  );
};

const MarkdownPreview = ({ file }) => {
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    file
      .text()
      .then((t) => !cancelled && setText(t))
      .catch(() => !cancelled && setError("Couldn't read this file."));
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (error) return <ErrorState message={error} />;
  if (text === null) return <Loading />;
  return (
    <div className="md-preview">
      <Markdown text={text} className="md-document" />
    </div>
  );
};

const Loading = () => (
  <div className="viewer-state">
    <div className="loading-spinner" />
    <p>Loading preview…</p>
  </div>
);

const ErrorState = ({ message }) => (
  <div className="viewer-state">
    <AlertIcon size={28} />
    <p>{message}</p>
  </div>
);

const DocumentViewer = ({ documents, activeId, onSelect, onRemove }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const active =
    documents.find((d) => d.documentId === activeId) || documents[0];

  if (!active) return null;

  return (
    <div className="doc-viewer">
      {documents.length > 1 && (
        <div className="doc-tabs" role="tablist">
          {documents.map((doc) => (
            <div
              key={doc.documentId}
              role="tab"
              aria-selected={doc.documentId === active.documentId}
              className={`doc-tab ${
                doc.documentId === active.documentId ? "active" : ""
              }`}
              onClick={() => onSelect(doc.documentId)}
              title={doc.fileName}
            >
              <FileBadge type={doc.fileType} size="sm" />
              <span className="doc-tab-name">{doc.fileName}</span>
              <button
                className="doc-tab-close"
                aria-label={`Remove ${doc.fileName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(doc.documentId);
                }}
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="panel-header">
        <div className="panel-title">
          <FileBadge type={active.fileType} />
          <div className="panel-title-text">
            <span className="panel-title-main" title={active.fileName}>
              {active.fileName}
            </span>
            <span className="panel-title-sub">
              {active.fileType === "markdown" ? "Markdown" : "PDF"}
              {active.fileSize ? ` · ${formatFileSize(active.fileSize)}` : ""}
              {active.textLength
                ? ` · ${active.textLength.toLocaleString()} characters`
                : ""}
            </span>
          </div>
        </div>
        {active.fileType === "pdf" && pdfUrl && (
          <a
            className="btn btn-ghost icon-btn"
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
          >
            <ExternalLinkIcon size={16} />
          </a>
        )}
      </div>

      <div className="viewer-content">
        {!active.file ? (
          <ErrorState message="Preview isn't available for this file." />
        ) : active.fileType === "markdown" ? (
          <MarkdownPreview key={active.documentId} file={active.file} />
        ) : (
          <PdfPreview
            key={active.documentId}
            file={active.file}
            fileName={active.fileName}
            onUrl={setPdfUrl}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
