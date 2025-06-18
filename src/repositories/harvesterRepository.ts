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

// const HarvesterBodyPartEnergyMapper = {
//   300: [WORK, WORK, CARRY, MOVE],
//   350: [WORK, WORK, CARRY, CARRY, MOVE],
//   400: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
//   450: [WORK, WORK, WORK, CARRY, CARRY, MOVE],
//   500: [WORK, WORK, WORK, CARRY, CARRY, MOVE],
//   550: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE],
//   600: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE],
//   650: [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE],
// }
