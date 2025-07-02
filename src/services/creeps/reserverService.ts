import { CreepRole, FlagType, ReserverCreep, ReserverMemory, ReserverState } from "models";
import { reserverRepository, IReserverRepository } from "repositories";
import { roomServiceConfig, ABaseService, TSpawnCreepResponse, USER_NAME } from "services";
import { findFlags, getUniqueId, isMyUsername, recordCountToArray } from "utils";
class ReserverService extends ABaseService<ReserverCreep> {
  MIN_CREEPS_TTL = 60;
  MAX_CREEPS_PER_SOURCE = 1;
  public constructor(private reserverRepository: IReserverRepository) {
    super(reserverRepository);
  }

  override execute(reserver: ReserverCreep): void {
    this.updateReserverState(reserver);
    this.executeReserverState(reserver);
  }

  override needMoreCreeps(spawn: StructureSpawn): boolean {
    const target = this.getAvailableTarget();
    return !!target;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const harvesterName = `reserver-${spawn.name}-${getUniqueId()}`;

    const { reserver } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;
    const target = this.getAvailableTarget();
    if (!target) return ERR_BUSY;
    const res = spawn.spawnCreep(recordCountToArray(reserver!.bodyParts), harvesterName, {
      memory: {
        role: CreepRole.Reserver,
        spawnId: spawn.id,
        state: ReserverState.Reserving,
        targetId: target
      } as ReserverMemory
    });

    return res as TSpawnCreepResponse;
  }

  countCreepsAssignedToTarget() {
    const reserverCreeps = this.reserverRepository.getCreeps("");

    const countByTarget: Record<string, number> = {};
    const reserveFlags = findFlags(FlagType.Reserve).map(flag => flag.name);

    for (const flagName of reserveFlags) {
      countByTarget[flagName] = 0;
    }

    for (const reserver of reserverCreeps) {
      const targetId = reserver.memory.targetId;
      if (!targetId) continue;
      countByTarget[targetId] = (countByTarget[targetId] || 0) + 1;
    }
    return countByTarget;
  }

  getAvailableTarget(): string | null {
    const countByTarget = this.countCreepsAssignedToTarget();

    const availableTargets = Object.keys(countByTarget).filter(targetId => {
      const isAvailabe = countByTarget[targetId] < this.MAX_CREEPS_PER_SOURCE;

      if (!isAvailabe) return false;
      const reserveFlag = Game.flags[targetId];

      if (!reserveFlag) return false;

      const room = reserveFlag.room;

      if (!room) return true;

      const controller = room.controller;

      if (!controller || (controller.reservation?.ticksToEnd || 0) > 3000) return false;
      return true;
    });
    return availableTargets[0] || null;
  }

  private updateReserverState(creep: ReserverCreep): void {
    switch (creep.memory.state) {
      case ReserverState.Reserving:
        break;
      case ReserverState.Recycling:
        break;
      default:
        creep.memory.state = ReserverState.Reserving;
    }
  }

  private executeReserverState(creep: ReserverCreep): void {
    switch (creep.memory.state) {
      case ReserverState.Reserving:
        this.doReserve(creep);
        break;
      case ReserverState.Recycling:
        this.doRecycle(creep);
        break;
    }
  }

  private doReserve(creep: ReserverCreep): void {
    if (!creep.memory.targetId) return;
    const reserveFlag = Game.flags[creep.memory.targetId];
    if (!reserveFlag) return;

    const room = reserveFlag.room;
    if (!room) {
      this.move(creep, reserveFlag);
      return;
    }

    const controller = room.controller;
    if (!controller) return;

    if (controller.reservation && !isMyUsername(controller.reservation.username)) {
      const err = this.actionOrMove(creep, () => creep.attackController(controller), controller);
    } else {
      const err = this.actionOrMove(creep, () => creep.reserveController(controller), controller);
    }
  }
}

export const reserverService = new ReserverService(reserverRepository);
