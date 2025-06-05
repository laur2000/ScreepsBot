import { BuilderCreep } from "repositories/builderRepository";
import { IService, TSpawnCreepResponse } from "./service";

class BuilderService implements IService<BuilderCreep> {
  execute(creep: BuilderCreep): void {
    throw new Error("Method not implemented.");
  }

  getCreeps(spawn: StructureSpawn): BuilderCreep[] {
    throw new Error("Method not implemented.");
  }

  needMoreCreeps(spawn: StructureSpawn): boolean {
    throw new Error("Method not implemented.");
  }

  spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    throw new Error("Method not implemented.");
  }
}
