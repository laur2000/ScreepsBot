import { IController } from "./controller";

class TurretController implements IController {
  run(): void {
    // Repair all structures in the room
    for (const tower of Object.values(Game.structures).filter(
      s => s.structureType === STRUCTURE_TOWER
    ) as StructureTower[]) {
      const enemies = tower.room.find(FIND_HOSTILE_CREEPS);
      for (const enemy of enemies) {
        tower.attack(enemy);
      }
      const structures = tower.room.find(FIND_STRUCTURES, {
        filter: structure => structure.hits < structure.hitsMax
      });
      for (const structure of structures) {
        tower.repair(structure);
      }
    }
  }
}

export const turretController = new TurretController();
