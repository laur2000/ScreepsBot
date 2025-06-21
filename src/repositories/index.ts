export * from "./creeps";
export * from "./structures";
export * from "./global";

export interface IRepository<T extends Creep> {
  countCreepsInSpawn(spawn: string): number;
  getCreeps(spawnId: string): T[];
}
