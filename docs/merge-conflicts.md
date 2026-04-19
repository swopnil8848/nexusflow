# How to resolve merge conflicts quickly

1. Save your work:
   ```bash
   git add -A
   git commit -m "wip before conflict resolution"
   ```
2. Rebase on latest target branch:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
3. For each conflict file:
   - open the file
   - keep the needed lines from both sides
   - remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
4. Mark resolved and continue:
   ```bash
   git add <file>
   git rebase --continue
   ```
5. If it gets messy:
   ```bash
   git rebase --abort
   ```

## Tips for this project

- Keep feature changes isolated in `src/auth/**`, `src/prisma/**`, and `prisma/**` to reduce conflict risk.
- Avoid rewriting entire files like `README.md` unless necessary.
