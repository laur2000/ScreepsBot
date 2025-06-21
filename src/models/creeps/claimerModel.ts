import { CreepRole } from "./creepModel";

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
