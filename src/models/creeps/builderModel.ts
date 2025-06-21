import { CreepRole } from "./creepModel";

export enum BuilderState {
  Building = "building",
  Boosting = "boosting",
  Collecting = "collecting",
  Recycling = "recycling"
}

export interface BuilderCreep extends Creep {
  memory: BuilderMemory;
}

export interface BuilderMemory {
  role: CreepRole.Builder;
  spawnId: string;
  state: BuilderState;
}
