#!/usr/bin/env python3
"""
GitHub Repository Creation Script for TaskFlow
"""

import requests
import json
import sys
import os
from datetime import datetime

class GitHubRepoCreator:
    def __init__(self, token=None):
        self.token = token or os.getenv('GITHUB_TOKEN')
        self.api_base = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28"
        }
    
    def create_repository(self, name, description="", private=False, auto_init=True):
        """Create a new GitHub repository"""
        url = f"{self.api_base}/user/repos"
        
        data = {
            "name": name,
            "description": description,
            "private": private,
            "auto_init": auto_init,
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
            response = requests.post(url, headers=self.headers, json=data)
            
            if response.status_code == 201:
                repo_data = response.json()
                return {
                    "success": True,
                    "repository": repo_data,
                    "clone_url": repo_data["clone_url"],
                    "ssh_url": repo_data["ssh_url"],
                    "html_url": repo_data["html_url"]
                }
            else:
                return {
                    "success": False,
                    "error": response.json(),
                    "status_code": response.status_code
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def setup_remote(self, repo_url, remote_name="origin"):
        """Setup git remote for the repository"""
        commands = [
            f"git remote add {remote_name} {repo_url}",
            f"git branch -M main",
            f"git push -u {remote_name} main"
        ]
        
        results = []
        for cmd in commands:
            try:
                result = os.system(cmd)
                results.append({
                    "command": cmd,
                    "success": result == 0
                })
            except Exception as e:
                results.append({
                    "command": cmd,
                    "success": False,
                    "error": str(e)
                })
        
        return results

def main():
    """Main function to create TaskFlow repository"""
    
    print("🚀 TaskFlow GitHub Repository Creator")
    print("=" * 50)
    
    # Repository details
    repo_name = "taskflow-desktop"
    repo_description = "TaskFlow Desktop Application with Computer Control - Professional AI Operations Platform"
    
    print(f"📁 Repository Name: {repo_name}")
    print(f"📝 Description: {repo_description}")
    print()
    
    # Check for GitHub token
    token = os.getenv('GITHUB_TOKEN')
    if not token:
        print("❌ Error: GITHUB_TOKEN environment variable not set")
        print("Please set your GitHub Personal Access Token:")
        print("export GITHUB_TOKEN='your_token_here'")
        print()
        print("Create a token at: https://github.com/settings/tokens")
        return False
    
    print("✅ GitHub token found")
    
    # Create repository creator
    creator = GitHubRepoCreator(token)
    
    print(f"🔨 Creating repository '{repo_name}'...")
    
    # Create repository
    result = creator.create_repository(
        name=repo_name,
        description=repo_description,
        private=False,
        auto_init=True
    )
    
    if result["success"]:
        repo = result["repository"]
        print("✅ Repository created successfully!")
        print()
        print(f"📍 Repository URL: {repo['html_url']}")
        print(f"🔗 Clone URL: {repo['clone_url']}")
        print(f"🔑 SSH URL: {repo['ssh_url']}")
        print()
        
        # Setup git remote
        print("🔧 Setting up git remote...")
        remote_results = creator.setup_remote(repo["clone_url"])
        
        print("\n📋 Git Operations:")
        for result in remote_results:
            status = "✅" if result["success"] else "❌"
            print(f"  {status} {result['command']}")
        
        print()
        print("🎉 TaskFlow repository is now available on GitHub!")
        print(f"🌐 Visit: {repo['html_url']}")
        
        return True
        
    else:
        print("❌ Failed to create repository")
        print(f"Status Code: {result.get('status_code', 'Unknown')}")
        print(f"Error: {result.get('error', 'Unknown error')}")
        
        if result.get('status_code') == 422:
            print("\n💡 Possible solutions:")
            print("1. Repository name might already exist")
            print("2. Check your token permissions (need 'repo' scope)")
            print("3. Verify your token hasn't expired")
        
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
