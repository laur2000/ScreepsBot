import {
  ReserverCreep,
  ReserverMemory,
  reserverRepository,
  ReserverState,
  IReserverRepository
} from "repositories/reserverRepository";
import { ABaseService, TSpawnCreepResponse } from "./service";
import { CreepBodyPart, CreepRole } from "repositories/repository";
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
    return creepCount < reserveCount;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const harvesterName = `reserver-${spawn.name}-${getUniqueId()}`;

    const bodyParts: Partial<Record<CreepBodyPart, number>> = {
      [CreepBodyPart.Claim]: 2,
      [CreepBodyPart.Move]: 2
    };
    const res = spawn.spawnCreep(recordCountToArray(bodyParts), harvesterName, {
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

    this.actionOrMove(creep, () => creep.reserveController(controller), controller);
  }
}

export const reserverService = new ReserverService(reserverRepository);
