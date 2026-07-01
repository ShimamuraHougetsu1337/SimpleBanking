---
name: pullcode
description: Trigger this skill to automatically switch to the local main branch and pull the latest code from origin/main.
---

# Skill: Pull Code from Remote Main Branch

This skill is activated when the user triggers the `/pullcode` prompt or command. It guides the agent to switch the local repository branch to `main`, and pull the latest code from the remote `main` branch.

## Execution Flow

1. **Check Git Status**:
   - Run `git status` to see if there are any uncommitted changes in the current branch.
   - If there are uncommitted changes, ask the user if they want to stash them (`git stash`) or commit them before switching. Do NOT proceed to checkout if uncommitted changes might be lost or conflict.

2. **Switch to main Branch**:
   - Run `git checkout main`.

3. **Pull Latest Code**:
   - Run `git pull origin main` to update the local `main` branch with the latest changes from the remote repository.

4. **Pop Stashed Changes (if applicable)**:
   - If changes were stashed in step 1, ask the user if they would like to restore them using `git stash pop` on the `main` branch (or switch back to their feature branch and restore them there).

5. **Report Status**:
   - Let the user know that the update is complete, listing any files that were updated or stating that the local main branch is already up-to-date.
