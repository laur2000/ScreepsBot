import { CreepRole } from "./creepModel";

export enum BoyscoutState {
  Scouting = "scouting"
}

export interface BoyscoutCreep extends Creep {
  memory: BoyscoutMemory;
}

export interface BoyscoutMemory {
  role: CreepRole.Boyscout;
  spawnId: string;
  state: BoyscoutState;
  targetFlag: string;
}
