import { BuilderCreep, CreepRole } from "models";
import { IRepository } from "repositories";

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
