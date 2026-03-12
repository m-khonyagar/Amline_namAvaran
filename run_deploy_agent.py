"""اجرای دیپلوی agent.amline.ir"""
import os
import sys

os.environ.setdefault("DEPLOY_TARGET", "agent")
os.environ.setdefault("DEPLOY_PASSWORD", "~XdQtr0<F<s6Q.8$gmLa")  # رمز root - در صورت خطای auth بررسی کن
os.environ.setdefault("OPENAI_API_KEY", os.environ.get("OPENAI_API_KEY", "placeholder"))

# اجرای deploy_amline
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import deploy_amline

deploy_amline.main()
