import { CreepRole } from "./creepModel";

export enum PowerHarvesterState {
  Idle = "idle",
  Harvesting = "harvesting",
  Recycling = "recycling"
}

export interface PowerHarvesterCreep extends Creep {
  memory: PowerHarvesterMemory;
}

export interface PowerHarvesterMemory {
  role: CreepRole.PowerHarvester;
  spawnId: string;
  state: PowerHarvesterState;
  flagName: string;
}
