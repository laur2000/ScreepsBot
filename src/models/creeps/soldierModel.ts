import { CreepRole } from "./creepModel";

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
