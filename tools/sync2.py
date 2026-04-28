import subprocess
import time
from datetime import datetime

def run_git_command(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip(), result.stderr.strip()

def has_changes():
    stdout, _ = run_git_command("git status --porcelain")
    return len(stdout) > 0

def auto_push():
    if has_changes():
        print("Changes detected. Committing and pushing...")

        run_git_command("git add -A")

        commit_message = f"Auto update: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        run_git_command(f'git commit -m "{commit_message}"')

        run_git_command("git push")
        print("Pushed successfully.")
    else:
        print("No changes.")

if __name__ == "__main__":
    while True:
        auto_push()
        time.sleep(10)