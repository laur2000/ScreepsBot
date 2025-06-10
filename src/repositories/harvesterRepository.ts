import { CreepRole, IRepository } from "./repository";

export enum HarvesterState {
  Harvesting = "harvesting",
  Transferring = "transferring",
  Recycling = "recycling"
}

export interface HarvesterCreep extends Creep {
  memory: HarvesterMemory;
}

export interface HarvesterMemory {
  role: CreepRole.Harvester;
  spawnId: string;
  state: HarvesterState;
  harvestTargetId?: string | null;
}

export interface IHarvesterRepository extends IRepository<HarvesterCreep> {
  countCreepsBySource(): Record<string, number>;
}

export class HarvesterRepository implements IHarvesterRepository {
  countCreepsInSpawn(spawnId: string): number {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Harvester && creep.memory.spawnId === spawnId
    ).length;
  }

  getCreeps(spawnId: string): HarvesterCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Harvester && creep.memory.spawnId === spawnId
    ) as HarvesterCreep[];
  }

  countCreepsBySource() {
    return Object.values(Game.creeps)
      .filter(creep => creep.memory.role === CreepRole.Harvester)
      .reduce((acc, creep) => {
        const targetId = creep.memory.harvestTargetId;
        if (!targetId) return acc;

        acc[targetId] = (acc[targetId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }
}

export const harvesterRepository = new HarvesterRepository();
