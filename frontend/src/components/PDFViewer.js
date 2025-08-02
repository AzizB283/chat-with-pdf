import { useState, useEffect } from "react";
import "./PDFViewer.css";

const PDFViewer = ({ pdfFile, fileName }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (pdfFile) {
      try {
        // Create object URL from the file
        const url = URL.createObjectURL(pdfFile);
        setPdfUrl(url);
        setError(null);

        // Cleanup function
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        setError("Failed to create PDF URL");
      }
    }
  }, [pdfFile]);

  if (error) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-loading">
          <div className="loading-spinner"></div>
          <p>Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-header">
        <div className="pdf-title">
          <span className="pdf-icon">📄</span>
          <span className="pdf-name">{fileName}</span>
        </div>
        <div className="pdf-info">
          <span>Using browser's built-in PDF viewer</span>
        </div>
      </div>

      <div className="pdf-content">
        <iframe
          src={pdfUrl}
          width="100%"
          height="100%"
          title={`PDF Viewer - ${fileName}`}
          className="pdf-iframe"
        />
      </div>
    </div>
  );
};

export default PDFViewer;
