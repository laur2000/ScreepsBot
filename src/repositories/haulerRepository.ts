import { CreepRole, IRepository } from "./repository";

export enum HaulerState {
  Transferring = "transferring",
  Collecting = "collecting",
  Repairing = "repairing",
  Recycling = "recycling"
}

export interface HaulerCreep extends Creep {
  memory: HaulerMemory;
}

export interface HaulerMemory {
  role: CreepRole.Hauler;
  spawnId: string;
  state: HaulerState;
  containerTargetId?: string | null;
}

export interface IHaulerRepository extends IRepository<HaulerCreep> {
  countCreepsByTargetId(): Record<string, number>;
}

export class HaulerRepository implements IHaulerRepository {
  countCreepsInSpawn(spawnId: string): number {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Hauler && creep.memory.spawnId === spawnId
    ).length;
  }

  getCreeps(spawnId: string): HaulerCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Hauler && creep.memory.spawnId === spawnId
    ) as HaulerCreep[];
  }

  countCreepsByTargetId() {
    return Object.values(Game.creeps)
      .filter(creep => creep.memory.role === CreepRole.Hauler)
      .reduce((acc, creep) => {
        const targetId = creep.memory.containerTargetId;
        if (!targetId) return acc;

        acc[targetId] = (acc[targetId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }
}

export const haulerRepository = new HaulerRepository();
