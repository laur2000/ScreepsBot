import { CreepRole, FlagType, SoldierCreep } from "models";
import { IRepository } from "repositories";
import { findFlags, getVisibleFlaggedRooms } from "utils";

export interface ISoldierRepository extends IRepository<SoldierCreep> {
  countEnemiesInRooms(): number;
}

export class SoldierRepository implements ISoldierRepository {
  countCreepsInSpawn(spawnId: string): number {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Soldier && creep.memory.spawnId === spawnId
    ).length;
  }

  getCreeps(spawnId: string): SoldierCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Soldier && creep.memory.spawnId === spawnId
    ) as SoldierCreep[];
  }

  countEnemiesInRooms(): number {
    const defendRooms = getVisibleFlaggedRooms(FlagType.Defend);
    const hostileCreeps = defendRooms.reduce((acc, room) => acc + room.find(FIND_HOSTILE_CREEPS).length, 0);

    const invaderCore = defendRooms.reduce(
      (acc, room) =>
        acc +
        room.find(FIND_HOSTILE_STRUCTURES, { filter: structure => structure.structureType === STRUCTURE_INVADER_CORE })
          .length,
      0
    );

    return hostileCreeps + invaderCore;
  }
}

export const soldierRepository = new SoldierRepository();
