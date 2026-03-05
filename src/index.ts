// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class pMapSkip {}

export interface Options {
  concurrency?: number;
  stopOnError?: boolean;
  signal?: AbortSignal;
}

export async function pMap<Element, NewElement>(
  input: Iterable<Element> | AsyncIterable<Element>,
  mapper: (element: Element, index: number) => NewElement | Promise<NewElement>,
  options?: Options,
): Promise<NewElement[]> {
  const { concurrency = Infinity, stopOnError = true, signal } = options ?? {};

  validateConcurrency(concurrency);

  const items: Element[] = [];

  if (Symbol.asyncIterator in Object(input)) {
    for await (const item of input as AsyncIterable<Element>) {
      items.push(item);
    }
  } else {
    for (const item of input as Iterable<Element>) {
      items.push(item);
    }
  }

  if (items.length === 0) return [];

  const result: NewElement[] = [];
  const errors: Error[] = [];
  const skipped = new Set<number>();
  let isSettled = false;

  return new Promise<NewElement[]>((resolve, reject) => {
    const total = items.length;
    let nextIndex = 0;
    let completed = 0;

    const settle = () => {
      if (isSettled) return;
      if (completed >= total) {
        isSettled = true;
        if (!stopOnError && errors.length > 0) {
          reject(new AggregateError(errors, "pMap errors"));
        } else {
          const filtered: NewElement[] = [];
          for (let i = 0; i < result.length; i++) {
            if (!skipped.has(i)) filtered.push(result[i] as NewElement);
          }
          resolve(filtered);
        }
      }
    };

    const run = async () => {
      if (isSettled || nextIndex >= total) return;

      if (signal?.aborted) {
        isSettled = true;
        reject(signal.reason ?? new Error("Aborted"));
        return;
      }

      const idx = nextIndex++;

      try {
        const value = await mapper(items[idx] as Element, idx);
        if (value instanceof pMapSkip) {
          skipped.add(idx);
          result[idx] = undefined as NewElement;
        } else {
          result[idx] = value;
        }
      } catch (error) {
        if (stopOnError) {
          isSettled = true;
          reject(error as Error);
          return;
        }
        errors.push(error as Error);
        skipped.add(idx);
        result[idx] = undefined as NewElement;
      }

      completed++;

      if (!isSettled && nextIndex < total) {
        run();
      }

      settle();
    };

    if (signal) {
      if (signal.aborted) {
        reject(signal.reason ?? new Error("Aborted"));
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          if (!isSettled) {
            isSettled = true;
            reject(signal.reason ?? new Error("Aborted"));
          }
        },
        { once: true },
      );
    }

    const workers = Math.min(concurrency, total);
    for (let i = 0; i < workers; i++) {
      run();
    }
  });
}

export default pMap;

function validateConcurrency(value: number): void {
  if (
    !(
      (Number.isInteger(value) || value === Number.POSITIVE_INFINITY) &&
      value > 0
    )
  ) {
    throw new TypeError("Expected `concurrency` to be a number from 1 and up");
  }
}
