// import { CreepRole, FlagType, RangerCreep, RangerMemory, RangerState } from "models";
// import { rangerRepository, IRangerRepository, IFindRepository, findRepository } from "repositories";
// import { ABaseService, roomServiceConfig, TSpawnCreepResponse } from "services";
// import { findFlag, getCreepConfigPerRoom, getUniqueId, recordCountToArray } from "utils";

// export class RangerService extends ABaseService<RangerCreep> {
//   constructor(private rangerRepository: IRangerRepository, private findRepository: IFindRepository) {
//     super(rangerRepository);
//   }

//   needMoreCreeps(): boolean {
//     return false;
//   }

//   override spawn(): TSpawnCreepResponse {
//     const name = `ranger-${getUniqueId()}`;
//     const rangeFlag = findFlag(FlagType.Range);
//     if (!rangeFlag) return ERR_BUSY;

//     const result = this.findRepository.findClosestSpawnOfTarget({ id: name as any, pos: rangeFlag.pos });
//     if (!result) return ERR_BUSY;

//     const { closestSpawn, closestAvailableSpawn } = result;

//     const rangerConfig = getCreepConfigPerRoom(CreepRole.Ranger, closestAvailableSpawn.room);

//     closestAvailableSpawn.spawnCreep(recordCountToArray(rangerConfig.bodyParts), name, {
//       memory: {
//         role: CreepRole.Ranger,
//         spawnId: closestSpawn.id,
//         state: RangerState.Harvesting,
//       } as RangerMemory
//     });

//     return OK;
//   }

//   override execute(ranger: RangerCreep): void {
//     this.updateRangerState(ranger);
//     this.executeRangerState(ranger);
//   }

//   private updateRangerState(creep: RangerCreep): void {
//     switch (creep.memory.state) {
//       case RangerState.Harvesting:
//         if (creep.store.getFreeCapacity() < 3) {
//           creep.memory.state = RangerState.Transferring;
//         }
//         break;
//       case RangerState.Transferring:
//         if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
//           creep.memory.state = RangerState.Harvesting;
//         }
//         break;
//       case RangerState.Recycling:
//         break;
//       default:
//         creep.memory.state = RangerState.Harvesting;
//     }

//     if ((creep.ticksToLive || this.MIN_CREEPS_TTL) < this.MIN_CREEPS_TTL) {
//       creep.memory.state = RangerState.Recycling;
//     }
//   }

//   private executeRangerState(creep: RangerCreep): void {
//     switch (creep.memory.state) {
//       case RangerState.Harvesting:
//         this.doHarvest(creep);
//         break;
//       case RangerState.Transferring:
//         this.doTransfer(creep);
//         break;
//       case RangerState.Recycling:
//         this.doRecycle(creep);
//         break;
//     }
//   }

//   private doHarvest(ranger: RangerCreep): void {
//     if (!ranger.memory.harvestTargetId) return;
//     const target = Game.getObjectById(ranger.memory.harvestTargetId) as Source | Deposit | Mineral;
//     if (!target) return;
//     const err = this.actionOrMove(ranger, () => ranger.harvest(target), target);
//   }

//   private doTransfer(creep: RangerCreep): void {
//     const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
//       filter: structure => {
//         switch (structure.structureType) {
//           case STRUCTURE_CONTAINER:
//           case STRUCTURE_STORAGE:
//           case STRUCTURE_SPAWN:
//           case STRUCTURE_EXTENSION:
//             return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
//           case STRUCTURE_LINK:
//             return (
//               structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
//             );

//           // case STRUCTURE_CONTROLLER:
//           //   return structure.my;
//           default:
//             return false;
//         }
//       }
//     });
//     if (!target) return;

//     if (creep.store.getUsedCapacity(RESOURCE_HYDROGEN) > 0) {
//       this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_HYDROGEN), target);
//     } else {
//       this.actionOrMove(creep, () => creep.transfer(target, RESOURCE_ENERGY), target);
//     }
//   }
// }

// export const rangerService = new RangerService(rangerRepository, findRepository);
