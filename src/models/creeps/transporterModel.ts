import { CreepRole } from "./creepModel";

export enum TransporterState {
  Transferring = "transferring",
  Collecting = "collecting",
  Recycling = "recycling"
}

export interface TransporterCreep extends Creep {
  memory: TransporterMemory;
}

export interface TransporterMemory {
  role: CreepRole.Transporter;
  spawnId: string;
  state: TransporterState;
  containerTargetId?: string | null;
}
