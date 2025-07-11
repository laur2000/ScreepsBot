import { IController } from "controllers";
import { SoldierCreep } from "models";
import { IService, soldierService } from "services";
import profiler from "utils/profiler";

class SoldierController implements IController {
  constructor(private soldierService: IService<SoldierCreep>) {}
  run(): void {
    for (const spawn of Object.values(Game.spawns)) {
      const needMoreCreeps = this.soldierService.needMoreCreeps(spawn);
      if (needMoreCreeps) {
        const err = this.soldierService.spawn(spawn);
      }

      for (const soldier of this.soldierService.getCreeps(spawn)) {
        this.soldierService.execute(soldier);
      }
    }
  }
}
profiler.registerClass(SoldierController, "SoldierController");

export const soldierController = new SoldierController(soldierService);
