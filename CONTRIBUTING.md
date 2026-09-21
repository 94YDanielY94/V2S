# Contributing to V2S

Thank you for your interest in contributing to **V2S (Video to Slide)**!

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/94YDanielY94/V2S.git
   cd V2S
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start the development environment:**
   - For Electron desktop app:
     ```bash
     pnpm dev
     ```
   - For web browser only:
     ```bash
     pnpm dev:web
     ```

## Code Quality

Before opening a pull request, please verify that your changes compile and pass linting:

```bash
# Type check and build
pnpm build

# Run linter
pnpm lint
```

## Pull Request Guidelines

1. Fork the repo and create your branch from `master`.
2. Keep pull requests focused on a single feature or bugfix.
3. Ensure the project builds cleanly without TypeScript or linting errors.
4. Describe your changes clearly in the pull request description.
