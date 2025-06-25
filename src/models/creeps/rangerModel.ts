import { CreepRole } from "./creepModel";

export enum RangerState {
  Attacking = "attacking",
  Idle = "idle",
  Recycling = "recycling"
}

export interface RangerCreep extends Creep {
  memory: RangerMemory;
}

export interface RangerMemory {
  role: CreepRole.Ranger;
  spawnId: string;
  state: RangerState;
}
