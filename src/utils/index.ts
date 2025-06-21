import { CreepRole } from "models";
import { RoomServiceConfig, roomServiceConfig } from "services";

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

Array.prototype.flatMap = function <T, U>(
  this: T[],
  callback: (value: T, index: number, array: T[]) => U | U[],
  thisArg?: any
): U[] {
  const result: U[] = [];

  for (let i = 0; i < this.length; i++) {
    if (i in this) {
      const mapped = callback.call(thisArg, this[i], i, this);
      if (Array.isArray(mapped)) {
        result.push(...mapped);
      } else {
        result.push(mapped);
      }
    }
  }

  return result;
};

Creep.prototype.findClosestByPriority = function (types, opts) {
  const rangeCache = new WeakMap();
  return (
    types
      .flatMap(type => this.room.find(type, opts))
      .sort((a, b) => {
        const aPriority = opts?.priority?.(a) || 0;
        const bPriority = opts?.priority?.(b) || 0;
        const diff = aPriority - bPriority;
        if (diff !== 0) return diff;
        if (!rangeCache.has(a)) {
          rangeCache.set(a, this.pos.getRangeTo(a));
        }
        if (!rangeCache.has(b)) {
          rangeCache.set(b, this.pos.getRangeTo(b));
        }
        const aDist = rangeCache.get(a);
        const bDist = rangeCache.get(b);
        return aDist - bDist;
      })[0] || null
  );
};

export function getVisibleFlaggedRooms(flagName?: string) {
  const flags = Object.values(Game.flags).filter(flag => !flagName || flag.name === flagName);
  const rooms = flags.map(flag => flag.room).filter(room => !!room) as Room[];
  return rooms;
}

export function getMaxCreepsPerTarget(role: CreepRole, target: { room: Room }) {
  const config = getCreepConfigPerRoom(role, target.room);
  return config.maxCreepsPerSource ?? 1;
}

export function getCreepConfigPerRoom(role: CreepRole, room: Room) {
  const config = roomServiceConfig[room.name]?.[role] || roomServiceConfig.default[role];
  return config as RoomServiceConfig;
}
export * from "./config";
export * from "./ErrorMapper";
export * from "./Traveler";
export * from "./market";
export * from "./pathStyles";
