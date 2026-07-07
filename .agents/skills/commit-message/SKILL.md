---
name: commit-message
description: Trigger this skill to analyze local git changes (unstaged and staged) and automatically generate clear, focused, and conventional commit messages.
---

# Skill: Commit Message Generator & Git Best Practices

## When to Use This Skill
Use this skill when the user triggers the `/commit_message` command or asks you to commit their changes. This skill analyzes git differences and prepares standard commit recommendations following the Conventional Commits specification.

## Execution Flow

1. **Check Git Status & Changes**:
   - The agent MUST run `git status` and `git diff` (and/or `git diff --cached`) in the terminal using the `run_command` tool to read the current unstaged and staged changes.
   - If no changes are found, output: *"No changes detected in the git working tree."*

2. **Verify & Enforce Branch Name**:
   - Run `git branch --show-current` to check the current branch name.
   - **CRITICAL**: You MUST NOT commit directly to `main` or `master`. If the current branch is `main` or `master`, you MUST automatically create and switch to a new branch using `git checkout -b <branch_name>` before making any commits.
   - Suggest or generate a **meaningful branch name** based on the changes. Use patterns like `feature/feature-name`, `bugfix/issue-name`, or `refactor/refactor-name`.

3. **Analyze and Split Commits**:
   - Group changes logically.
   - If changes are large and cover multiple unrelated areas, suggest **splitting into small, focused commits** instead of one giant commit.

4. **Construct Commit Messages**:
   - For each logical group, generate a commit message following the **Conventional Commits** specification.
   - **Validation Rules**:
     - `type`: Must be one of the allowed types.
     - `scope`: Optional, but recommended for clarity.
     - `description`: Required. Use the imperative mood (e.g., "add", not "added").
     - `body`: Optional. Use for additional context or answering "why".
     - `footer`: Use for breaking changes or issue references.

   - **Examples**:
     - `feat(parser): add ability to parse arrays`
     - `fix(ui): correct button alignment`
     - `docs: update README with usage instructions`
     - `refactor: improve performance of data processing`
     - `chore: update dependencies`
     - `feat!: send email on registration (BREAKING CHANGE: email service required)`

5. **Final Execution**:
   - Provide the git commands for the user to easily copy and run, OR proactively run them using the `run_command` tool (if they are straightforward and you have confirmed what to commit).
   - Example command:
     ```bash
     git add <files>
     git commit -m "type(scope): description"
     ```
