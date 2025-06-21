import { CreepRole, ReserverCreep, ReserverMemory, ReserverState } from "models";
import { reserverRepository, IReserverRepository } from "repositories";
import { roomServiceConfig, ABaseService, TSpawnCreepResponse, USER_NAME } from "services";
import { getUniqueId, recordCountToArray } from "utils";
class ReserverService extends ABaseService<ReserverCreep> {
  MIN_CREEPS_TTL = 60;
  public constructor(private reserverRepository: IReserverRepository) {
    super(reserverRepository);
  }

  override execute(reserver: ReserverCreep): void {
    this.updateReserverState(reserver);
    this.executeReserverState(reserver);
  }

  override needMoreCreeps(spawn: StructureSpawn): boolean {
    const creepCount = this.reserverRepository.countCreepsInSpawn(spawn.id);
    const reserveCount = this.reserverRepository.countReserveFlags();
    const { reserver } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;
    const maxCreepsPerSource = reserver?.maxCreepsPerSource ?? 1;
    return creepCount < reserveCount * maxCreepsPerSource;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const harvesterName = `reserver-${spawn.name}-${getUniqueId()}`;

    const { reserver } = roomServiceConfig[spawn.room.name] || roomServiceConfig.default;

    const res = spawn.spawnCreep(recordCountToArray(reserver!.bodyParts), harvesterName, {
      memory: { role: CreepRole.Reserver, spawnId: spawn.id, state: ReserverState.Reserving } as ReserverMemory
    });

    return res as TSpawnCreepResponse;
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
    const [reserveFlag] = this.reserverRepository.getReserveFlags();

    if (!reserveFlag) return;

    const room = reserveFlag.room;
    if (!room) {
      this.move(creep, reserveFlag);
      return;
    }

    const controller = room.controller;
    if (!controller) return;

    if (controller.reservation && controller.reservation.username !== USER_NAME) {
      const err = this.actionOrMove(creep, () => creep.attackController(controller), controller);
    } else {
      const err = this.actionOrMove(creep, () => creep.reserveController(controller), controller);
    }
  }
}

export const reserverService = new ReserverService(reserverRepository);
