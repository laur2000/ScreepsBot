export type TSpawnCreepResponse =
  | OK
  | ERR_NOT_OWNER
  | ERR_NAME_EXISTS
  | ERR_BUSY
  | ERR_NOT_ENOUGH_ENERGY
  | ERR_INVALID_ARGS
  | ERR_RCL_NOT_ENOUGH;

export interface IService<T extends Creep> {
  needMoreCreeps(spawn: StructureSpawn): boolean;
  spawn(spawn: StructureSpawn): TSpawnCreepResponse;
  execute(creep: T): void;
  getCreeps(spawn: StructureSpawn): T[];
}
