import { IController } from "./controller";
import { builderService } from "../services/builderService";
import { IService } from "services/service";
import { BuilderCreep } from "repositories/builderRepository";
class BuilderController implements IController {
  public constructor(private builderService: IService<BuilderCreep>) {}
  run(): void {
    for (const spawn of Object.values(Game.spawns)) {
      if (builderService.needMoreCreeps(spawn)) {
        builderService.spawn(spawn);
      }

      for (const builder of builderService.getCreeps(spawn)) {
        builderService.execute(builder);
      }
    }
  }
}

export const builderController = new BuilderController(builderService);
