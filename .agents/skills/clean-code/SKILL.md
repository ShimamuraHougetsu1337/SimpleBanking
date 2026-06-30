---
name: clean-code
description: Trigger this skill to analyze, review, and refactor code according to strict Clean Code and Single Responsibility Principle (SRP) guidelines.
---

# Skill: Clean Code & Code Quality Review

## When to Use This Skill
Use this skill when the user explicitly triggers `/clean-code` to review, analyze, or refactor a specific file or codebase to meet high-quality software engineering standards.

## Execution Flow
1. **Analyze:** Scan the targeted code for code smells, magic numbers, poorly named variables, and excessively long functions.
2. **Review:** Provide a brief summary of what violates the Clean Code guidelines.
3. **Refactor:** Provide the refactored code that fixes these violations while maintaining exact functional parity.

## Core Guidelines to Enforce

1. **Constants Over Magic Numbers**
   - Replace hard-coded values with named constants at the top of the file or in a dedicated constants file.
   - Use descriptive constant names that explain the value's purpose.

2. **Meaningful Naming**
   - Variables, functions, and classes should reveal their purpose (e.g., `isUserLoading` instead of `loading`).
   - Names should explain why something exists and how it's used. Avoid obscure abbreviations.

3. **Smart Comments**
   - Don't comment on what the code does - make the code self-documenting.
   - Use comments to explain *why* something is done a certain way.
   - Document APIs, complex algorithms, and non-obvious side effects.

4. **Single Responsibility Principle (SRP)**
   - Each function/component should do exactly one thing.
   - Functions should be small and focused. If it needs a comment to explain what it does, split it.

5. **DRY (Don't Repeat Yourself)**
   - Extract repeated code into reusable functions.
   - Share common logic through proper abstraction and maintain single sources of truth.

6. **Clean Structure & Encapsulation**
   - Keep related code together. Organize code in a logical hierarchy using consistent naming conventions.
   - Hide implementation details, expose clear interfaces, and move nested conditionals into well-named functions.

7. **Code Quality & Error Handling**
   - Implement clean `try/catch` blocks, centralized API error handling, and graceful degradation.
   - Refactor continuously, fix technical debt early, and leave code cleaner than you found it.

8. **Testing**
   - Ensure code is testable. Write/recommend tests for edge cases and error conditions.
