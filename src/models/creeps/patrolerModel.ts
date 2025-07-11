import { CreepRole } from "./creepModel";

export enum PatrolerState {
  Patroling = "patroling",
  Attacking = "attacking",
  Recycling = "recycling"
}

export interface PatrolerCreep extends Creep {
  memory: PatrolerMemory;
}

export interface PatrolerMemory {
  role: CreepRole.Patroler;
  spawnId: string;
  state: PatrolerState;
  groupId: string;
}
