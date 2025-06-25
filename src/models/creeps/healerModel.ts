import { CreepRole } from "./creepModel";

export enum HealerState {
  Healing = "healing",
  Idle = "idle",
  Recycling = "recycling"
}

export interface HealerCreep extends Creep {
  memory: HealerMemory;
}

export interface HealerMemory {
  role: CreepRole.Healer;
  spawnId: string;
  state: HealerState;
}
