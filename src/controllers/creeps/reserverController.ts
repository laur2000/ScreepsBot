import { IController } from "controllers";
import { ReserverCreep } from "models";
import { IService, reserverService } from "services";
import profiler from "utils/profiler";


class ReserverController implements IController {
  public constructor(private reserverService: IService<ReserverCreep>) {}
  run(): void {
    for (const spawn of Object.values(Game.spawns)) {
      if (this.reserverService.needMoreCreeps(spawn)) {
        this.reserverService.spawn(spawn);
      }

      for (const reserver of this.reserverService.getCreeps(spawn)) {
        this.reserverService.execute(reserver);
      }
    }
  }
}
profiler.registerClass(ReserverController, "ReserverController");

export const reserverController = new ReserverController(reserverService);
