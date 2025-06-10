export function recordCountToArray<T extends string | number | symbol>(record: Partial<Record<T, number>>): T[] {
  const res: T[] = [];
  for (const [key, count] of Object.entries(record)) {
    if (!count) continue;
    for (let i = 0; i < (count as number); i++) {
      res.push(key as T);
    }
  }
  return res;
}

export function getUniqueId() {
  return Math.random().toString(32).substring(2);
}
