// Structural equality check for RxJS `distinctUntilChanged` comparators.
//
// A lot of the socket hooks in src/sockets used to compare emissions with
// `JSON.stringify(a) === JSON.stringify(b)`. That runs on every single
// socket tick for every subscriber (e.g. once per AMR per field on the Main
// page), and serializing the whole payload to a throwaway string just to
// compare it is expensive: two full string allocations per tick that get
// garbage-collected immediately. With dozens of AMRs each holding a handful
// of these comparators, that adds up to a lot of GC churn and is the main
// suspect behind the Main/Setting pages' high memory/CPU use.
// This walks the structure directly and bails out on the first difference,
// with no serialization and no allocation in the (common) equal case.
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }

  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }

  return true;
}
