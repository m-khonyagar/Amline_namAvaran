
// Mock backend API for desktop testing
const mockBackend = {
  getSettings: async () => ({
    workspacePath: './workspace',
    safetyMode: 'standard',
    preferredModel: 'Local executor',
  }),

  updateSettings: async (payload: Record<string, unknown>) => ({
    workspacePath: './workspace',
    safetyMode: 'standard',
    preferredModel: 'Local executor',
    ...payload,
  }),

  // Get all tasks
  getTasks: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      {
        id: '1',
        goal: 'Create a Python web application with Flask',
        status: 'completed',
        agentMode: 'multi_agent',
        language: 'en',
        createdAt: '2026-03-11T10:00:00Z',
        updatedAt: '2026-03-11T10:30:00Z',
        currentStep: 5,
        totalSteps: 5,
      },
      {
        id: '2',
        goal: 'Research web development best practices',
        status: 'running',
        agentMode: 'multi_agent',
        language: 'en',
        createdAt: '2026-03-11T11:00:00Z',
        updatedAt: '2026-03-11T11:15:00Z',
        currentStep: 3,
        totalSteps: 5,
      },
      {
        id: '3',
        goal: 'ایجاد یک برنامه وب با استفاده از ابزارهای خارجی',
        status: 'pending',
        agentMode: 'external_worker',
        language: 'fa',
        createdAt: '2026-03-11T12:00:00Z',
        updatedAt: '2026-03-11T12:00:00Z',
        currentStep: 0,
        totalSteps: 4,
      },
    ];
  },

  // Get specific task
  getTask: async (taskId: string) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      id: taskId,
      goal: taskId === '1' ? 'Create a Python web application with Flask' : 
           taskId === '2' ? 'Research web development best practices' :
           'ایجاد یک برنامه وب با استفاده از ابزارهای خارجی',
      status: taskId === '1' ? 'completed' : taskId === '2' ? 'running' : 'pending',
      agentMode: taskId === '3' ? 'external_worker' : 'multi_agent',
      language: taskId === '3' ? 'fa' : 'en',
      createdAt: '2026-03-11T10:00:00Z',
      updatedAt: taskId === '1' ? '2026-03-11T10:30:00Z' : '2026-03-11T11:15:00Z',
      currentStep: taskId === '1' ? 5 : taskId === '2' ? 3 : 0,
      totalSteps: taskId === '1' ? 5 : taskId === '2' ? 5 : 4,
      plan: [
        'Analyze requirements and create project structure',
        'Set up Flask application with basic routes',
        'Implement database models and migrations',
        'Create API endpoints and business logic',
        'Add frontend templates and styling',
      ],
      steps: [
        {
          id: '1',
          title: 'Analyze requirements',
          status: 'completed',
          agent: 'PlannerAgent',
          startTime: '2026-03-11T10:00:00Z',
          endTime: '2026-03-11T10:05:00Z',
          output: 'Requirements analysis completed. Project structure defined.',
        },
        {
          id: '2',
          title: 'Set up Flask application',
          status: 'completed',
          agent: 'CoderAgent',
          startTime: '2026-03-11T10:05:00Z',
          endTime: '2026-03-11T10:20:00Z',
          output: 'Flask app.py created with basic routes.',
        },
        {
          id: '3',
          title: 'Implement database models',
          status: 'completed',
          agent: 'CoderAgent',
          startTime: '2026-03-11T10:20:00Z',
          endTime: '2026-03-11T10:25:00Z',
          output: 'SQLAlchemy models for User and Post created.',
        },
        {
          id: '4',
          title: 'Create API endpoints',
          status: 'completed',
          agent: 'CoderAgent',
          startTime: '2026-03-11T10:25:00Z',
          endTime: '2026-03-11T10:28:00Z',
          output: 'RESTful API endpoints implemented.',
        },
        {
          id: '5',
          title: 'Add frontend templates',
          status: 'completed',
          agent: 'CoderAgent',
          startTime: '2026-03-11T10:28:00Z',
          endTime: '2026-03-11T10:30:00Z',
          output: 'HTML templates with Tailwind CSS added.',
        },
      ],
      artifacts: [
        {
          id: '1',
          name: 'app.py',
          type: 'code',
          path: '/workspace/flask_app/app.py',
          size: 2048,
          createdAt: '2026-03-11T10:20:00Z',
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

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)`,
        },
        {
          id: '2',
          name: 'requirements.txt',
          type: 'text',
          path: '/workspace/flask_app/requirements.txt',
          size: 256,
          createdAt: '2026-03-11T10:15:00Z',
          content: `Flask==2.3.3
Flask-SQLAlchemy==3.0.5
SQLAlchemy==2.0.21
Werkzeug==2.3.7
Jinja2==3.1.2
click==8.1.7
itsdangerous==2.1.2
MarkupSafe==2.1.3`,
        },
      ],
      logs: [
        {
          timestamp: '2026-03-11T10:00:00Z',
          level: 'info',
          agent: 'PlannerAgent',
          message: 'Task started: Create a Python web application with Flask',
        },
        {
          timestamp: '2026-03-11T10:05:00Z',
          level: 'info',
          agent: 'PlannerAgent',
          message: 'Requirements analysis completed. Moving to CoderAgent.',
        },
        {
          timestamp: '2026-03-11T10:30:00Z',
          level: 'info',
          agent: 'CoderAgent',
          message: 'Flask web application completed successfully.',
        },
      ],
    };
  },

  // Get memory items
  getMemory: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      {
        id: '1',
        type: 'task_summary',
        title: 'Flask Web Application Development',
        content: 'Successfully created a Flask web application with SQLAlchemy models, REST API endpoints, and Jinja2 templates. The application includes user authentication and CRUD operations for blog posts.',
        tags: ['flask', 'web', 'python', 'sqlalchemy'],
        createdAt: '2026-03-11T10:30:00Z',
        taskId: '1',
        relevance: 0.95,
      },
      {
        id: '2',
        type: 'reflection',
        title: 'Best Practices for Web Development',
        content: 'Key insights from web development research: 1) Use ORM for database operations, 2) Implement proper error handling, 3) Add input validation, 4) Use environment variables for configuration, 5) Implement logging.',
        tags: ['best-practices', 'web', 'development'],
        createdAt: '2026-03-11T11:00:00Z',
        taskId: '2',
        relevance: 0.87,
      },
      {
        id: '3',
        type: 'pattern',
        title: 'Multi-Agent Collaboration Pattern',
        content: 'Effective pattern for complex tasks: 1) PlannerAgent breaks down requirements, 2) Specialist agents handle specific domains, 3) ReviewerAgent ensures quality, 4) Coordinator manages handoffs.',
        tags: ['multi-agent', 'collaboration', 'pattern'],
        createdAt: '2026-03-11T09:45:00Z',
        taskId: null,
        relevance: 0.92,
      },
    ];
  },

  // Get agents
  getAgents: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      {
        name: 'PlannerAgent',
        status: 'idle',
        currentTask: 'Available for planning tasks',
        startTime: null,
        endTime: null,
        stepsCompleted: 0,
        totalSteps: 0,
      },
      {
        name: 'CoderAgent',
        status: 'idle',
        currentTask: 'Available for coding tasks',
        startTime: null,
        endTime: null,
        stepsCompleted: 0,
        totalSteps: 0,
      },
      {
        name: 'BrowserAgent',
        status: 'running',
        currentTask: 'Researching web development best practices',
        startTime: '2026-03-11T11:00:00Z',
        endTime: null,
        stepsCompleted: 2,
        totalSteps: 5,
      },
      {
        name: 'ExternalWorkerAgent',
        status: 'idle',
        currentTask: 'Available for external delegation',
        startTime: null,
        endTime: null,
        stepsCompleted: 0,
        totalSteps: 0,
      },
    ];
  },

  getArtifacts: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const task = await mockBackend.getTask('1');
    return (task.artifacts || []).map((a: any) => ({
      ...a,
      taskId: '1',
      content: a.content || '',
    }));
  },

  createTask: async (goal: string, language: string = 'en') => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      id: Date.now().toString(),
      goal,
      status: 'pending',
      agentMode: 'single_agent',
      language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 0,
      totalSteps: 3,
      plan: ['Initial planning', 'Execution', 'Review'],
      steps: [],
      artifacts: [],
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          agent: 'System',
          message: `Task created: ${goal}`,
        },
      ],
    };
  },
};

// WebSocket mock for real-time updates
class MockWebSocket {
  private listeners: Map<string, (data: any) => void> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  connect() {
    // Simulate connection
    console.log('WebSocket connected');
    
    // Start periodic updates
    this.intervalId = setInterval(() => {
      this.simulateUpdate();
    }, 5000);
  }

  disconnect() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('WebSocket disconnected');
  }

  on(event: string, callback: (data: any) => void) {
    this.listeners.set(event, callback);
  }

  off(event: string) {
    this.listeners.delete(event);
  }

  private simulateUpdate() {
    const listener = this.listeners.get('message');
    if (listener) {
      listener({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        agents: [
          {
            name: 'BrowserAgent',
            status: 'running',
            currentTask: 'Researching web development best practices',
          },
        ],
      });
    }
  }
}

export const mockWebSocket = new MockWebSocket();
export default mockBackend;
