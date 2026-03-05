# tiny-map

[![npm version](https://img.shields.io/npm/v/map-tiny.svg)](https://www.npmjs.com/package/map-tiny)
[![npm downloads](https://img.shields.io/npm/dm/map-tiny.svg)](https://www.npmjs.com/package/map-tiny)
[![CI](https://github.com/ofershap/tiny-map/actions/workflows/ci.yml/badge.svg)](https://github.com/ofershap/tiny-map/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Map over promises with concurrency control. Same API as [`p-map`](https://github.com/sindresorhus/p-map), but ships both ESM and CJS with zero dependencies.

```ts
import { pMap } from "map-tiny";

const pages = await pMap(urls, (url) => fetch(url).then((r) => r.text()), {
  concurrency: 5,
});
```

> ~1.2 KB gzipped. Zero dependencies. Replaces p-map without the ESM-only headache.

![Demo](assets/demo.gif)

<sub>Demo built with <a href="https://github.com/ofershap/remotion-readme-kit">remotion-readme-kit</a></sub>

## Install

```bash
npm install map-tiny
```

## Usage

```ts
import { pMap } from "map-tiny";

const users = await pMap([1, 2, 3, 4, 5], (id) => fetchUser(id), {
  concurrency: 3,
});
```

### Skip items from results

```ts
import { pMap, pMapSkip } from "map-tiny";

const adults = await pMap(users, (user) => {
  if (user.age < 18) return new pMapSkip();
  return user;
});
```

### Async iterables

```ts
async function* generateIds() {
  for (let i = 0; i < 100; i++) yield i;
}

const results = await pMap(generateIds(), (id) => process(id), {
  concurrency: 10,
});
```

### Collect all errors

```ts
try {
  await pMap(items, riskyOperation, { stopOnError: false, concurrency: 5 });
} catch (error) {
  // AggregateError with all failures
  console.log(error.errors);
}
```

### Cancel with AbortSignal

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

await pMap(urls, fetchPage, {
  concurrency: 3,
  signal: controller.signal,
});
```

## Differences from `p-map`

`p-map` v7+ is ESM-only. If you `require("p-map")` in a CommonJS project, you get `ERR_REQUIRE_ESM`. `tiny-map` works with both `import` and `require()`.

|              | `p-map`                | `tiny-map` |
| ------------ | ---------------------- | ---------- |
| CJS support  | v5 only (v6+ ESM-only) | ESM + CJS  |
| Dependencies | none                   | 0          |
| TypeScript   | separate @types        | native     |
| Export       | default                | named      |

## Migrating from p-map

```diff
- import pMap from "p-map";
+ import { pMap } from "map-tiny";
```

One line. Everything else stays the same.

## API

### `pMap(input, mapper, options?)`

Maps over `input` with the `mapper` function, limiting concurrency.

- `input` - `Iterable` or `AsyncIterable`
- `mapper(element, index)` - function returning a value or promise
- `options.concurrency` - max parallel executions (default: `Infinity`)
- `options.stopOnError` - throw on first error or collect all (default: `true`)
- `options.signal` - `AbortSignal` for cancellation

Returns `Promise<NewElement[]>` with results in input order.

### `pMapSkip`

Return `new pMapSkip()` from the mapper to exclude that element from results.

## The tiny-\* family

Drop-in replacements for sindresorhus async utilities. All ship ESM + CJS with zero dependencies.

| Package                                                | Replaces             | What it does                   |
| ------------------------------------------------------ | -------------------- | ------------------------------ |
| [tiny-limit](https://github.com/ofershap/tiny-limit)   | p-limit              | Concurrency limiter            |
| **tiny-map**                                           | p-map                | Concurrent map with order      |
| [tiny-retry](https://github.com/ofershap/tiny-retry)   | p-retry              | Retry with exponential backoff |
| [tiny-queue](https://github.com/ofershap/tiny-queue)   | p-queue              | Priority task queue            |
| [tiny-ms](https://github.com/ofershap/tiny-ms)         | ms                   | Parse/format durations         |
| [tiny-escape](https://github.com/ofershap/tiny-escape) | escape-string-regexp | Escape regex chars             |

Want all async utilities in one import? Use [`tiny-async-kit`](https://github.com/ofershap/tiny-async).

## Author

[![Made by ofershap](https://gitshow.dev/api/card/ofershap)](https://gitshow.dev/ofershap)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ofershap)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github&logoColor=white)](https://github.com/ofershap)

---

If this saved you from `ERR_REQUIRE_ESM`, [star the repo](https://github.com/ofershap/tiny-map) or [open an issue](https://github.com/ofershap/tiny-map/issues) if something breaks.

## License

[MIT](LICENSE) &copy; [Ofer Shapira](https://github.com/ofershap)
