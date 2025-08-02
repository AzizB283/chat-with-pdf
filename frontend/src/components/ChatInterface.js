import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./ChatInterface.css";

const ChatInterface = ({ currentDocument }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (currentDocument) {
      setMessages([
        {
          type: "system",
          content: `📄 Document "${currentDocument.fileName}" loaded successfully! You can now ask questions about its content.`,
          timestamp: new Date(),
          documentInfo: currentDocument
        }
      ]);
    } else {
      setMessages([]);
    }
  }, [currentDocument]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    if (!currentDocument) {
      alert("Please upload a document first!");
      return;
    }

    const userMessage = {
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await axios.post("/api/chat", {
        message: userMessage.content,
        documentId: currentDocument.documentId
      });

      if (response.data.success) {
        const aiResponse = {
          type: "assistant",
          content: response.data.response.answer,
          sources: response.data.response.sources,
          timestamp: new Date()
        };

        setMessages((prev) => [...prev, aiResponse]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = {
        type: "error",
        content: `Sorry, I encountered an error: ${
          error.response?.data?.error || error.message
        }`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getRelevanceColor = (score) => {
    if (score >= 0.8) return "#28a745";
    if (score >= 0.6) return "#ffc107";
    return "#dc3545";
  };

  const getRelevanceLabel = (score) => {
    if (score >= 0.8) return "High";
    if (score >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.length === 0 && !currentDocument && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>No document loaded</h3>
            <p>Upload a PDF document to start chatting with it!</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            <div className="message-content">
              {message.type === "system" && message.documentInfo && (
                <div className="system-document-info">
                  <div className="doc-info-header">
                    <span className="doc-icon">📄</span>
                    <span className="doc-name">
                      {message.documentInfo.fileName}
                    </span>
                  </div>
                  <div className="doc-stats">
                    <span className="stat-item">
                      📊 {message.documentInfo.textLength?.toLocaleString()}{" "}
                      chars
                    </span>
                  </div>
                </div>
              )}

              <div className="message-text">{message.content}</div>

              {message.sources && message.sources.length > 0 && (
                <div className="message-sources">
                  <div className="sources-header">
                    <span className="sources-icon">📚</span>
                    <span>Source References ({message.sources.length})</span>
                  </div>

                  <div className="sources-list">
                    {message.sources.map((source, sourceIndex) => (
                      <div key={sourceIndex} className="source-item">
                        <div className="source-header">
                          <span className="source-number">
                            #{source.chunkIndex + 1}
                          </span>
                          <div
                            className="relevance-badge"
                            style={{
                              backgroundColor: getRelevanceColor(source.score),
                              color: "white"
                            }}
                          >
                            {getRelevanceLabel(source.score)} (
                            {(source.score * 100).toFixed(1)}%)
                          </div>
                        </div>
                        <div className="source-text">{source.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="message-time">{formatTime(message.timestamp)}</div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant loading">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="loading-text">AI is thinking...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        {currentDocument && (
          <div className="current-document-indicator">
            <span className="doc-indicator-icon">📄</span>
            <span className="doc-indicator-text">
              {currentDocument.fileName}
            </span>
          </div>
        )}

        <div className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              currentDocument
                ? "Ask a question about your document..."
                : "Upload a document first"
            }
            disabled={!currentDocument || isLoading}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!currentDocument || isLoading || !inputValue.trim()}
            className="send-button"
          >
            {isLoading ? "⏳" : "➤"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
