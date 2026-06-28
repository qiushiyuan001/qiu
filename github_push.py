"""
GitHub 仓库创建与代码导入脚本
使用说明：
1. 确保已安装 git
2. 确保已安装 gh CLI 并完成登录 (运行: gh auth login)
3. 运行脚本: python github_push.py
"""

import os
import subprocess
import shutil

# ============== 配置区域 ==============
# GitHub 用户名和仓库名称
GITHUB_USERNAME = "your-username"  # 修改为你的 GitHub 用户名
REPO_NAME = "uav-gcs"  # 修改为仓库名称
REPO_DESCRIPTION = "无人机地面控制站 (UAV Ground Control Station)"  # 仓库描述

# 本地项目路径
LOCAL_PROJECT_PATH = "d:\\627daima"  # 修改为你的项目路径

# ============== 脚本主体 ==============

def run_command(cmd, cwd=None, check=True):
    """执行命令并返回结果"""
    print(f"执行命令: {cmd}")
    result = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd or LOCAL_PROJECT_PATH,
        capture_output=True,
        text=True
    )
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, end="")
    if check and result.returncode != 0:
        print(f"命令执行失败，返回码: {result.returncode}")
        return False
    return True

def check_gh_auth():
    """检查 gh CLI 是否已登录"""
    result = subprocess.run(
        "gh auth status",
        shell=True,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print("错误: gh CLI 未登录或未安装")
        print("请运行以下命令登录:")
        print("  gh auth login")
        return False
    print("gh CLI 已登录")
    return True

def create_github_repo():
    """在 GitHub 上创建仓库"""
    print("\n" + "="*50)
    print("步骤 1: 创建 GitHub 仓库")
    print("="*50)

    # 使用 gh 创建仓库 (不初始化，有README)
    cmd = f'gh repo create {REPO_NAME} --public --description "{REPO_DESCRIPTION}" --source=. --push'
    result = subprocess.run(
        cmd,
        shell=True,
        cwd=LOCAL_PROJECT_PATH,
        capture_output=True,
        text=True
    )

    if result.returncode == 0 or "already exists" in result.stderr or "pushed" in result.stdout:
        print(f"仓库 {REPO_NAME} 创建成功!")
        return True
    else:
        print(f"创建仓库失败: {result.stderr}")
        return False

def init_git_repo():
    """初始化本地 Git 仓库"""
    print("\n" + "="*50)
    print("步骤 2: 初始化本地 Git 仓库")
    print("="*50)

    # 检查是否已是 git 仓库
    if os.path.exists(os.path.join(LOCAL_PROJECT_PATH, ".git")):
        print("已是 Git 仓库，跳过初始化")
        return True

    # 初始化仓库
    if not run_command("git init"):
        return False

    # 配置用户信息 (如果未配置)
    try:
        run_command("git config user.email 'your-email@example.com'", check=False)
        run_command("git config user.name 'Your Name'", check=False)
    except:
        pass

    return True

def add_and_commit():
    """添加文件并提交"""
    print("\n" + "="*50)
    print("步骤 3: 添加文件并提交")
    print("="*50)

    # 添加所有文件
    if not run_command("git add -A"):
        return False

    # 检查是否有文件变更
    result = subprocess.run(
        "git status --porcelain",
        shell=True,
        cwd=LOCAL_PROJECT_PATH,
        capture_output=True,
        text=True
    )

    if not result.stdout.strip():
        print("没有文件变更，跳过提交")
        return True

    # 提交
    commit_message = "Initial commit: UAV Ground Control Station"
    if not run_command(f'git commit -m "{commit_message}"'):
        return False

    return True

def push_to_github():
    """推送到 GitHub"""
    print("\n" + "="*50)
    print("步骤 4: 推送代码到 GitHub")
    print("="*50)

    repo_url = f"https://github.com/{GITHUB_USERNAME}/{REPO_NAME}.git"

    # 添加远程仓库
    run_command(f"git remote remove origin", check=False)
    run_command(f'git remote add origin "{repo_url}"')

    # 推送代码
    if not run_command("git push -u origin main"):
        # 尝试 master 分支
        return run_command("git push -u origin master")
    return True

def create_github_with_api():
    """使用 GitHub API 创建仓库 (备选方案)"""
    print("\n使用备选方案: GitHub API")

    import json
    import urllib.request

    # 获取 token
    result = subprocess.run(
        "gh auth token",
        shell=True,
        capture_output=True,
        text=True
    )
    token = result.stdout.strip()

    if not token:
        print("无法获取 GitHub token")
        return False

    url = "https://api.github.com/user/repos"
    data = json.dumps({
        "name": REPO_NAME,
        "description": REPO_DESCRIPTION,
        "private": False,
        "has_issues": True,
        "has_wiki": True
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"token {token}",
            "Content-Type": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read())
            print(f"仓库创建成功: {result['html_url']}")
            return True
    except urllib.error.HTTPError as e:
        error = json.loads(e.read())
        if "already exists" in error.get("message", ""):
            print("仓库已存在，跳过创建")
            return True
        print(f"创建仓库失败: {error}")
        return False

def main():
    print("="*50)
    print("GitHub 仓库创建与代码导入脚本")
    print("="*50)

    # 检查前置条件
    print("\n检查前置条件...")

    # 检查 git
    result = subprocess.run("git --version", shell=True, capture_output=True)
    if result.returncode != 0:
        print("错误: 未安装 git")
        return
    print(f"git 版本: {result.stdout.strip()}")

    # 检查 gh CLI
    if not check_gh_auth():
        print("请先安装并登录 gh CLI: https://cli.github.com/")
        return

    # 确认项目路径
    if not os.path.exists(LOCAL_PROJECT_PATH):
        print(f"错误: 项目路径不存在: {LOCAL_PROJECT_PATH}")
        return

    print(f"项目路径: {LOCAL_PROJECT_PATH}")

    # 显示即将创建的信息
    print("\n" + "="*50)
    print("即将创建:")
    print(f"  仓库名称: {REPO_NAME}")
    print(f"  仓库描述: {REPO_DESCRIPTION}")
    print(f"  仓库地址: https://github.com/{GITHUB_USERNAME}/{REPO_NAME}")
    print("="*50)

    # 确认
    confirm = input("\n确认开始? (y/n): ").strip().lower()
    if confirm != 'y':
        print("已取消")
        return

    # 执行步骤
    try:
        # 步骤 1: 创建 GitHub 仓库
        if not create_github_repo():
            print("使用备选方案...")
            create_github_with_api()

        # 步骤 2: 初始化本地仓库
        if not init_git_repo():
            raise Exception("初始化仓库失败")

        # 步骤 3: 添加并提交
        if not add_and_commit():
            raise Exception("提交失败")

        # 步骤 4: 推送
        if not push_to_github():
            raise Exception("推送失败")

        print("\n" + "="*50)
        print("成功!")
        print("="*50)
        print(f"\n仓库地址: https://github.com/{GITHUB_USERNAME}/{REPO_NAME}")
        print("\n下一步: 你可以手动在 GitHub 上进行部署设置")

    except Exception as e:
        print(f"\n错误: {e}")
        print("\n请手动完成以下步骤:")
        print("1. 在 GitHub 上手动创建仓库")
        print("2. 运行以下命令:")
        print(f"   cd {LOCAL_PROJECT_PATH}")
        print("   git init")
        print("   git add -A")
        print('   git commit -m "Initial commit"')
        print(f"   git remote add origin https://github.com/{GITHUB_USERNAME}/{REPO_NAME}.git")
        print("   git push -u origin main")

if __name__ == "__main__":
    main()
