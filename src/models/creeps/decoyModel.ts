import { CreepRole } from "./creepModel";

export enum DecoyState {
  Distracting = "distracting",
  Idle = "idle",
  Recycling = "recycling"
}

export interface DecoyCreep extends Creep {
  memory: DecoyMemory;
}

export interface DecoyMemory {
  role: CreepRole.Decoy;
  spawnId: string;
  state: DecoyState;
}
