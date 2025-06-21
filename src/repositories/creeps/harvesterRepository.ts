import { CreepRole, HarvesterCreep, HarvesterState } from "models";
import { IRepository } from "repositories";

export interface IHarvesterRepository extends IRepository<HarvesterCreep> {
  countCreepsBySource(): Record<string, number>;
  countHarvestFlags(): number;
  getMaxCreepsPerSpawnLevel(spawn: StructureSpawn): number;
}

export class HarvesterRepository implements IHarvesterRepository {
  countCreepsInSpawn(spawnId: string): number {
    return Object.values(Game.creeps).filter(
      (creep: Creep) =>
        creep.memory.role === CreepRole.Harvester &&
        creep.memory.spawnId === spawnId &&
        creep.memory.state !== HarvesterState.Recycling
    ).length;
  }

  getMaxCreepsPerSpawnLevel(spawn: StructureSpawn): number {
    switch (spawn.room.controller?.level) {
      case 1:
      case 2:
      case 3:
        return 1;
      default:
        return 2;
    }
  }
  getCreeps(spawnId: string): HarvesterCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Harvester && creep.memory.spawnId === spawnId
    ) as HarvesterCreep[];
  }

  countCreepsBySource() {
    return Object.values(Game.creeps)
      .filter(creep => creep.memory.role === CreepRole.Harvester && creep.memory.state !== HarvesterState.Recycling)
      .reduce((acc, creep) => {
        const targetId = creep.memory.harvestTargetId;
        if (!targetId) return acc;

        acc[targetId] = (acc[targetId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }

  countHarvestFlags(): number {
    return Object.values(Game.flags).filter(flag => flag.name === "harvest").length;
  }
}

export const harvesterRepository = new HarvesterRepository();
