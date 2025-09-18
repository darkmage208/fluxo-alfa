import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface StreamingMarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

const StreamingMarkdownRenderer: React.FC<StreamingMarkdownRendererProps> = ({ 
  content, 
  className = '', 
  isStreaming = false 
}) => {
  const [renderContent, setRenderContent] = useState(content);
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Throttle content updates during streaming to improve performance while maintaining consistency
  useEffect(() => {
    if (!isStreaming) {
      // If not streaming, update immediately
      setRenderContent(content);
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If enough time has passed, update immediately
    if (timeSinceLastUpdate >= 150) {
      setRenderContent(content);
      lastUpdateRef.current = now;
    } else {
      // Otherwise, schedule an update
      timeoutRef.current = setTimeout(() => {
        setRenderContent(content);
        lastUpdateRef.current = Date.now();
      }, 150 - timeSinceLastUpdate);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, isStreaming]);

  // Memoize the markdown components to prevent unnecessary re-renders
  const markdownComponents = useMemo(() => ({
    // Custom styling for code blocks
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match ? match[1] : '';
      return !inline ? (
        <div className="relative group my-3">
          {lang && (
            <div className="absolute top-0 right-0 px-2 py-1 text-xs text-gray-400 bg-gray-800 rounded-tr-md rounded-bl-md">
              {lang}
            </div>
          )}
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto thin-scrollbar">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      ) : (
        <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    // Custom styling for blockquotes
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 pl-4 pr-3 py-2 my-3 italic text-gray-700 dark:text-gray-300 rounded-r-md">
        {children}
      </blockquote>
    ),
    // Custom styling for tables
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300">
        {children}
      </td>
    ),
    // Custom styling for lists
    ul: ({ children }: any) => (
      <ul className="list-disc pl-6 space-y-1 my-2 text-gray-700 dark:text-gray-300">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-6 space-y-1 my-2 text-gray-700 dark:text-gray-300">
        {children}
      </ol>
    ),
    // Custom styling for headings
    h1: ({ children }: any) => (
      <h1 className="text-2xl font-bold mt-4 mb-3 text-gray-800 dark:text-gray-100">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-xl font-bold mt-3 mb-2 text-gray-800 dark:text-gray-100">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-lg font-semibold mt-2 mb-1 text-gray-800 dark:text-gray-100">
        {children}
      </h3>
    ),
    // Custom styling for paragraphs
    p: ({ children }: any) => (
      <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
        {children}
      </p>
    ),
    // Custom styling for links
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-1 underline-offset-2 transition-colors"
      >
        {children}
      </a>
    ),
    // Custom styling for horizontal rules
    hr: () => (
      <hr className="my-4 border-t border-gray-300 dark:border-gray-600" />
    ),
    // Custom styling for strong text
    strong: ({ children }: any) => (
      <strong className="font-bold text-gray-900 dark:text-gray-100">
        {children}
      </strong>
    ),
    // Custom styling for emphasis
    em: ({ children }: any) => (
      <em className="italic text-gray-800 dark:text-gray-200">
        {children}
      </em>
    ),
  }), []);

  // Always use consistent markdown rendering, just throttled during streaming
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {renderContent}
      </ReactMarkdown>
    </div>
  );
};

export default memo(StreamingMarkdownRenderer);