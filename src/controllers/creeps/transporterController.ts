import { IController } from "controllers";
import { TransporterCreep } from "models";
import { IService, transporterService } from "services";
import { measureCpu } from "utils";
import profiler from "utils/profiler";

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
profiler.registerClass(TransporterController, "TransporterController");

export const transporterController = new TransporterController(transporterService);
