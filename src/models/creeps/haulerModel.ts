import { CreepRole } from "./creepModel";

export enum HaulerState {
  Transferring = "transferring",
  Collecting = "collecting",
  Repairing = "repairing",
  Recycling = "recycling"
}

export interface HaulerCreep extends Creep {
  memory: HaulerMemory;
}

export interface HaulerMemory {
  role: CreepRole.Hauler;
  spawnId: string;
  state: HaulerState;
  containerTargetId?: string | null;
}
