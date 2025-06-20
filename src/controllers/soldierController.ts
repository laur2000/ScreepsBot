import { IService } from "services/service";
import { IController } from "./controller";
import { SoldierCreep } from "repositories/soldierRepository";
import { soldierService } from "services/soldierService";

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

export const soldierController = new SoldierController(soldierService);
