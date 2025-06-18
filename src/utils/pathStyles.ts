import { CreepRole } from "repositories/repository";

export const harvesterPathStyle: PolyStyle = {
  stroke: "yellow"
};

export const builderPathStyle: PolyStyle = {
  stroke: "green"
};

export const soldierPathStyle: PolyStyle = {
  stroke: "red"
};

export const transporterPathStyle: PolyStyle = {
  stroke: "blue"
};

export const claimerPathStyle: PolyStyle = {
  stroke: "purple"
};

export const pathStyles: Record<CreepRole, PolyStyle> = {
  [CreepRole.Harvester]: harvesterPathStyle,
  [CreepRole.Builder]: builderPathStyle,
  [CreepRole.Soldier]: soldierPathStyle,
  [CreepRole.Turret]: soldierPathStyle,
  [CreepRole.Transporter]: transporterPathStyle,
  [CreepRole.Claimer]: claimerPathStyle
};
