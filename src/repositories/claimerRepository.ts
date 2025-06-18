import { CreepRole, IRepository } from "./repository";

export enum ClaimerState {
  Collecting = "collecting",
  Claiming = "claiming",
  Upgrading = "upgrading",
  Recycling = "recycling"
}

export interface ClaimerCreep extends Creep {
  memory: ClaimerMemory;
}

export interface ClaimerMemory {
  role: CreepRole.Claimer;
  spawnId: string;
  state: ClaimerState;
}

export interface IClaimerRepository extends IRepository<ClaimerCreep> {
  countClaimFlags(): number;
}

export class ClaimerRepository implements IClaimerRepository {
  countCreepsInSpawn(spawnId: string): number {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Claimer && creep.memory.spawnId === spawnId
    ).length;
  }

  getCreeps(spawnId: string): ClaimerCreep[] {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Claimer && creep.memory.spawnId === spawnId
    ) as ClaimerCreep[];
  }

  countClaimFlags(): number {
    return Object.values(Game.flags).filter(flag => flag.name === "claim").length;
  }
}

export const claimerRepository = new ClaimerRepository();
