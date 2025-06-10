import { TransporterCreep } from "repositories/transporterRepository";
import { IController } from "./controller";
import { IService } from "services/service";
import { transporterService } from "services/transporterService";
class TransporterController implements IController {
  public constructor(private transporterService: IService<TransporterCreep>) {}
  run(): void {
    for (const spawn of Object.values(Game.spawns)) {
      if (this.transporterService.needMoreCreeps(spawn)) {
        this.transporterService.spawn(spawn);
      }

      for (const transporter of this.transporterService.getCreeps(spawn)) {
        this.transporterService.execute(transporter);
      }
    }
  }
}

export const transporterController = new TransporterController(transporterService);
