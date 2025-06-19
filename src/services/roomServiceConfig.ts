import { CreepBodyPart, CreepRole } from "repositories/repository";

export const roomServiceConfig: Record<
  string,
  Partial<
    Record<
      CreepRole,
      {
        maxCreepsPerSource?: number;
        maxCreeps?: number;
        bodyParts: Partial<Record<CreepBodyPart, number>>;
        useBoost: boolean;
      }
    >
  >
> = {
  W8S35: {
    harvester: {
      maxCreepsPerSource: 2,
      bodyParts: { [CreepBodyPart.Work]: 4, [CreepBodyPart.Carry]: 1, [CreepBodyPart.Move]: 2 },
      useBoost: false
    },
    builder: {
      maxCreeps: 3,
      bodyParts: { [CreepBodyPart.Work]: 8, [CreepBodyPart.Carry]: 3, [CreepBodyPart.Move]: 4 },
      useBoost: false
    },
    transporter: {
      maxCreeps: 2,
      bodyParts: { [CreepBodyPart.Carry]: 6, [CreepBodyPart.Move]: 3 },
      useBoost: false
    }
  },
  W7S35: {
    harvester: {
      maxCreepsPerSource: 1,
      bodyParts: { [CreepBodyPart.Work]: 6, [CreepBodyPart.Carry]: 1, [CreepBodyPart.Move]: 2 },
      useBoost: false
    },
    builder: {
      maxCreeps: 3,
      bodyParts: { [CreepBodyPart.Work]: 4, [CreepBodyPart.Carry]: 4, [CreepBodyPart.Move]: 4 },
      useBoost: false
    },
    transporter: {
      maxCreeps: 1,
      bodyParts: { [CreepBodyPart.Carry]: 4, [CreepBodyPart.Move]: 2 },
      useBoost: false
    }
  },
  default: {
    harvester: {
      maxCreepsPerSource: 1,
      bodyParts: { [CreepBodyPart.Work]: 2, [CreepBodyPart.Carry]: 1, [CreepBodyPart.Move]: 1 },
      useBoost: false
    },
    builder: {
      maxCreeps: 2,
      bodyParts: { [CreepBodyPart.Work]: 2, [CreepBodyPart.Carry]: 1, [CreepBodyPart.Move]: 1 },
      useBoost: false
    },
    transporter: {
      maxCreeps: 1,
      bodyParts: { [CreepBodyPart.Carry]: 2, [CreepBodyPart.Move]: 2 },
      useBoost: false
    }
  }
};
