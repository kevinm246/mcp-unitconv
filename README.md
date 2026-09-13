# mcp-unitconv

An MCP server that exposes unit conversion as a tool, so an assistant can convert
between units without guessing arithmetic.

Supports length, mass, time, temperature, area and volume.

## Install

```bash
npm install
npm run build
```

## Use with an MCP client

```json
{
  "mcpServers": {
    "unitconv": { "command": "node", "args": ["dist/server.js"] }
  }
}
```

## Tool

`convert(value, from, to)` returns the converted value, or an error when the two
units belong to different dimensions.

```
100 C  -> F   =>  212
1 km   -> m   =>  1000
1 km   -> kg  =>  error: dimension mismatch
```

## Test

```bash
npm test
```

## Publishing

The package is published as `mcp-unitconv`. `dist/` is built from `src/` and isn't
committed; `files` in package.json restricts what npm packs to `dist` (which
includes the `.d.ts` files `tsc` emits alongside the `.js`), so there's no need
for a separate `.npmignore`.

To cut a release:

```bash
npm version patch   # or minor / major
npm publish
```

`npm version` bumps the version in package.json and tags the commit;
`prepare` runs the build automatically before publish, so `dist/` is always
current. Push the tag afterward with `git push --follow-tags`.

## License

MIT
