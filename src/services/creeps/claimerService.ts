import { claimerRepository, IClaimerRepository } from "repositories";
import { findFlag, getUniqueId, recordCountToArray, throttleTicks } from "utils";
import { ClaimerCreep, ClaimerMemory, ClaimerState, CreepBodyPart, CreepRole, FlagType } from "models";
import { ABaseService, TSpawnCreepResponse } from "services";
import profiler from "utils/profiler";

class ClaimerService extends ABaseService<ClaimerCreep> {
  MIN_CREEPS_TTL = 60;
  public constructor(private claimerRepository: IClaimerRepository) {
    super(claimerRepository);
  }

  override execute(claimer: ClaimerCreep): void {
    this.updateClaimerState(claimer);
    this.executeClaimerState(claimer);
  }

  override needMoreCreeps(spawn: StructureSpawn): boolean {
    if (!throttleTicks(10)) return false;
    const creepCount = this.claimerRepository.countCreepsInSpawn(spawn.id);
    const claimCount = this.claimerRepository.countClaimFlags();
    return creepCount < claimCount;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const harvesterName = `claimer-${spawn.name}-${getUniqueId()}`;

    const bodyParts: Partial<Record<CreepBodyPart, number>> = {
      [CreepBodyPart.Claim]: 1,
      [CreepBodyPart.Work]: 2,
      [CreepBodyPart.Carry]: 4,
      [CreepBodyPart.Move]: 7
    };
    const res = spawn.spawnCreep(recordCountToArray(bodyParts), harvesterName, {
      memory: { role: CreepRole.Claimer, spawnId: spawn.id, state: ClaimerState.Collecting } as ClaimerMemory
    });

    return res as TSpawnCreepResponse;
  }

  private updateClaimerState(creep: ClaimerCreep): void {
    switch (creep.memory.state) {
      case ClaimerState.Collecting:
        if (creep.store.getFreeCapacity() === 0) {
          creep.memory.state = ClaimerState.Claiming;
        }
        break;
      case ClaimerState.Claiming:
        const claimFlag = findFlag(FlagType.Claim);
        const isControllerClaimed = claimFlag?.room?.controller?.my;
        if (isControllerClaimed) {
          creep.memory.state = ClaimerState.Upgrading;
        }
        break;
      case ClaimerState.Upgrading:
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
          const claimFlag = findFlag(FlagType.Claim);
          claimFlag?.remove();
          creep.memory.state = ClaimerState.Recycling;
        }
        break;
      case ClaimerState.Recycling:
        break;
      default:
        creep.memory.state = ClaimerState.Collecting;
    }
  }

  private executeClaimerState(creep: ClaimerCreep): void {
    const moveFlag = findFlag("move" as any);
    if (moveFlag) {
      creep.travelTo(moveFlag);
      if (creep.pos.getRangeTo(moveFlag) < 2) {
        // moveFlag.remove();
      }
      return;
    }
    const skCreep = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
      filter: (sk: Creep) => creep.pos.getRangeTo(sk) < 6
    });
    if (skCreep) {
      creep.fleeFrom([skCreep], 6);
      return;
    }
    switch (creep.memory.state) {
      case ClaimerState.Collecting:
        this.doCollect(creep);
        break;
      case ClaimerState.Claiming:
        this.doClaim(creep);
        break;
      case ClaimerState.Upgrading:
        this.doUpgrade(creep);
        break;
      case ClaimerState.Recycling:
        this.doRecycle(creep);
        break;
    }
  }

  private doCollect(creep: ClaimerCreep): void {
    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: structure => {
        switch (structure.structureType) {
          case STRUCTURE_STORAGE:
            return structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
          default:
            return false;
        }
      }
    });
    if (!target) return;
    this.actionOrMove(creep, () => creep.withdraw(target, RESOURCE_ENERGY), target);
  }

  private doUpgrade(creep: ClaimerCreep): void {
    const claimFlag = findFlag(FlagType.Claim);
    const controller = claimFlag?.room?.controller || creep.room.controller;
    if (!controller) return;
    this.actionOrMove(creep, () => creep.upgradeController(controller), controller);
  }

  private doClaim(creep: ClaimerCreep): void {
    const claimFlag = findFlag(FlagType.Claim);

    if (!claimFlag) return;

    const claimRoom = claimFlag.room;
    if (!claimRoom) {
      this.move(creep, claimFlag);
      return;
    }

    const controller = claimFlag.room?.controller;
    if (!controller) return;

    this.actionOrMove(creep, () => creep.claimController(controller), controller);
  }
}
profiler.registerClass(ClaimerService, "ClaimerService");

export const claimerService = new ClaimerService(claimerRepository);
