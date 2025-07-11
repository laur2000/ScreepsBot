import { findRepository, TTarget } from "repositories";
import { calculateBodyCost } from "utils";
import profiler from "utils/profiler";

export interface ISpawnClosestAvailableOptions {
  target: TTarget;
  body: BodyPartConstant[];
  name: string;
  opts?: SpawnOptions;
}
export class SpawnService {
  spawnClosestAvailable({ target, body, name, opts }: ISpawnClosestAvailableOptions) {
    const energy = calculateBodyCost(body);
    const closestAvailableSpawn = findRepository.findClosestAvailableSpawnOfTarget(target, energy);
    if (!closestAvailableSpawn) return ERR_BUSY;

    return closestAvailableSpawn.spawnCreep(body, name, opts);
  }
}
profiler.registerClass(SpawnService, "SpawnService");

export const spawnService = new SpawnService();
