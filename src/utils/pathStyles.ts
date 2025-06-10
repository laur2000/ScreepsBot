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

export const pathStyles: Record<CreepRole, PolyStyle> = {
  [CreepRole.Harvester]: harvesterPathStyle,
  [CreepRole.Builder]: builderPathStyle,
  [CreepRole.Soldier]: soldierPathStyle,
  [CreepRole.Turret]: soldierPathStyle
};
