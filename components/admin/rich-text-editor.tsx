"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote"],
  ["link", "image"],
  ["clean"],
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: TOOLBAR_OPTIONS,
    }),
    []
  );

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder || "Write your content here..."}
        className="bg-background rounded-md"
      />
      <style jsx global>{`
        .rich-text-editor .ql-container {
          min-height: 300px;
          font-size: 0.95rem;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
        }
        .rich-text-editor .ql-container {
          border-color: hsl(var(--border));
        }
        /* Toolbar icon & label contrast (adapts to light/dark theme) */
        .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: hsl(var(--foreground) / 0.8);
        }
        .rich-text-editor .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground) / 0.8);
        }
        .rich-text-editor .ql-toolbar .ql-picker {
          color: hsl(var(--foreground) / 0.85);
        }
        .rich-text-editor .ql-toolbar .ql-picker-label {
          color: hsl(var(--foreground) / 0.85);
        }
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover {
          stroke: hsl(var(--primary));
          color: hsl(var(--primary));
        }
        .rich-text-editor .ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: hsl(var(--primary));
        }
        /* Dropdown menu (header picker) */
        .rich-text-editor .ql-picker-options {
          background: hsl(var(--popover));
          border-color: hsl(var(--border));
          color: hsl(var(--popover-foreground));
        }
        .rich-text-editor .ql-editor {
          min-height: 300px;
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-editor p {
          margin-bottom: 0.75em;
        }
        .rich-text-editor .ql-editor h1,
        .rich-text-editor .ql-editor h2,
        .rich-text-editor .ql-editor h3 {
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1em 0;
        }
      `}</style>
    </div>
  );
}
