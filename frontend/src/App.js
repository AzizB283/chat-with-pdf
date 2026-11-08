import React, { useState, useEffect, useCallback } from "react";
import FileUpload from "./components/FileUpload";
import ChatInterface from "./components/ChatInterface";
import DocumentViewer from "./components/DocumentViewer";
import FileBadge from "./components/FileBadge";
import {
  LogoMark,
  SearchIcon,
  QuoteIcon,
  ZapIcon,
  PlusIcon,
  FileTextIcon,
  MessageIcon,
  UploadIcon,
  LayersIcon,
  SparklesIcon,
  AlertIcon,
  XIcon
} from "./components/Icons";
import { APP_NAME, MAX_FILES } from "./config";
import "./App.css";

const FEATURES = [
  {
    icon: LayersIcon,
    title: "Multiple documents",
    text: "Upload up to 10 PDFs or Markdown files at once and ask questions across all of them in one chat."
  },
  {
    icon: QuoteIcon,
    title: "Cited answers",
    text: "Every answer shows the passages and file it came from, with relevance scores, so you can check it against the source."
  },
  {
    icon: SearchIcon,
    title: "Semantic search",
    text: "Documents are embedded into a vector database, so the AI finds passages by meaning, not just keywords."
  }
];

const STEPS = [
  {
    icon: UploadIcon,
    title: "Upload your files",
    text: "Drop in reports, contracts, research papers, docs or notes as PDF or Markdown."
  },
  {
    icon: ZapIcon,
    title: "We index them",
    text: "Text is extracted, chunked and stored as embeddings in Pinecone."
  },
  {
    icon: SparklesIcon,
    title: "Ask anything",
    text: "Gemini answers your questions using only the relevant parts of your documents."
  }
];

const Brand = () => (
  <div className="brand">
    <LogoMark size={30} />
    <span className="brand-name">{APP_NAME}</span>
  </div>
);

const describeErrors = (errors) =>
  errors.length
    ? `${errors.length} file${errors.length > 1 ? "s" : ""} couldn't be processed: ` +
      errors.map((e) => `${e.fileName} (${e.error})`).join(", ")
    : "";

function LandingPage({ onUploaded }) {
  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true" />

      <nav className="landing-nav">
        <Brand />
        <span className="nav-pill">
          <span className="nav-pill-dot" />
          Powered by Gemini &amp; Pinecone
        </span>
      </nav>

      <main className="hero">
        <span className="hero-badge">
          <SparklesIcon size={14} /> AI document assistant
        </span>
        <h1 className="hero-title">
          Turn your documents into a{" "}
          <span className="gradient-text">conversation</span>
        </h1>
        <p className="hero-subtitle">
          Upload PDFs or Markdown files and ask questions in plain English.
          You get answers in seconds, each linked to the passages it came from.
        </p>

        <div className="upload-card">
          <FileUpload onUploaded={onUploaded} />
        </div>

        <div className="trust-row">
          <span>PDF &amp; Markdown</span>
          <span className="dot-sep" />
          <span>Up to {MAX_FILES} files at once</span>
          <span className="dot-sep" />
          <span>Answers with sources</span>
        </div>
      </main>

      <section className="section">
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div className="feature-card" key={title}>
              <div className="feature-icon">
                <Icon size={20} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2>From upload to answers in three steps</h2>
        </div>
        <div className="steps">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div className="step" key={title}>
              <div className="step-number">{i + 1}</div>
              <div className="step-icon">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <Brand />
        <span>Built with React, Express, Pinecone &amp; Google Gemini</span>
      </footer>
    </div>
  );
}

function AddFilesDialog({ remaining, onClose, onUploaded }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-files-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 id="add-files-title">Add more files</h2>
            <p>
              New files join this chat. You can add {remaining} more.
            </p>
          </div>
          <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>
        <FileUpload onUploaded={onUploaded} maxFiles={remaining} />
      </div>
    </div>
  );
}

function Workspace({ documents, notice, onDismissNotice, onAdd, onRemove, onReset }) {
  const [mobileTab, setMobileTab] = useState("chat");
  const [activeId, setActiveId] = useState(documents[0]?.documentId);
  const [addOpen, setAddOpen] = useState(false);
  const remaining = MAX_FILES - documents.length;

  // Keep a valid tab selected when files are added or removed
  useEffect(() => {
    if (!documents.some((d) => d.documentId === activeId)) {
      setActiveId(documents[0]?.documentId);
    }
  }, [documents, activeId]);

  const handleAdded = useCallback(
    (result) => {
      setAddOpen(false);
      onAdd(result);
      if (result.documents[0]) setActiveId(result.documents[0].documentId);
    },
    [onAdd]
  );

  const closeDialog = useCallback(() => setAddOpen(false), []);

  return (
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-left">
          <button className="brand-btn" onClick={onReset} title="Start over">
            <Brand />
          </button>
          <span className="topbar-divider" />
          <div className="doc-chip" title={documents.map((d) => d.fileName).join("\n")}>
            {documents.length === 1 ? (
              <FileBadge type={documents[0].fileType} size="sm" />
            ) : (
              <LayersIcon size={15} />
            )}
            <span className="doc-chip-name">
              {documents.length === 1
                ? documents[0].fileName
                : `${documents.length} documents`}
            </span>
            <span className="doc-chip-status">Indexed</span>
          </div>
        </div>
        <div className="topbar-actions">
          {remaining > 0 && (
            <button className="btn btn-secondary" onClick={() => setAddOpen(true)}>
              <PlusIcon size={16} />
              <span className="hide-sm">Add files</span>
            </button>
          )}
          <button className="btn btn-primary" onClick={onReset}>
            <UploadIcon size={16} />
            <span className="hide-sm">New chat</span>
          </button>
        </div>
      </header>

      {notice && (
        <div className="notice" role="status">
          <AlertIcon size={16} />
          <span>{notice}</span>
          <button onClick={onDismissNotice} aria-label="Dismiss">
            <XIcon size={14} />
          </button>
        </div>
      )}

      <div className="mobile-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={mobileTab === "docs"}
          className={mobileTab === "docs" ? "active" : ""}
          onClick={() => setMobileTab("docs")}
        >
          <FileTextIcon size={16} />
          {documents.length > 1 ? `Documents (${documents.length})` : "Document"}
        </button>
        <button
          role="tab"
          aria-selected={mobileTab === "chat"}
          className={mobileTab === "chat" ? "active" : ""}
          onClick={() => setMobileTab("chat")}
        >
          <MessageIcon size={16} /> Chat
        </button>
      </div>

      <div className={`workspace-grid show-${mobileTab}`}>
        <section className="panel docs-panel">
          <DocumentViewer
            documents={documents}
            activeId={activeId}
            onSelect={setActiveId}
            onRemove={onRemove}
          />
        </section>
        <section className="panel chat-panel">
          <ChatInterface documents={documents} />
        </section>
      </div>

      {addOpen && (
        <AddFilesDialog
          remaining={remaining}
          onClose={closeDialog}
          onUploaded={handleAdded}
        />
      )}
    </div>
  );
}

function App() {
  const [documents, setDocuments] = useState([]);
  const [notice, setNotice] = useState("");
  // Changing the session id remounts the workspace, which clears the chat
  const [sessionId, setSessionId] = useState(0);

  const startSession = useCallback(({ documents: docs, errors }) => {
    setDocuments(docs);
    setNotice(describeErrors(errors));
    setSessionId((s) => s + 1);
  }, []);

  const addDocuments = useCallback(({ documents: docs, errors }) => {
    setDocuments((prev) => [...prev, ...docs].slice(0, MAX_FILES));
    setNotice(describeErrors(errors));
  }, []);

  const removeDocument = useCallback((id) => {
    setDocuments((prev) => prev.filter((d) => d.documentId !== id));
  }, []);

  const reset = useCallback(() => {
    setDocuments([]);
    setNotice("");
  }, []);

  if (documents.length === 0) {
    return <LandingPage onUploaded={startSession} />;
  }

  return (
    <Workspace
      key={sessionId}
      documents={documents}
      notice={notice}
      onDismissNotice={() => setNotice("")}
      onAdd={addDocuments}
      onRemove={removeDocument}
      onReset={reset}
    />
  );
}

export default App;
