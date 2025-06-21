import { IService } from "services/service";
import { IController } from "../controller";
import { HaulerCreep } from "repositories/haulerRepository";
import { HaulerService, haulerService } from "services/haulerService";

class HaulerController implements IController {
  constructor(private haulerService: HaulerService) {}
  run(): void {
    const needMoreCreeps = this.haulerService.needMoreCreeps();
    if (needMoreCreeps) {
      const err = this.haulerService.spawn();
    }
    for (const spawn of Object.values(Game.spawns)) {
      for (const hauler of this.haulerService.getCreeps(spawn)) {
        this.haulerService.execute(hauler);
      }
    }
  }
}

export const haulerController = new HaulerController(haulerService);
