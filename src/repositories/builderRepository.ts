import { CreepRole, IRepository } from "./repository";

export enum BuilderState {
  Building = "building",
  Boosting = "boosting",
  Collecting = "collecting",
  Recycling = "recycling"
}

export interface BuilderCreep extends Creep {
  memory: BuilderMemory;
}

export interface BuilderMemory {
  role: CreepRole.Builder;
  spawnId: string;
  state: BuilderState;
}

export class BuilderRepository implements IRepository<BuilderCreep> {
  countCreepsInSpawn(spawnId: string): number {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Builder && creep.memory.spawnId === spawnId
    ).length;
  }

  getCreeps(spawnId: string): BuilderCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Builder && creep.memory.spawnId === spawnId
    ) as BuilderCreep[];
  }
}

export const builderRepository = new BuilderRepository();
