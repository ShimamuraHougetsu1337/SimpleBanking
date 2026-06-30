---
name: commit-message
description: Trigger this skill to analyze local git changes (unstaged and staged) and automatically generate clear, focused, and conventional commit messages.
---

# Skill: Commit Message Generator & Git Best Practices

## When to Use This Skill
Use this skill when the user triggers the `/commit_message` command. This skill analyzes git differences and prepares standard commit recommendations.

## Execution Flow

1. **Check Git Status & Changes**:
   - The agent MUST run `git status` and `git diff` (and/or `git diff --cached`) in the terminal using the `run_command` tool to read the current unstaged and staged changes.
   - If no changes are found, output: *"No changes detected in the git working tree."*

2. **Verify Branch Name**:
   - Run `git branch --show-current` to check the current branch name.
   - Suggest a **meaningful branch name** if the current one is too generic (like `main`, `master`, `dev`) and the changes represent a specific task. Use patterns like `feature/feature-name`, `bugfix/issue-name`, or `refactor/refactor-name`.

3. **Analyze and Suggest Commit Messages**:
   - Group changes logically.
   - If changes are large and cover multiple unrelated areas (e.g., modifying both Backend Auth and Frontend UI styling), suggest **splitting into small, focused commits** instead of one giant commit.
   - For each logical group, generate a commit message following the **Conventional Commits** specification:
     ```
     <type>(<scope>): <short description in imperative mood>

     [optional body explaining 'why' the changes were made]
     ```
     - **Types**: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`.
     - **Scope**: e.g., `auth`, `transactions`, `accounts`, `ui`, `config`.
     - **imperative mood**: e.g., *"add deposit modal"* instead of *"added deposit modal"*.

4. **Output Recommendation**:
   - Provide the git commands for the user to easily copy and run, for example:
     ```bash
     git add <files>
     git commit -m "feat(transactions): add deposit and withdraw endpoints"
     ```
