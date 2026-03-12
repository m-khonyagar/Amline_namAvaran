#!/usr/bin/env python3
"""
Automatic GitHub Repository Creation for TaskFlow Desktop
"""

import requests
import json
import subprocess
import os
import sys
from datetime import datetime

class GitHubAutoSetup:
    def __init__(self):
        self.api_base = "https://api.github.com"
        self.token = os.getenv('GITHUB_TOKEN')
        self.repo_name = "taskflow-desktop"
        self.description = "TaskFlow Desktop Application with Computer Control - Professional AI Operations Platform"
        
    def check_token(self):
        """Check if GitHub token is available"""
        if not self.token:
            print("❌ GitHub token not found!")
            print("\n🔧 To set up GitHub token:")
            print("1. Go to https://github.com/settings/tokens")
            print("2. Generate new token with 'repo' scope")
            print("3. Set environment variable:")
            print("   export GITHUB_TOKEN='your_token_here'")
            print("\n📞 Or provide your GitHub username and I'll help you create the repository manually.")
            return False
        return True
    
    def create_repository(self):
        """Create GitHub repository"""
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        
        data = {
            "name": self.repo_name,
            "description": self.description,
            "private": False,
            "auto_init": False,
            "has_issues": True,
            "has_projects": True,
            "has_wiki": True,
            "has_discussions": False,
            "has_downloads": True,
            "allow_squash_merge": True,
            "allow_merge_commit": True,
            "allow_rebase_merge": True,
            "delete_branch_on_merge": False,
            "license_template": "mit"
        }
        
        try:
            response = requests.post(f"{self.api_base}/user/repos", 
                                   headers=headers, json=data)
            
            if response.status_code == 201:
                repo_data = response.json()
                print("✅ Repository created successfully!")
                return repo_data
            else:
                print(f"❌ Failed to create repository: {response.status_code}")
                print(f"Error: {response.json()}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating repository: {e}")
            return None
    
    def setup_git_remote(self, repo_data):
        """Setup git remote and push code"""
        if not repo_data:
            return False
            
        clone_url = repo_data["clone_url"]
        html_url = repo_data["html_url"]
        
        print(f"🔧 Setting up git remote...")
        print(f"📍 Repository URL: {html_url}")
        
        commands = [
            ["git", "remote", "add", "origin", clone_url],
            ["git", "branch", "-M", "main"],
            ["git", "push", "-u", "origin", "main"]
        ]
        
        for cmd in commands:
            try:
                print(f"🔄 Executing: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
                
                if result.returncode == 0:
                    print(f"✅ Success: {' '.join(cmd)}")
                else:
                    print(f"❌ Failed: {' '.join(cmd)}")
                    print(f"Error: {result.stderr}")
                    return False
                    
            except Exception as e:
                print(f"❌ Error executing {cmd}: {e}")
                return False
        
        return True
    
    def get_user_info(self):
        """Get GitHub user information"""
        if not self.token:
            return None
            
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        
        try:
            response = requests.get(f"{self.api_base}/user", headers=headers)
            if response.status_code == 200:
                return response.json()
        except:
            pass
        
        return None
    
    def manual_setup_instructions(self):
        """Provide manual setup instructions"""
        print("\n📋 Manual Setup Instructions:")
        print("=" * 50)
        print("\n1. Create Repository on GitHub:")
        print("   - Go to https://github.com")
        print("   - Click '+' → 'New repository'")
        print("   - Name: taskflow-desktop")
        print("   - Description: TaskFlow Desktop Application with Computer Control")
        print("   - Public: Yes")
        print("   - Don't initialize with README")
        print("   - Click 'Create repository'")
        
        print("\n2. Connect and Push:")
        print("   cd taskflow")
        print("   git remote add origin https://github.com/YOUR_USERNAME/taskflow-desktop.git")
        print("   git branch -M main")
        print("   git push -u origin main")
        
        print("\n3. Your repository will be available at:")
        print("   https://github.com/YOUR_USERNAME/taskflow-desktop")
    
    def run(self):
        """Main execution function"""
        print("🚀 TaskFlow GitHub Auto Setup")
        print("=" * 50)
        
        # Check if we're in the right directory
        if not os.path.exists("TaskFlowDesktop"):
            print("❌ TaskFlowDesktop directory not found!")
            print("Please run this script from the taskflow directory.")
            return False
        
        # Try automatic setup
        if self.check_token():
            print("✅ GitHub token found!")
            
            user_info = self.get_user_info()
            if user_info:
                print(f"👤 GitHub User: {user_info['login']}")
            
            # Create repository
            repo_data = self.create_repository()
            
            if repo_data:
                # Setup git remote and push
                if self.setup_git_remote(repo_data):
                    print("\n🎉 SUCCESS! Repository is now on GitHub!")
                    print(f"📍 URL: {repo_data['html_url']}")
                    print(f"🔗 Clone: {repo_data['clone_url']}")
                    print(f"📊 Your repository is live and ready!")
                    return True
        
        # Fallback to manual instructions
        print("\n🔄 Falling back to manual setup...")
        self.manual_setup_instructions()
        return False

def main():
    """Main function"""
    setup = GitHubAutoSetup()
    
    print("🔍 Checking environment...")
    
    # Change to taskflow directory if needed
    current_dir = os.path.basename(os.getcwd())
    if current_dir != "taskflow":
        if os.path.exists("taskflow"):
            os.chdir("taskflow")
            print("📁 Changed to taskflow directory")
        else:
            print("❌ taskflow directory not found!")
            print("Please run this script from the correct location.")
            return False
    
    success = setup.run()
    
    if success:
        print("\n✅ TaskFlow is now on GitHub!")
        print("🎯 You can share the repository link with your team!")
    else:
        print("\n📋 Please follow the manual instructions above.")
    
    return success

if __name__ == "__main__":
    main()
