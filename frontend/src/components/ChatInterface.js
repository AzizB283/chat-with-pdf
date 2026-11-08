import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Markdown from "./Markdown";
import {
  SparklesIcon,
  SendIcon,
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  AlertIcon,
  QuoteIcon
} from "./Icons";
import { API_BASE_URL } from "../config";
import "./ChatInterface.css";

const SUGGESTIONS = [
  "Summarize this document in 5 bullet points",
  "What are the key findings or conclusions?",
  "List the important names, dates and figures",
  "Explain the main idea in simple terms"
];

const MULTI_SUGGESTIONS = [
  "Give me a short summary of each document",
  "What topics do these documents have in common?",
  "Where do the documents differ or disagree?",
  "List the most important facts across all files"
];

const relevance = (score) => {
  if (score >= 0.8) return { label: "High", cls: "high" };
  if (score >= 0.6) return { label: "Medium", cls: "medium" };
  return { label: "Low", cls: "low" };
};

const formatTime = (date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };
  return (
    <button className="msg-action" onClick={copy} title="Copy answer">
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

const Sources = ({ sources, showFileName }) => (
  <details className="sources">
    <summary>
      <QuoteIcon size={14} />
      {sources.length} source{sources.length > 1 ? "s" : ""}
      <ChevronDownIcon size={14} className="sources-chevron" />
    </summary>
    <div className="sources-list">
      {sources.map((source, i) => {
        const r = relevance(source.score);
        return (
          <div key={i} className="source-item">
            <div className="source-meta">
              <span className="source-chunk">
                {showFileName && source.fileName && (
                  <span className="source-file" title={source.fileName}>
                    {source.fileName}
                  </span>
                )}
                Passage {source.chunkIndex + 1}
              </span>
              <span className={`relevance ${r.cls}`}>
                {r.label} · {(source.score * 100).toFixed(0)}%
              </span>
            </div>
            <p className="source-text">{source.text}</p>
          </div>
        );
      })}
    </div>
  </details>
);

const ChatInterface = ({ documents = [] }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const hasDocuments = documents.length > 0;
  const multiple = documents.length > 1;
  const totalChars = documents.reduce((sum, d) => sum + (d.textLength || 0), 0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  useEffect(resizeTextarea, [inputValue]);

  const sendMessage = async (text) => {
    const content = text.trim();
    if (!content || isLoading || !hasDocuments) return;

    setMessages((prev) => [
      ...prev,
      { type: "user", content, timestamp: new Date() }
    ]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        message: content,
        documentIds: documents.map((d) => d.documentId)
      });

      if (response.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: response.data.response.answer,
            sources: response.data.response.sources,
            timestamp: new Date()
          }
        ]);
      } else {
        throw new Error(response.data.error || "Something went wrong");
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content: error.response?.data?.error || error.message,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div className="chat">
      <div className="panel-header">
        <div className="panel-title">
          <div className="ai-avatar">
            <SparklesIcon size={16} />
          </div>
          <div className="panel-title-text">
            <span className="panel-title-main">AI Assistant</span>
            <span className="panel-title-sub status-online">
              {multiple
                ? `Searching across ${documents.length} documents`
                : "Answers come only from this document"}
            </span>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            className="btn btn-ghost clear-btn"
            onClick={() => setMessages([])}
            disabled={isLoading}
          >
            Clear chat
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !isLoading ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <SparklesIcon size={26} />
            </div>
            <h3>
              {multiple
                ? `${documents.length} documents are ready`
                : "Your document is ready"}
            </h3>
            <p>
              Ask anything about{" "}
              <strong>
                {multiple ? "all your files" : documents[0]?.fileName}
              </strong>
              {totalChars
                ? ` (${totalChars.toLocaleString()} characters indexed)`
                : ""}
              . Try one of these to start:
            </p>
            <div className="suggestions">
              {(multiple ? MULTI_SUGGESTIONS : SUGGESTIONS).map((s) => (
                <button
                  key={s}
                  className="suggestion"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((m, i) => (
              <div key={i} className={`msg msg-${m.type}`}>
                {m.type !== "user" && (
                  <div className={`msg-avatar ${m.type}`}>
                    {m.type === "error" ? (
                      <AlertIcon size={15} />
                    ) : (
                      <SparklesIcon size={15} />
                    )}
                  </div>
                )}
                <div className="msg-body">
                  <div className="msg-bubble">
                    {m.type === "assistant" ? (
                      <Markdown text={m.content} />
                    ) : m.type === "error" ? (
                      <p>
                        <strong>Something went wrong.</strong> {m.content}
                      </p>
                    ) : (
                      <p className="msg-plain">{m.content}</p>
                    )}
                    {m.sources?.length > 0 && (
                      <Sources sources={m.sources} showFileName={multiple} />
                    )}
                  </div>
                  <div className="msg-footer">
                    <span>{formatTime(m.timestamp)}</span>
                    {m.type === "assistant" && <CopyButton text={m.content} />}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="msg msg-assistant">
                <div className="msg-avatar assistant">
                  <SparklesIcon size={15} />
                </div>
                <div className="msg-body">
                  <div className="msg-bubble typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="composer">
        <div className="composer-box">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              multiple
                ? "Ask a question about your documents…"
                : "Ask a question about your document…"
            }
            disabled={!hasDocuments || isLoading}
            className="composer-input"
          />
          <button
            type="submit"
            className="composer-send"
            disabled={!hasDocuments || isLoading || !inputValue.trim()}
            aria-label="Send message"
          >
            <SendIcon size={17} />
          </button>
        </div>
        <p className="composer-hint">
          <kbd>Enter</kbd> to send · <kbd>Shift</kbd> + <kbd>Enter</kbd> for a
          new line
        </p>
      </form>
    </div>
  );
};

export default ChatInterface;
