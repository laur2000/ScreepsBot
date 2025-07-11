import { CreepRole, SoldierCreep, SoldierMemory, SoldierState } from "models";
import { ISoldierRepository, soldierRepository } from "repositories";
import { roomServiceConfig } from "services/roomServiceConfig";
import { ABaseService, TSpawnCreepResponse } from "services";
import { getUniqueId, recordCountToArray } from "utils";
import profiler from "utils/profiler";

class SoldierService extends ABaseService<SoldierCreep> {
  MIN_CREEPS_TTL = 60;
  public constructor(private soldierRepository: ISoldierRepository) {
    super(soldierRepository);
  }

  override execute(soldier: SoldierCreep): void {
    this.updateSoldierState(soldier);
    this.executeSoldierState(soldier);
  }

  override needMoreCreeps(spawn: StructureSpawn): boolean {
    const creepCount = this.soldierRepository.countCreepsInSpawn(spawn.id);
    const enemiesCount = this.soldierRepository.countEnemiesInRooms();
    return creepCount < enemiesCount;
  }

  override spawn(spawn: StructureSpawn): TSpawnCreepResponse {
    const harvesterName = `soldier-${spawn.name}-${getUniqueId()}`;
    const soldier = roomServiceConfig[spawn.room.name].soldier || roomServiceConfig.default.soldier;

    const res = spawn.spawnCreep(recordCountToArray(soldier!.bodyParts), harvesterName, {
      memory: { role: CreepRole.Soldier, spawnId: spawn.id, state: SoldierState.Attacking } as SoldierMemory
    });

    return res as TSpawnCreepResponse;
  }

  private updateSoldierState(creep: SoldierCreep): void {
    const enemiesCount = this.soldierRepository.countEnemiesInRooms();

    switch (creep.memory.state) {
      case SoldierState.Attacking:
        if (enemiesCount === 0) {
          creep.memory.state = SoldierState.Recycling;
        }
        break;

      case SoldierState.Recycling:
        if (enemiesCount > 0) {
          creep.memory.state = SoldierState.Attacking;
        }
        break;
      default:
        creep.memory.state = SoldierState.Attacking;
    }
  }

  private executeSoldierState(creep: SoldierCreep): void {
    switch (creep.memory.state) {
      case SoldierState.Attacking:
        this.doAttack(creep);
        break;

      case SoldierState.Recycling:
        this.doRecycle(creep);
        break;
    }
  }

  private doAttack(creep: SoldierCreep): void {
    let enemy: AnyCreep | StructureInvaderCore | null = null;
    for (const room of Object.values(Game.rooms)) {
      enemy = room.find(FIND_HOSTILE_CREEPS)[0];
      if (enemy) break;

      enemy = room.find(FIND_HOSTILE_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_INVADER_CORE
      })[0] as StructureInvaderCore;
      if (enemy) break;
    }

    if (!enemy) return;

    this.actionOrMove(creep, () => creep.attack(enemy!), enemy);
  }
}
profiler.registerClass(SoldierService, "SoldierService");

export const soldierService = new SoldierService(soldierRepository);
