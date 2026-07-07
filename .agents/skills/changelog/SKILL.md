---
name: changelog
description: Trigger this skill when the user types /changelog to automatically update CHANGELOG.md with recent changes using date-based headers instead of semantic versions.
---

# Skill: Changelog Generator

## When to Use This Skill
Use this skill when the user triggers the `/changelog` slash command or explicitly asks you to update the `CHANGELOG.md` file.

## Execution Flow

1. **Analyze Recent Changes**:
   - Review the recent git commits, git diffs, or your recent conversation history to identify what features, fixes, or changes were made in the current session/day.
   - If needed, run `git log -n 5` or `git diff HEAD` using the `run_command` tool to gather the context of the latest changes.

2. **Format the Changes**:
   - Categorize the changes according to the **Keep a Changelog** standard categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
   - Ensure the bullet points are clear, professional, and user-facing.

3. **Update CHANGELOG.md**:
   - Determine today's date in `YYYY-MM-DD` format (based on the current local time in the system metadata).
   - The user **does not use semantic versioning** (e.g., `[1.0.0]`) or an `[Unreleased]` section.
   - Insert the new changes directly under a new date header: `## [YYYY-MM-DD]`. Place this right below the main `# Changelog` headers and description.
   - If a header for today's date `## [YYYY-MM-DD]` already exists, append the new changes into the appropriate existing categories under that header.

4. **Example Format**:
   ```markdown
   ## [2026-07-07]

   ### Added
   - Implemented asynchronous transaction fee processing using BullMQ and Redis.
   - Added `FeeLedger` and `FeeSettlementLog` entities.

   ### Changed
   - Updated transfer logic to exclude transaction fees from the daily limit.
   ```

5. **Final Step**:
   - Use the `multi_replace_file_content` or `replace_file_content` tool to safely inject the new entries into `docs/CHANGELOG.md`.
   - Inform the user that the changelog has been updated successfully.
