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
}

export class HarvesterRepository implements IRepository<HarvesterCreep> {
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
}

export const harvesterRepository = new HarvesterRepository();
