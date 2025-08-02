import React, { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import ChatInterface from "./components/ChatInterface";
import PDFViewer from "./components/PDFViewer";
import "./App.css";

function App() {
  const [currentDocument, setCurrentDocument] = useState(null);

  const handleDocumentUploaded = (documentData) => {
    setCurrentDocument(documentData);
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (currentDocument?.pdfUrl) {
        URL.revokeObjectURL(currentDocument.pdfUrl);
      }
    };
  }, [currentDocument]);

  return (
    <div className="App">
      {!currentDocument ? (
        // ✅ Show upload interface when no document
        <div className="upload-container">
          <header className="header">
            <h1>📚 NotebookLM Clone</h1>
            <p>Upload PDFs and chat with your documents using AI</p>
          </header>
          <div className="upload-section">
            <FileUpload onDocumentUploaded={handleDocumentUploaded} />
          </div>
        </div>
      ) : (
        // ✅ Show two-column layout when document is loaded
        <div className="app-layout">
          <div className="pdf-column">
            <PDFViewer
              pdfFile={currentDocument.pdfFile}
              fileName={currentDocument.fileName}
            />
          </div>

          <div className="chat-column">
            <ChatInterface
              currentDocument={currentDocument}
              onNewUpload={() => setCurrentDocument(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
