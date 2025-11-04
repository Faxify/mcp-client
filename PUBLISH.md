# Publishing @faxify/mcp-client to npm

## Prerequisites

1. npm account with access to `@faxify` scope (or create npm organization)
2. Authenticated with npm: `npm login`
3. Package version updated in `package.json`

## Publishing Steps

```bash
# Verify package contents
npm pack --dry-run

# Publish to npm (scoped packages need --access public for public packages)
npm publish --access public
```

## Version Updates

Update version in `package.json` before publishing:

```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

## Testing Before Publishing

Test locally first:

```bash
# Pack locally
npm pack

# Install from tarball
npm install -g faxify-mcp-client-0.1.0.tgz

# Test in Cursor
# Update ~/.cursor/mcp.json to use the local package
```

## Automated Publishing (CI/CD)

Add to GitHub Actions:

```yaml
- name: Publish to npm
  run: npm publish --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Rollback

If you need to unpublish (only within 72 hours):

```bash
npm unpublish @faxify/mcp-client@0.1.0
```

**Warning:** Only unpublish buggy releases. Don't unpublish working versions that users depend on.
