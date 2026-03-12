import React, { useState, useRef } from 'react';
import { useThemeStore } from '../design-system/theme';

interface WorkflowCard {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  position: { x: number; y: number };
  connections: string[];
  details?: string;
  colorLight?: string;
  colorDark?: string;
}

interface WorkflowBoardProps {
  className?: string;
}

export function WorkflowBoard({ className = '' }: WorkflowBoardProps) {
  const { resolvedTheme } = useThemeStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [cards, setCards] = useState<WorkflowCard[]>([
    {
      id: '1',
      title: 'Initialize Task',
      status: 'completed',
      position: { x: 100, y: 50 },
      connections: ['2', '3'],
      colorLight: '#fef3c7',
      colorDark: '#854d0e'
    },
    {
      id: '2',
      title: 'Data Collection',
      status: 'completed',
      position: { x: 250, y: 100 },
      connections: ['4'],
      colorLight: '#fef3c7',
      colorDark: '#854d0e'
    },
    {
      id: '3',
      title: 'Validation',
      status: 'running',
      position: { x: 250, y: 250 },
      connections: ['5'],
      colorLight: '#fecaca',
      colorDark: '#991b1b'
    },
    {
      id: '4',
      title: 'Processing',
      status: 'completed',
      position: { x: 400, y: 80 },
      connections: ['6'],
      colorLight: '#fef3c7',
      colorDark: '#854d0e'
    },
    {
      id: '5',
      title: 'Error Check',
      status: 'pending',
      position: { x: 400, y: 280 },
      connections: ['6'],
      colorLight: '#fef3c7',
      colorDark: '#854d0e'
    },
    {
      id: '6',
      title: 'Analysis',
      status: 'pending',
      position: { x: 550, y: 150 },
      connections: ['7', '8'],
      colorLight: '#fef3c7',
      colorDark: '#854d0e'
    },
    {
      id: '7',
      title: 'Report Gen',
      status: 'pending',
      position: { x: 700, y: 100 },
      connections: ['9'],
      colorLight: '#fef3c7',
      colorDark: '#854d0e'
    },
    {
      id: '8',
      title: 'Notification',
      status: 'pending',
      position: { x: 700, y: 250 },
      connections: ['9'],
      colorLight: '#fef3c7',
      colorDark: '#854d0e'
    },
    {
      id: '9',
      title: 'Complete',
      status: 'pending',
      position: { x: 850, y: 180 },
      connections: [],
      colorLight: '#d1fae5',
      colorDark: '#065f46'
    }
  ]);

  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-success bg-success/10';
      case 'running': return 'border-warning bg-warning/10 shadow-lg shadow-warning/20';
      case 'failed': return 'border-destructive bg-destructive/10';
      case 'pending': return 'border-muted bg-background';
      default: return 'border-muted bg-background';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'running': return '⟳';
      case 'failed': return '✗';
      case 'pending': return '○';
      default: return '○';
    }
  };

  const drawCurvedLine = (from: WorkflowCard, to: WorkflowCard) => {
    const startX = from.position.x + 60;
    const startY = from.position.y + 100;
    const endX = to.position.x + 60;
    const endY = to.position.y + 20;
    
    const controlX1 = startX + (endX - startX) * 0.3;
    const controlY1 = startY + (endY - startY) * 0.1;
    const controlX2 = startX + (endX - startX) * 0.7;
    const controlY2 = startY + (endY - startY) * 0.9;

    return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
  };

  const handleMouseDown = (e: React.MouseEvent, cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setDragOffset({
      x: e.clientX - card.position.x,
      y: e.clientY - card.position.y
    });
    setDraggedCard(cardId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedCard) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setCards(cards.map(card =>
      card.id === draggedCard
        ? { ...card, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
        : card
    ));
  };

  const handleMouseUp = () => {
    setDraggedCard(null);
  };

  const isDark = resolvedTheme === 'dark';
  const bgClass = isDark 
    ? 'bg-gradient-to-br from-slate-800 to-slate-900' 
    : 'bg-gradient-to-br from-muted/30 to-background';

  return (
    <div className={`relative w-full h-full ${bgClass} overflow-hidden ${className}`}>
      {/* Logo in corner */}
      <div className="absolute top-6 left-6 z-20">
        <div className={`px-6 py-4 rounded-lg shadow-lg ${
          isDark 
            ? 'bg-amber-600 text-white' 
            : 'bg-warning text-warning-foreground'
        }`}>
          <div className="text-2xl font-bold">Agent Windsurf Amline</div>
          <div className="text-xs opacity-80">Workflow Engine</div>
        </div>
      </div>

      {/* SVG for connection lines */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ minHeight: '600px' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={isDark ? '#94a3b8' : 'hsl(var(--muted-foreground))'} opacity={isDark ? '0.6' : '0.4'} />
          </marker>
        </defs>
        {cards.map(card =>
          card.connections.map(targetId => {
            const targetCard = cards.find(c => c.id === targetId);
            if (!targetCard) return null;
            return (
              <path
                key={`${card.id}-${targetId}`}
                d={drawCurvedLine(card, targetCard)}
                stroke={isDark ? '#94a3b8' : 'hsl(var(--muted-foreground))'}
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
                opacity={isDark ? '0.5' : '0.3'}
                markerEnd="url(#arrowhead)"
              />
            );
          })
        )}
      </svg>

      {/* Workflow Cards */}
      <div
        className="relative w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ minHeight: '600px' }}
      >
        {cards.map(card => (
          <div
            key={card.id}
            className={`absolute cursor-move transition-shadow hover:shadow-xl z-10 ${
              draggedCard === card.id ? 'shadow-2xl scale-105' : ''
            }`}
            style={{
              left: `${card.position.x}px`,
              top: `${card.position.y}px`,
              width: '120px',
              backgroundColor: isDark ? (card.colorDark || '#854d0e') : (card.colorLight || '#fef3c7')
            }}
            onMouseDown={(e) => handleMouseDown(e, card.id)}
          >
            {/* Card Header */}
            <div className={`border-2 rounded-t-lg p-2 ${getStatusColor(card.status)}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{getStatusIcon(card.status)}</span>
                <div className="text-xs font-mono opacity-60">#{card.id}</div>
              </div>
              <div className="text-xs font-semibold text-foreground/90 leading-tight">
                {card.title}
              </div>
            </div>

            {/* Card Body */}
            <div className="border-2 border-t-0 rounded-b-lg p-2 bg-background/95">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Status: <span className="font-medium">{card.status}</span>
                </div>
                {card.connections.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Next: {card.connections.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Panel */}
      <div className={`absolute bottom-6 right-6 backdrop-blur border rounded-lg p-4 shadow-lg max-w-xs z-20 ${
        isDark 
          ? 'bg-slate-800/95 border-slate-700' 
          : 'bg-panel/95 border-border'
      }`}>
        <h3 className="text-sm font-semibold mb-2">Workflow Status</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Steps:</span>
            <span className="font-medium">{cards.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Completed:</span>
            <span className="font-medium text-success">
              {cards.filter(c => c.status === 'completed').length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Running:</span>
            <span className="font-medium text-warning">
              {cards.filter(c => c.status === 'running').length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pending:</span>
            <span className="font-medium text-muted-foreground">
              {cards.filter(c => c.status === 'pending').length}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            💡 Drag cards to rearrange workflow
          </div>
        </div>
      </div>
    </div>
  );
}
