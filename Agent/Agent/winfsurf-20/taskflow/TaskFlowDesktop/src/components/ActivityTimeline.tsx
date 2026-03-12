import React from 'react';

interface TimelineItem {
  id: string;
  label: string;
  status?: 'completed' | 'running' | 'pending';
  timestamp?: string;
}

interface ActivityTimelineProps {
  items?: TimelineItem[];
  className?: string;
}

const defaultItems: TimelineItem[] = [
  { id: '1', label: 'Repo cloned', status: 'completed' },
  { id: '2', label: 'Dependencies installed', status: 'completed' },
  { id: '3', label: 'Running tests', status: 'running' },
  { id: '4', label: 'Deploying', status: 'pending' },
  { id: '5', label: 'Completed', status: 'pending' },
];

export function ActivityTimeline({ items = defaultItems, className = '' }: ActivityTimelineProps) {
  return (
    <div className={`space-y-0 ${className}`}>
      {items.map((item, i) => (
        <div key={item.id} className="flex items-start gap-2.5">
          <div className="flex flex-col items-center pt-0.5">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                item.status === 'completed'
                  ? 'bg-success'
                  : item.status === 'running'
                  ? 'bg-primary animate-pulse'
                  : 'bg-muted border border-border'
              }`}
            />
            {i < items.length - 1 && (
              <div className="w-0.5 flex-1 min-h-3 bg-border mt-1" />
            )}
          </div>
          <div className="pb-3.5 min-w-0 flex-1">
            <p
              className={`text-[12px] leading-snug ${
                item.status === 'completed'
                  ? 'text-muted-foreground'
                  : item.status === 'running'
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </p>
            {item.timestamp && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.timestamp}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
