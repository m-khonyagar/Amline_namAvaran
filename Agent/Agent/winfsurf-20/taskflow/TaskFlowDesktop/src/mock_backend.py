"""
Backend API integration for TaskFlow Desktop
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import websockets
from fastapi import FastAPI
from fastapi.websockets import WebSocket
from pydantic import BaseModel

# Mock data for testing
MOCK_TASKS = [
    {
        "id": "1",
        "goal": "Create a Python web application with Flask",
        "status": "completed",
        "agent_mode": "multi_agent",
        "language": "en",
        "created_at": "2026-03-11T10:00:00Z",
        "updated_at": "2026-03-11T10:30:00Z",
        "current_step": 5,
        "total_steps": 5,
        "plan": [
            "Analyze requirements and create project structure",
            "Set up Flask application with basic routes",
            "Implement database models and migrations",
            "Create API endpoints and business logic",
            "Add frontend templates and styling",
        ],
        "steps": [
            {
                "id": "1",
                "title": "Analyze requirements",
                "status": "completed",
                "agent": "PlannerAgent",
                "start_time": "2026-03-11T10:00:00Z",
                "end_time": "2026-03-11T10:05:00Z",
                "output": "Requirements analysis completed. Project structure defined.",
            },
            {
                "id": "2",
                "title": "Set up Flask application",
                "status": "completed",
                "agent": "CoderAgent",
                "start_time": "2026-03-11T10:05:00Z",
                "end_time": "2026-03-11T10:20:00Z",
                "output": "Flask app.py created with basic routes.",
            },
            {
                "id": "3",
                "title": "Implement database models",
                "status": "completed",
                "agent": "CoderAgent",
                "start_time": "2026-03-11T10:20:00Z",
                "end_time": "2026-03-11T10:25:00Z",
                "output": "SQLAlchemy models for User and Post created.",
            },
            {
                "id": "4",
                "title": "Create API endpoints",
                "status": "completed",
                "agent": "CoderAgent",
                "start_time": "2026-03-11T10:25:00Z",
                "end_time": "2026-03-11T10:28:00Z",
                "output": "RESTful API endpoints implemented.",
            },
            {
                "id": "5",
                "title": "Add frontend templates",
                "status": "completed",
                "agent": "CoderAgent",
                "start_time": "2026-03-11T10:28:00Z",
                "end_time": "2026-03-11T10:30:00Z",
                "output": "HTML templates with Tailwind CSS added.",
            },
        ],
        "artifacts": [
            {
                "id": "1",
                "name": "app.py",
                "type": "code",
                "path": "/workspace/flask_app/app.py",
                "size": 2048,
                "created_at": "2026-03-11T10:20:00Z",
                "content": """from flask import Flask, render_template, request
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
    app.run(debug=True)""",
            },
            {
                "id": "2",
                "name": "requirements.txt",
                "type": "text",
                "path": "/workspace/flask_app/requirements.txt",
                "size": 256,
                "created_at": "2026-03-11T10:15:00Z",
                "content": """Flask==2.3.3
Flask-SQLAlchemy==3.0.5
SQLAlchemy==2.0.21
Werkzeug==2.3.7
Jinja2==3.1.2
click==8.1.7
itsdangerous==2.1.2
MarkupSafe==2.1.3""",
            },
        ],
        "logs": [
            {
                "timestamp": "2026-03-11T10:00:00Z",
                "level": "info",
                "agent": "PlannerAgent",
                "message": "Task started: Create a Python web application with Flask",
            },
            {
                "timestamp": "2026-03-11T10:05:00Z",
                "level": "info",
                "agent": "PlannerAgent",
                "message": "Requirements analysis completed. Moving to CoderAgent.",
            },
            {
                "timestamp": "2026-03-11T10:30:00Z",
                "level": "info",
                "agent": "CoderAgent",
                "message": "Flask web application completed successfully.",
            },
        ],
    },
    {
        "id": "2",
        "goal": "Research web development best practices",
        "status": "running",
        "agent_mode": "multi_agent",
        "language": "en",
        "created_at": "2026-03-11T11:00:00Z",
        "updated_at": "2026-03-11T11:15:00Z",
        "current_step": 3,
        "total_steps": 5,
        "plan": [
            "Research modern web development frameworks",
            "Analyze best practices for security",
            "Investigate performance optimization",
            "Study responsive design principles",
            "Compile comprehensive recommendations",
        ],
        "steps": [
            {
                "id": "1",
                "title": "Research frameworks",
                "status": "completed",
                "agent": "BrowserAgent",
                "start_time": "2026-03-11T11:00:00Z",
                "end_time": "2026-03-11T11:05:00Z",
                "output": "Researched React, Vue, Angular, and Flask frameworks.",
            },
            {
                "id": "2",
                "title": "Analyze security practices",
                "status": "completed",
                "agent": "BrowserAgent",
                "start_time": "2026-03-11T11:05:00Z",
                "end_time": "2026-03-11T11:10:00Z",
                "output": "Compiled security best practices from OWASP and industry sources.",
            },
            {
                "id": "3",
                "title": "Investigate performance optimization",
                "status": "running",
                "agent": "BrowserAgent",
                "start_time": "2026-03-11T11:10:00Z",
                "end_time": None,
                "output": "Currently researching performance optimization techniques...",
            },
        ],
        "artifacts": [],
        "logs": [
            {
                "timestamp": "2026-03-11T11:00:00Z",
                "level": "info",
                "agent": "BrowserAgent",
                "message": "Research started: web development best practices",
            },
            {
                "timestamp": "2026-03-11T11:15:00Z",
                "level": "info",
                "agent": "BrowserAgent",
                "message": "Performance optimization research in progress...",
            },
        ],
    },
    {
        "id": "3",
        "goal": "ایجاد یک برنامه وب با استفاده از ابزارهای خارجی",
        "status": "pending",
        "agent_mode": "external_worker",
        "language": "fa",
        "created_at": "2026-03-11T12:00:00Z",
        "updated_at": "2026-03-11T12:00:00Z",
        "current_step": 0,
        "total_steps": 4,
        "plan": [
            "تحلیل نیازمندی‌ها",
            "انتخاب ابزار خارجی مناسب",
            "ایجاد برنامه وب",
            "تست و بازبینی",
        ],
        "steps": [],
        "artifacts": [],
        "logs": [
            {
                "timestamp": "2026-03-11T12:00:00Z",
                "level": "info",
                "agent": "ExternalWorkerAgent",
                "message": "Persian task created and queued for external processing",
            },
        ],
    },
]

MOCK_MEMORY = [
    {
        "id": "1",
        "type": "task_summary",
        "title": "Flask Web Application Development",
        "content": "Successfully created a Flask web application with SQLAlchemy models, REST API endpoints, and Jinja2 templates. The application includes user authentication and CRUD operations for blog posts.",
        "tags": ["flask", "web", "python", "sqlalchemy"],
        "created_at": "2026-03-11T10:30:00Z",
        "task_id": "1",
        "relevance": 0.95,
    },
    {
        "id": "2",
        "type": "reflection",
        "title": "Best Practices for Web Development",
        "content": "Key insights from web development research: 1) Use ORM for database operations, 2) Implement proper error handling, 3) Add input validation, 4) Use environment variables for configuration, 5) Implement logging.",
        "tags": ["best-practices", "web", "development"],
        "created_at": "2026-03-11T11:00:00Z",
        "task_id": "2",
        "relevance": 0.87,
    },
    {
        "id": "3",
        "type": "pattern",
        "title": "Multi-Agent Collaboration Pattern",
        "content": "Effective pattern for complex tasks: 1) PlannerAgent breaks down requirements, 2) Specialist agents handle specific domains, 3) ReviewerAgent ensures quality, 4) Coordinator manages handoffs.",
        "tags": ["multi-agent", "collaboration", "pattern"],
        "created_at": "2026-03-11T09:45:00Z",
        "task_id": None,
        "relevance": 0.92,
    },
]

MOCK_AGENTS = [
    {
        "name": "PlannerAgent",
        "status": "idle",
        "current_task": "Available for planning tasks",
        "start_time": None,
        "end_time": None,
        "steps_completed": 0,
        "total_steps": 0,
    },
    {
        "name": "CoderAgent",
        "status": "idle",
        "current_task": "Available for coding tasks",
        "start_time": None,
        "end_time": None,
        "steps_completed": 0,
        "total_steps": 0,
    },
    {
        "name": "BrowserAgent",
        "status": "running",
        "current_task": "Researching web development best practices",
        "start_time": "2026-03-11T11:00:00Z",
        "end_time": None,
        "steps_completed": 2,
        "total_steps": 5,
    },
    {
        "name": "ExternalWorkerAgent",
        "status": "idle",
        "current_task": "Available for external delegation",
        "start_time": None,
        "end_time": None,
        "steps_completed": 0,
        "total_steps": 0,
    },
]

class TaskAPI:
    """Mock API for desktop testing"""
    
    @staticmethod
    def get_tasks() -> List[Dict]:
        """Get all tasks"""
        return MOCK_TASKS
    
    @staticmethod
    def get_task(task_id: str) -> Optional[Dict]:
        """Get specific task"""
        for task in MOCK_TASKS:
            if task["id"] == task_id:
                return task
        return None
    
    @staticmethod
    def create_task(goal: str, language: str = "en") -> Dict:
        """Create new task"""
        new_task = {
            "id": str(len(MOCK_TASKS) + 1),
            "goal": goal,
            "status": "pending",
            "agent_mode": "single_agent" if "simple" in goal.lower() else "multi_agent",
            "language": language,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "current_step": 0,
            "total_steps": 3,
            "plan": ["Initial planning", "Execution", "Review"],
            "steps": [],
            "artifacts": [],
            "logs": [
                {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "level": "info",
                    "agent": "System",
                    "message": f"Task created: {goal}",
                }
            ],
        }
        MOCK_TASKS.append(new_task)
        return new_task
    
    @staticmethod
    def get_memory() -> List[Dict]:
        """Get memory items"""
        return MOCK_MEMORY
    
    @staticmethod
    def get_agents() -> List[Dict]:
        """Get agent status"""
        return MOCK_AGENTS
    
    @staticmethod
    def get_artifacts(task_id: str = None) -> List[Dict]:
        """Get artifacts"""
        artifacts = []
        for task in MOCK_TASKS:
            if task_id is None or task["id"] == task_id:
                artifacts.extend(task.get("artifacts", []))
        return artifacts

class WebSocketManager:
    """Mock WebSocket manager for desktop testing"""
    
    def __init__(self):
        self.connections = []
    
    async def connect(self, websocket: WebSocket):
        """Connect WebSocket"""
        await websocket.accept()
        self.connections.append(websocket)
        
        # Send initial data
        await self.send_update(websocket, {
            "type": "initial_data",
            "tasks": TaskAPI.get_tasks(),
            "agents": TaskAPI.get_agents(),
        })
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect WebSocket"""
        if websocket in self.connections:
            self.connections.remove(websocket)
    
    async def send_update(self, websocket: WebSocket, data: Dict):
        """Send update to specific WebSocket"""
        try:
            await websocket.send_text(json.dumps(data))
        except:
            self.disconnect(websocket)
    
    async def broadcast(self, data: Dict):
        """Broadcast to all connections"""
        for websocket in self.connections.copy():
            await self.send_update(websocket, data)
    
    async def simulate_task_update(self, task_id: str):
        """Simulate task progress for testing"""
        task = TaskAPI.get_task(task_id)
        if not task:
            return
        
        # Simulate progress
        if task["status"] == "pending":
            task["status"] = "running"
            task["current_step"] = 1
        elif task["current_step"] < task["total_steps"]:
            task["current_step"] += 1
        else:
            task["status"] = "completed"
        
        task["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Add log entry
        task["logs"].append({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": "info",
            "agent": "System",
            "message": f"Task progress: Step {task['current_step']}/{task['total_steps']}",
        })
        
        # Broadcast update
        await self.broadcast({
            "type": "task_update",
            "task": task,
        })

# Global instances
task_api = TaskAPI()
websocket_manager = WebSocketManager()
