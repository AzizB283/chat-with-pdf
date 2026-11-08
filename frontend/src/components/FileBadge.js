import React from "react";
import { FileTextIcon } from "./Icons";

// Coloured file-type icon: red for PDF, blue for Markdown.
const FileBadge = ({ type, size = "md" }) => (
  <span className={`file-badge ${type === "markdown" ? "md" : "pdf"} ${size}`}>
    {type === "markdown" ? (
      <span className="file-badge-text">MD</span>
    ) : (
      <FileTextIcon size={size === "sm" ? 13 : 16} />
    )}
  </span>
);

export default FileBadge;
