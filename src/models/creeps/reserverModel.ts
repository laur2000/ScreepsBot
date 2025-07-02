import { CreepRole } from "./creepModel";

export enum ReserverState {
  Reserving = "reserving",
  Recycling = "recycling"
}

export interface ReserverCreep extends Creep {
  memory: ReserverMemory;
}

export interface ReserverMemory {
  role: CreepRole.Reserver;
  spawnId: string;
  state: ReserverState;
  targetId?: string;
}
