# Publishing @faxify/mcp-client to npm

## Prerequisites

1. npm account with access to the `@faxify` scope
2. Authenticated with npm: `npm login`
3. Package version updated in `package.json`

## Publishing Steps

Publish from a clean `main` that is already pushed, so the npm package's `gitHead` is a commit anyone can see on GitHub.

```bash
# 1. Push main first (GitHub shows the same code and LICENSE as npm)
git checkout main && git pull
git status            # must be clean, HEAD == origin/main

# 2. Verify package contents
npm pack --dry-run

# 3. Publish (scoped packages need --access public for public packages)
npm publish --access public

# 4. Tag the published commit
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

## Version Updates

Update version in `package.json` before publishing:

```bash
npm version patch  # 0.2.0 -> 0.2.1
npm version minor  # 0.2.0 -> 0.3.0
npm version major  # 0.2.0 -> 1.0.0
```

`npm version` commits and tags the bump; push both with `git push --follow-tags`. If you edit `package.json` by hand instead, tag the commit yourself as in step 4.

## Testing Before Publishing

Test locally first:

```bash
# Pack locally
npm pack

# Install from tarball
npm install -g faxify-mcp-client-<version>.tgz

# Test in Cursor
# Update ~/.cursor/mcp.json to use the local package
```

## Automated Publishing (CI/CD)

Add to GitHub Actions:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    registry-url: https://registry.npmjs.org
- name: Publish to npm
  run: npm publish --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Rollback

Prefer deprecating a bad release and publishing a fixed version:

```bash
npm deprecate @faxify/mcp-client@<version> "<reason>; upgrade to <fixed version>"
```

`npm unpublish` is limited (within 72 hours, and only if nothing depends on the version) and a version number can never be reused, so use it only for a release that must not stay on the registry.
