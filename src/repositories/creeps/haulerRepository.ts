import { CreepRole, HaulerCreep, HaulerState } from "models";
import { IRepository } from "repositories";

export interface IHaulerRepository extends IRepository<HaulerCreep> {
  countCreepsByTargetId(): Record<string, number>;
  getAllCreeps(): HaulerCreep[];
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

  getAllCreeps(): HaulerCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Hauler && creep.memory.state !== HaulerState.Recycling
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
