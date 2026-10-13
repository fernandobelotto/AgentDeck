# AGENTS.md

<!-- BEGIN:github-workflow -->

## Workflow: issue → PR → merge → run locally

Every feature, bug fix, and architecture decision is tracked on GitHub so the repository keeps a clear record. This workflow overrides any older instruction in this repository (or in its skills) to commit or push straight to `main`. If the user asks for a different flow in a session, follow the user.

1. **Record it before coding.**
   - Create a GitHub issue with `gh issue create`: a clear title, the context/problem, the proposed solution or decision, and acceptance criteria (for bugs: steps to reproduce, expected vs. actual). Add a `bug`, `enhancement`, or `architecture` label when the repository has it.
   - Write the same details to `docs/issues/<issue-number>-<short-slug>.md`, linking the issue at the top. Update this file if the plan changes during implementation; it is committed together with the change.
2. **Implement on a branch.** Use the repository's branch naming convention if it has one, otherwise `<type>/<issue-number>-<short-slug>` (e.g. `feat/42-dark-mode`, `fix/57-crash-on-launch`). Follow the repository's commit conventions and reference the issue (`#42`) in commits.
3. **Open the PR, wait for CI, then merge** once the code is finished and the relevant local checks pass:
   - Push the branch and run `gh pr create` with a short summary, how to test, and `Closes #<issue-number>`.
   - If the repository has CI, wait for it with `gh pr checks --watch`. If a check fails, fix it on the same branch, push, and wait again until everything is green. If no checks are reported, go straight to merging.
   - Once CI is green, merge with `gh pr merge --squash --delete-branch` — no waiting for human review. Then update the local checkout: `git switch main && git pull`.
   - If the merge is blocked (conflicts, other required checks), fix the cause and merge. Do not bypass branch protection with `--admin` unless the user asks, and never leave a PR open without saying so.
4. **While CI runs, hand off for testing:**
   - Tell the user briefly what changed and how to test it, with links to the issue and PR.
   - Start the app on this machine using the repository's own run command (dev server, `make run`, build and launch the Mac app, iOS simulator, Expo, etc.) so it is ready to try, and say where to find it (URL, app window, simulator). If the project has nothing to run, say how to verify the change instead.

<!-- END:github-workflow -->

## Pull requests

- After opening a PR in a personal repository under github.com/fernandobelotto, turn on the app's CI auto-fix and auto-merge for it (bind the PR to the session if needed).

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm exec ultracite fix`
- **Check for issues**: `pnpm exec ultracite check`
- **Diagnose setup**: `pnpm exec ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt will catch most mechanical issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `pnpm exec ultracite fix` before committing to ensure compliance.
