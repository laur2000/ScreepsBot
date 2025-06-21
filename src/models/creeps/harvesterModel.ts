import { CreepRole } from "./creepModel";

export enum HarvesterState {
  Harvesting = "harvesting",
  Transferring = "transferring",
  Recycling = "recycling"
}

export interface HarvesterCreep extends Creep {
  memory: HarvesterMemory;
}

export interface HarvesterMemory {
  role: CreepRole.Harvester;
  spawnId: string;
  state: HarvesterState;
  harvestTargetId?: string | null;
}
