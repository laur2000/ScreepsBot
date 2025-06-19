import { IService } from "services/service";
import { IController } from "./controller";
import { HaulerCreep } from "repositories/haulerRepository";
import { haulerService } from "services/haulerService";

class HaulerController implements IController {
  constructor(private haulerService: IService<HaulerCreep>) {}
  run(): void {
    for (const spawn of Object.values(Game.spawns)) {
      const needMoreCreeps = this.haulerService.needMoreCreeps(spawn);
      if (needMoreCreeps) {
        const err = this.haulerService.spawn(spawn);
      }

      for (const hauler of this.haulerService.getCreeps(spawn)) {
        this.haulerService.execute(hauler);
      }
    }
  }
}

export const haulerController = new HaulerController(haulerService);
