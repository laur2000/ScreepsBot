import { IController } from "controllers/controller";
import { IService } from "services/service";
import { reserverService } from "services/reserverService";
import { ReserverCreep } from "repositories/reserverRepository";

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

export const reserverController = new ReserverController(reserverService);
