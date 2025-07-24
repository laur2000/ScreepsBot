import { CreepRole, FlagType } from "models";
import { RoomServiceConfig, roomServiceConfig } from "services";

declare global {
  namespace NodeJS {
    interface Global {
      removeLabFlags(roomName: string): void;
    }
  }
}

global.removeLabFlags = function (roomName: string) {
  for (const flag of findFlags(FlagType.Lab)) {
    if (flag.room?.name === roomName) {
      flag.remove();
    }
  }

  for (const flag of findFlags(FlagType.Output)) {
    if (flag.room?.name === roomName) {
      flag.remove();
    }
  }

  for (const flag of findFlags(FlagType.Reaction)) {
    if (flag.room?.name === roomName) {
      flag.remove();
    }
  }

  for (const flag of findFlags(FlagType.Reverse)) {
    if (flag.room?.name === roomName) {
      flag.remove();
    }
  }
};

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

export function isTombstone(target: unknown): target is Tombstone {
  return target instanceof Tombstone;
}

export function calculateBodyCost(body: BodyPartConstant[]) {
  return body.reduce((acc, part) => acc + BODYPART_COST[part], 0);
}

export function getVisibleFlaggedRooms(flagType?: FlagType) {
  const flags = flagType ? findFlags(flagType) : Object.values(Game.flags);
  const rooms = flags.map(flag => flag.room).filter(room => !!room) as Room[];
  return rooms;
}

export function getMaxCreepsPerTarget(role: CreepRole, target: { room: Room }) {
  const config = getCreepConfigPerRoom(role, target.room);
  return config.maxCreepsPerSource ?? 1;
}

export function findFlag(flagType: FlagType): Flag | null {
  return Object.values(Game.flags).find(flag => flag.name.startsWith(flagType)) ?? null;
}

export function findFlags(flagType: FlagType, roomName?: string): Flag[] {
  return Object.values(Game.flags).filter(
    flag => flag.name.startsWith(flagType) && (!roomName || flag.room?.name === roomName)
  );
}

export function measureCpu(fn: () => void, label: string) {
  const startCpu = Game.cpu.getUsed();
  fn();
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  if (label.includes("run")) return;
  console.log(`${label}: ${cpuUsed.toFixed(2)}`);
}

export function getCreepConfigPerRoom(role: CreepRole, room: Room) {
  const config = roomServiceConfig[room.name]?.[role] || roomServiceConfig.default[role];
  return config as RoomServiceConfig;
}

export function getLabs(roomName?: string) {
  return getLabsBy({ roomName, flagType: FlagType.Lab });
}

export const tryRun = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    console.log(e);
  }
};

export function throttleTicks(ticks: number) {
  return Game.time % ticks === 0;
}
export function getLabsBy({ roomName, flagType }: { roomName?: string; flagType: FlagType }) {
  return findFlags(flagType)
    .filter(flag => (roomName ? flag.room?.name === roomName : true))
    .map(flag => {
      const lab = flag.pos
        .lookFor(LOOK_STRUCTURES)
        .find(structure => structure.structureType === STRUCTURE_LAB) as StructureLab;
      const mineral = flag.name.split(",")[1];
      if (!lab) return null;
      return {
        lab,
        mineral
      };
    })
    .filter(x => !!x) as { lab: StructureLab; mineral: MineralConstant | MineralCompoundConstant }[];
}

export function doRecycle(creep: Creep): void {
  const spawn = Game.getObjectById(creep.memory.spawnId) as StructureSpawn;
  if (!spawn) return;

  const err = spawn.recycleCreep(creep);

  switch (err) {
    case ERR_NOT_IN_RANGE:
      creep.travelTo(spawn);

      break;
  }
}

export function isMyUsername(name: string) {
  const spawn = Object.values(Game.spawns)[0];
  if (!spawn) return false;
  return spawn.owner.username === name;
}
export * from "./config";
export * from "./ErrorMapper";
export * from "./Traveler";
export * from "./market";
export * from "./pathStyles";
