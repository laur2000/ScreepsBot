import { CreepBodyPart, CreepRole } from "models";

export const USER_NAME = "xXSefuXx";
export interface RoomServiceConfig {
  maxCreepsPerSource?: number;
  maxCreeps?: number;
  bodyParts: Partial<Record<CreepBodyPart, number>>;
  useBoost: boolean;
}

export const roomServiceConfig: Record<string, Partial<Record<CreepRole, RoomServiceConfig>>> = {
  W8S35: {
    harvester: {
      maxCreepsPerSource: 2,
      bodyParts: { [CreepBodyPart.Work]: 4, [CreepBodyPart.Carry]: 1, [CreepBodyPart.Move]: 2 },
      useBoost: false
    },
    builder: {
      maxCreeps: 3,
      bodyParts: { [CreepBodyPart.Work]: 6, [CreepBodyPart.Carry]: 4, [CreepBodyPart.Move]: 5 },
      useBoost: false
    },
    transporter: {
      maxCreeps: 3,
      bodyParts: { [CreepBodyPart.Carry]: 6, [CreepBodyPart.Move]: 3 },
      useBoost: false
    },
    hauler: {
      maxCreepsPerSource: 1,
      bodyParts: { [CreepBodyPart.Work]: 4, [CreepBodyPart.Carry]: 10, [CreepBodyPart.Move]: 7 },
      useBoost: false
    },
    soldier: {
      bodyParts: { [CreepBodyPart.Attack]: 15, [CreepBodyPart.Move]: 15 },
      useBoost: false
    },
    reserver: {
      maxCreepsPerSource: 0,
      bodyParts: {
        [CreepBodyPart.Claim]: 2,
        [CreepBodyPart.Move]: 2
      },
      useBoost: false
    }
  },
  W7S35: {
    harvester: {
      maxCreepsPerSource: 1,
      bodyParts: { [CreepBodyPart.Work]: 7, [CreepBodyPart.Carry]: 1, [CreepBodyPart.Move]: 2 },
      useBoost: false
    },
    builder: {
      maxCreeps: 3,
      bodyParts: { [CreepBodyPart.Work]: 7, [CreepBodyPart.Carry]: 4, [CreepBodyPart.Move]: 6 },
      useBoost: false
    },
    transporter: {
      maxCreeps: 2,
      bodyParts: { [CreepBodyPart.Carry]: 8, [CreepBodyPart.Move]: 4 },
      useBoost: false
    },
    hauler: {
      maxCreepsPerSource: 1,
      bodyParts: { [CreepBodyPart.Work]: 4, [CreepBodyPart.Carry]: 8, [CreepBodyPart.Move]: 7 },
      useBoost: false
    },
    soldier: {
      bodyParts: { [CreepBodyPart.Attack]: 10, [CreepBodyPart.Move]: 10 },
      useBoost: false
    },
    reserver: {
      maxCreepsPerSource: 1,
      bodyParts: {
        [CreepBodyPart.Claim]: 2,
        [CreepBodyPart.Move]: 2
      },
      useBoost: false
    }
  },
  W7S34: {
    hauler: {
      maxCreepsPerSource: 2,
      bodyParts: {},
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
    },
    hauler: {
      maxCreepsPerSource: 1,
      bodyParts: { [CreepBodyPart.Work]: 1, [CreepBodyPart.Carry]: 2, [CreepBodyPart.Move]: 2 },
      useBoost: false
    },
    soldier: {
      bodyParts: { [CreepBodyPart.Tough]: 2, [CreepBodyPart.Attack]: 2, [CreepBodyPart.Move]: 2 },
      useBoost: false
    },
    reserver: {
      maxCreepsPerSource: 1,
      bodyParts: {
        [CreepBodyPart.Claim]: 2,
        [CreepBodyPart.Move]: 2
      },
      useBoost: false
    }
  },
  external: {
    hauler: {
      maxCreepsPerSource: 2,
      useBoost: false,
      bodyParts: {}
    }
  }
};
