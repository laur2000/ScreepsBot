import { CreepRole, IRepository } from "./repository";

export enum SoldierState {
  Attacking = "attacking",
  Recycling = "recycling"
}

export interface SoldierCreep extends Creep {
  memory: SoldierMemory;
}

export interface SoldierMemory {
  role: CreepRole.Soldier;
  spawnId: string;
  state: SoldierState;
}

export interface ISoldierRepository extends IRepository<SoldierCreep> {
  countEnemiesInRooms(): number
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
    return Object.values(Game.rooms).reduce((acc, room) => acc + room.find(FIND_HOSTILE_CREEPS).length, 0);
  }
}

export const soldierRepository = new SoldierRepository();
