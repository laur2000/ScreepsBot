type CacheEntry = {
  count: number;
  value: any;
};

export function CacheFor(limit: number = 10) {
  // For each instance (this), holds a Map from argsKey → CacheEntry
  const cacheMap = new WeakMap<object, Map<string, CacheEntry>>();

  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // get or create the per-instance cache
      let instMap = cacheMap.get(this);
      if (!instMap) {
        instMap = new Map<string, CacheEntry>();
        cacheMap.set(this, instMap);
      }

      // key by serialized arguments
      let key: string;
      try {
        key = JSON.stringify(args);
      } catch {
        // fallback for non-serializable args
        key = args.map(a => String(a)).join("|");
      }

      // look up existing entry
      let entry = instMap.get(key);
      if (!entry) {
        // first-ever call with this argsKey
        const result = originalMethod.apply(this, args);
        entry = { count: 1, value: result };
        instMap.set(key, entry);
        return result;
      }

      // still within cache window?
      if (entry.count < limit) {
        entry.count++;
        return entry.value;
      }

      // limit reached → refresh cache for this argsKey
      const result = originalMethod.apply(this, args);
      entry.value = result;
      entry.count = 1;
      return result;
    };

    return descriptor;
  };
}
