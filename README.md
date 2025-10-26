# Carnil Providers

Payment providers for Carnil unified payments platform.

## Packages

- `@carnil/razorpay` - Razorpay payment provider
- `@carnil/stripe` - Stripe payment provider

## Development

This is a pnpm workspace monorepo. To get started:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Run linting
pnpm run lint
```

## Publishing

This repository uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

### Making Changes

When you make changes that should be published:

1. Create a changeset file:

   ```bash
   pnpm changeset
   ```

2. Follow the prompts to describe your changes and select which packages to bump

3. Commit your changes and the changeset file

### Publishing

The GitHub Actions workflow will automatically:

- Create a release PR when changesets are added
- Publish packages to npm when the release PR is merged

### Manual Publishing

If you need to publish manually:

```bash
# Version packages based on changesets
pnpm run version:patch

# Publish to npm
pnpm run release
```

## Workflow

1. Make changes to packages
2. Add changesets describing the changes
3. Create a pull request
4. Merge the pull request
5. GitHub Actions will create a release PR
6. Merge the release PR to publish packages
