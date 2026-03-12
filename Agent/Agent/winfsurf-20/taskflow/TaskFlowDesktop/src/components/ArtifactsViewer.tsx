import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { backend } from '../api';

interface ArtifactsViewerProps {
  className?: string;
}

export function ArtifactsViewer({ className = '' }: ArtifactsViewerProps) {
  const { t } = useTranslation();
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backend.getArtifacts().then(setArtifacts).catch(() => setArtifacts([])).finally(() => setLoading(false));
  }, []);

  const defaultArtifacts = [
    {
      id: '1',
      name: 'app.py',
      type: 'code',
      path: '/workspace/flask_app/app.py',
      size: 2048,
      content: `from flask import Flask, render_template, request
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/posts', methods=['GET'])
def get_posts():
    posts = Post.query.all()
    return jsonify([{'id': p.id, 'title': p.title, 'content': p.content} for p in posts])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)`,
      language: 'python',
      createdAt: '2026-03-11T10:20:00Z',
      taskId: '1',
    },
    {
      id: '2',
      name: 'requirements.txt',
      type: 'text',
      path: '/workspace/flask_app/requirements.txt',
      size: 256,
      content: `Flask==2.3.3
Flask-SQLAlchemy==3.0.5
SQLAlchemy==2.0.21
Werkzeug==2.3.7
Jinja2==3.1.2
click==8.1.7
itsdangerous==2.1.2
MarkupSafe==2.1.3`,
      language: 'text',
      createdAt: '2026-03-11T10:15:00Z',
      taskId: '1',
    },
    {
      id: '3',
      name: 'index.html',
      type: 'code',
      path: '/workspace/flask_app/templates/index.html',
      size: 1024,
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flask Blog</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-8">Flask Blog</h1>
        <div id="posts" class="space-y-4">
            <!-- Posts will be loaded here -->
        </div>
    </div>
    <script src="/static/js/app.js"></script>
</body>
</html>`,
      language: 'html',
      createdAt: '2026-03-11T10:25:00Z',
      taskId: '1',
    },
    {
      id: '4',
      name: 'research_notes.md',
      type: 'text',
      path: '/workspace/research/web_dev_best_practices.md',
      size: 1536,
      content: `# Web Development Best Practices

## Database Design
- Use ORM for database operations
- Implement proper indexing
- Use migrations for schema changes
- Add foreign key constraints

## API Design
- Use RESTful principles
- Implement proper HTTP status codes
- Add input validation
- Use JWT for authentication

## Frontend
- Use responsive design
- Implement proper error handling
- Add loading states
- Use semantic HTML

## Security
- Validate all inputs
- Use parameterized queries
- Implement CSRF protection
- Use HTTPS in production

## Performance
- Implement caching
- Optimize database queries
- Use CDN for static assets
- Minimize bundle size`,
      language: 'markdown',
      createdAt: '2026-03-11T11:00:00Z',
      taskId: '2',
    },
  ];

  const artifactsToUse = artifacts.length > 0 ? artifacts : defaultArtifacts;

  const filteredArtifacts = artifactsToUse.filter((artifact: any) => {
    const matchesSearch = searchQuery === '' || 
      (artifact.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (artifact.path || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || artifact.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'code': return '📄';
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'binary': return '🔧';
      default: return '📁';
    }
  };

  const getLanguageIcon = (language: string) => {
    switch (language) {
      case 'python': return '🐍';
      case 'javascript': return '🟨';
      case 'html': return '🌐';
      case 'css': return '🎨';
      case 'markdown': return '📝';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const selectedArtifactData = artifactsToUse.find((a: any) => a.id === selectedArtifact);

  if (loading && artifacts.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  const handleOpenInExplorer = (path: string) => {
    // In a real app, this would open the file in the system file explorer
    console.log('Open in explorer:', path);
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    console.log('Path copied to clipboard:', path);
  };

  return (
    <div className={`p-5 ${className}`}>
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2.5">{t('outputs')}</p>
        <h1 className="text-[22px] font-semibold text-foreground leading-tight">{t('artifacts')}</h1>
        <p className="text-[13px] text-muted-foreground mt-2.5">{t('viewManageFiles')}</p>
      </div>

      {/* Search and Filters */}
      <div className="surface-card p-4 mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            placeholder={`${t('search')} artifacts`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input flex-1"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input w-full md:w-40"
          >
            <option value="all">{t('allTypes')}</option>
            <option value="code">{t('code')}</option>
            <option value="text">{t('text')}</option>
            <option value="image">{t('images')}</option>
            <option value="binary">{t('binary')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
        {/* Artifacts List */}
        <div className="space-y-2.5">
          {filteredArtifacts.length === 0 ? (
            <div className="surface-card p-10 text-center">
              <p className="text-[14px] font-medium text-foreground">{t('noArtifactsFound')}</p>
              <p className="text-[13px] text-muted-foreground mt-2">{t('tryDifferentFilter')}</p>
            </div>
          ) : (
            filteredArtifacts.map((artifact) => (
              <button
                key={artifact.id}
                className={`surface-card p-4 w-full text-left transition-colors ${
                  selectedArtifact === artifact.id ? 'border-primary/30' : 'hover:border-primary/20'
                }`}
                onClick={() => setSelectedArtifact(artifact.id)}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-[18px] shrink-0">{getTypeIcon(artifact.type)}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold text-foreground leading-snug truncate">{artifact.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{artifact.path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[14px]">{getLanguageIcon(artifact.language)}</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded border border-border">
                      {artifact.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2.5">
                  <span>{formatFileSize(artifact.size)}</span>
                  <span>{new Date(artifact.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Preview */}
                <div className="mb-2.5">
                  <p className="text-[11px] text-muted-foreground line-clamp-2 font-mono bg-secondary/40 p-2 rounded leading-relaxed">
                    {artifact.content.split('\n').slice(0, 2).join('\n')}
                    {artifact.content.split('\n').length > 2 && '\n...'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Artifact Preview Panel */}
        <div className="lg:col-span-1">
          {selectedArtifactData ? (
            <div className="surface-card p-4 sticky top-4">
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="text-[20px]">{getTypeIcon(selectedArtifactData.type)}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-foreground leading-snug truncate">{selectedArtifactData.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[14px]">{getLanguageIcon(selectedArtifactData.language)}</span>
                    <span className="text-[10px] bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 border border-border">
                      {selectedArtifactData.language}
                    </span>
                  </div>
                </div>
              </div>

              <div className="surface-elevated p-3 mb-3.5">
                <p className="text-[11px] text-muted-foreground truncate mb-2">{selectedArtifactData.path}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{t('size')}</p>
                    <p className="text-[13px] font-semibold text-foreground mt-0.5">{formatFileSize(selectedArtifactData.size)}</p>
                  </div>
                  {selectedArtifactData.taskId && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t('task')}</p>
                      <p className="text-[13px] font-semibold text-foreground mt-0.5">#{selectedArtifactData.taskId}</p>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2.5">
                  {new Date(selectedArtifactData.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="mb-3.5">
                <h4 className="text-[12px] font-medium text-foreground mb-2">{t('contentPreview')}</h4>
                <div className="surface-elevated rounded-md p-3 max-h-96 overflow-y-auto shell-scroll">
                  <pre className="text-[11px] text-foreground font-mono whitespace-pre-wrap leading-relaxed">
                    {selectedArtifactData.content}
                  </pre>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  className="btn-secondary text-[11px] h-7 px-2.5 flex-1"
                  onClick={() => handleOpenInExplorer(selectedArtifactData.path)}
                >
                  {t('open')}
                </button>
                <button 
                  className="btn-secondary text-[11px] h-7 px-2.5 flex-1"
                  onClick={() => handleCopyPath(selectedArtifactData.path)}
                >
                  {t('copyPath')}
                </button>
              </div>
            </div>
          ) : (
            <div className="surface-card p-6 text-center">
              <p className="text-[13px] text-muted-foreground">{t('selectArtifactToPreview')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
