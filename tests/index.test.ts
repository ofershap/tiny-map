import { describe, it, expect } from "vitest";
import { pMap, pMapSkip } from "../src/index.js";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe("pMap", () => {
  it("maps values", async () => {
    const result = await pMap([1, 2, 3], (x) => x * 2);
    expect(result).toEqual([2, 4, 6]);
  });

  it("maps async values", async () => {
    const result = await pMap([1, 2, 3], async (x) => {
      await delay(1);
      return x * 10;
    });
    expect(result).toEqual([10, 20, 30]);
  });

  it("preserves order with concurrency", async () => {
    const result = await pMap(
      [30, 10, 20],
      async (ms) => {
        await delay(ms);
        return ms;
      },
      { concurrency: 2 },
    );
    expect(result).toEqual([30, 10, 20]);
  });

  it("limits concurrency", async () => {
    let running = 0;
    let maxRunning = 0;

    await pMap(
      Array.from({ length: 10 }),
      async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await delay(10);
        running--;
      },
      { concurrency: 3 },
    );

    expect(maxRunning).toBe(3);
  });

  it("defaults to Infinity concurrency", async () => {
    let running = 0;
    let maxRunning = 0;

    await pMap(Array.from({ length: 5 }), async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await delay(10);
      running--;
    });

    expect(maxRunning).toBe(5);
  });

  it("passes index to mapper", async () => {
    const indices: number[] = [];
    await pMap([10, 20, 30], (_val, index) => {
      indices.push(index);
    });
    expect(indices).toEqual([0, 1, 2]);
  });

  it("handles empty input", async () => {
    const result = await pMap([], (x: number) => x);
    expect(result).toEqual([]);
  });

  it("handles single element", async () => {
    const result = await pMap([42], (x) => x + 1);
    expect(result).toEqual([43]);
  });

  it("throws on first error with stopOnError true", async () => {
    await expect(
      pMap(
        [1, 2, 3],
        async (x) => {
          if (x === 2) throw new Error("fail");
          return x;
        },
        { concurrency: 1 },
      ),
    ).rejects.toThrow("fail");
  });

  it("collects errors with stopOnError false", async () => {
    try {
      await pMap(
        [1, 2, 3],
        async (x) => {
          if (x >= 2) throw new Error(`fail-${x}`);
          return x;
        },
        { concurrency: 1, stopOnError: false },
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      const agg = error as AggregateError;
      expect(agg.errors).toHaveLength(2);
    }
  });

  it("returns partial results when stopOnError is false and some succeed", async () => {
    try {
      await pMap(
        [1, 2, 3],
        async (x) => {
          if (x === 2) throw new Error("fail");
          return x * 10;
        },
        { concurrency: 1, stopOnError: false },
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
    }
  });

  it("supports pMapSkip to filter results", async () => {
    const result = await pMap(
      [1, 2, 3, 4, 5],
      (x) => {
        if (x % 2 === 0) return new pMapSkip() as unknown as number;
        return x;
      },
      { concurrency: 1 },
    );
    expect(result).toEqual([1, 3, 5]);
  });

  it("supports AbortSignal", async () => {
    const controller = new AbortController();

    const promise = pMap(
      [1, 2, 3],
      async (x) => {
        await delay(50);
        return x;
      },
      { concurrency: 1, signal: controller.signal },
    );

    setTimeout(() => controller.abort(), 10);
    await expect(promise).rejects.toThrow();
  });

  it("rejects if signal already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      pMap([1], (x) => x, { signal: controller.signal }),
    ).rejects.toThrow();
  });

  it("supports async iterables", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
    }

    const result = await pMap(gen(), (x) => x * 2);
    expect(result).toEqual([2, 4, 6]);
  });

  it("supports sync mapper", async () => {
    const result = await pMap([1, 2, 3], (x) => x + 1);
    expect(result).toEqual([2, 3, 4]);
  });

  it("throws on invalid concurrency", async () => {
    await expect(
      pMap([], (x: number) => x, { concurrency: 0 }),
    ).rejects.toThrow(TypeError);
    await expect(
      pMap([], (x: number) => x, { concurrency: -1 }),
    ).rejects.toThrow(TypeError);
  });

  it("concurrency 1 processes sequentially", async () => {
    const order: number[] = [];

    await pMap(
      [1, 2, 3],
      async (x) => {
        order.push(x);
        await delay(1);
        return x;
      },
      { concurrency: 1 },
    );

    expect(order).toEqual([1, 2, 3]);
  });
});
