# Contributing to VEXE

Thank you for your interest in contributing to VEXE! Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## Code of Conduct

This project and everyone participating in it is governed by a code of mutual respect and inclusivity. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps which reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs if possible**
- **Provide your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**

### Pull Requests

- Fill in the required template
- Follow the code style of the project
- Document new code with comments
- End all files with a newline
- Avoid large PRs - break them into smaller, focused changes
- Include appropriate test cases if applicable

## Getting Started with Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Development Setup

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork locally
git clone https://github.com/YOUR_USERNAME/vexe.git
cd vexe

# 3. Add upstream remote
git remote add upstream https://github.com/z3i0/vexe.git

# 4. Install dependencies
npm install

# 5. Initialize database
npm run db

# 6. Create a feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Keep commits atomic** - Each commit should represent a single logical change
2. **Write clear commit messages** - Use the format: `<type>: <subject>` (e.g., `feat: Add voice mirroring`, `fix: Resolve token parsing issue`)
3. **Test your changes** - Ensure the functionality works as expected before committing
4. **Update documentation** - If you change functionality, update the README

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat` - A new feature
- `fix` - A bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring without feature/bug changes
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks, dependency updates

**Subject:**
- Use imperative mood ("add feature" not "added feature")
- Don't capitalize first letter
- No period at the end
- Limit to 50 characters

**Body (optional):**
- Wrap at 72 characters
- Explain what and why, not how
- Reference related issues (e.g., `Fixes #123`)

### Testing Your Code

Before submitting a PR:

```bash
# Test the CLI
npm run cli -- --help

# Test account management
npm run cli -- accounts list

# Test bot functionality
npm run cli -- bot run --help

# Test interactively
node index.js
```

## Code Style Guidelines

### JavaScript Style

- Use ES6+ features
- Use `const` by default, `let` if rebinding needed, avoid `var`
- Use meaningful variable names
- Keep functions small and focused
- Add comments for complex logic
- Use arrow functions where appropriate

### Example:

```javascript
// Good
const validateToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token format');
  }
  return token.trim();
};

// Avoid
function validateToken(token) {
  if (!token) return false;
  return token; // Unclear intent
}
```

### Comments

```javascript
// Use single-line comments for brief explanations
const accountId = user.id; // Store user ID for later reference

// Use block comments for complex sections
/*
 * This function recursively follows a user across voice channels
 * by monitoring Discord gateway events and comparing user locations
 */
const followUser = async (userId) => {
  // implementation
};
```

## Project Structure

```
vexe/
├── cli.js                 # Command-line interface
├── clientManager.js       # Discord client management
├── db.js                  # Database layer
├── voiceAdapter.js        # Voice channel adapter
├── utils.js               # Utility functions
├── index.js               # Interactive menu
├── models/                # Data models
├── config/                # Configuration
└── tests/                 # Test files (if applicable)
```

## Additional Notes

### Before Submitting

1. Run through all commands to ensure they work
2. Test with multiple accounts if possible
3. Check for console errors or warnings
4. Update relevant documentation
5. Add comments to complex code
6. Verify `.gitignore` entries are respected

### PR Review Process

- Your PR will be reviewed by maintainers
- Requested changes don't mean rejection - they're part of the process
- Be open to feedback and collaborate on improvements
- Once approved, your PR will be merged!

### Becoming a Maintainer

Active contributors who consistently provide high-quality submissions may be invited to become maintainers with merge rights and decision-making authority.

## Recognition

Contributors will be recognized in:
- Repository README contributors section
- Release notes for substantial contributions
- GitHub's automatic contributor graph

## Questions?

- Check existing issues and discussions
- Create a new discussion for general questions
- Join the developer community

---

Thank you for contributing to making VEXE better! 🎉
