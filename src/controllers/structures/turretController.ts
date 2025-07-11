import { IController } from "controllers";
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
      const structures = tower.room.find(FIND_STRUCTURES, {
        filter: structure => {
          const needsRepair = structure.hits < structure.hitsMax && structure.hits < 310000;
          const isWall = structure.structureType === STRUCTURE_WALL;
          const isRampart = structure.structureType === STRUCTURE_RAMPART;
          return needsRepair && !isWall;
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
