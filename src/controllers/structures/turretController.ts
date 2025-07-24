import { IController } from "controllers";
import { towerRoomConfig } from "services";
import profiler from "utils/profiler";

class TurretController implements IController {
  run(): void {
    // Repair all structures in the room
    for (const tower of Object.values(Game.structures).filter(
      s => s.structureType === STRUCTURE_TOWER
    ) as StructureTower[]) {
      const [hasHealer] = tower.room.find(FIND_HOSTILE_CREEPS, {
        filter: creep => creep.getActiveBodyparts(HEAL) > 0
      });
      const enemy = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: creep => {
          const isRevenge = creep.owner?.username === "Revenge";
          if (hasHealer) {
            return !isRevenge && creep.getActiveBodyparts(HEAL) > 0;
          }
          return !isRevenge;
        }
      });
      const { wallMaxHits, rampartMaxHits } = towerRoomConfig[tower.room.name] || towerRoomConfig.default;
      const structures = tower.room.find(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_RAMPART:
              return structure.hits < rampartMaxHits;
            case STRUCTURE_WALL:
              return structure.hits < wallMaxHits;
            default:
              return structure.hits < structure.hitsMax;
          }
        }
      });

      structures.sort((a, b) => a.hits - b.hits);

      if (structures[0]) {
        tower.repair(structures[0]);
        continue;
      }
      if (enemy) {
        tower.attack(enemy);
        continue;
      }
    }
  }
}
profiler.registerClass(TurretController, "TurretController");

export const turretController = new TurretController();
