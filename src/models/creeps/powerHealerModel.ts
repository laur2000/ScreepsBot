import { CreepRole } from "./creepModel";

export enum PowerHealerState {
  Idle = "idle",
  Harvesting = "healing",
  Recycling = "recycling"
}

export interface PowerHealerCreep extends Creep {
  memory: PowerHealerMemory;
}

export interface PowerHealerMemory {
  role: CreepRole.PowerHealer;
  spawnId: string;
  state: PowerHealerState;
  flagName: string;
}
