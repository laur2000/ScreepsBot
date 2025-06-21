import { ClaimerCreep, CreepRole, FlagType } from "models";
import { IRepository } from "repositories";

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
    return Object.values(Game.flags).filter(flag => flag.name === FlagType.Claim).length;
  }
}

export const claimerRepository = new ClaimerRepository();
