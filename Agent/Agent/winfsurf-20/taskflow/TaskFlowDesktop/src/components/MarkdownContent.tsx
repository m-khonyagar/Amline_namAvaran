import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-secondary prose-pre:text-foreground prose-li:text-foreground prose-blockquote:text-muted-foreground ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { inline, className, children, ...rest } = props as any;
            if (inline) {
              return (
                <code className="rounded bg-secondary px-1.5 py-0.5 text-[12px] text-foreground" {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="overflow-x-auto rounded-2xl border border-border bg-secondary/70 p-3 text-[12px]">
                <code className={className} {...rest}>
                  {children}
                </code>
              </pre>
            );
          },
          a(props) {
            return <a {...props} className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
