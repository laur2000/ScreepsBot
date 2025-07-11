import { IController } from "controllers";
import { ILinkService, linkService } from "services/structures/linkService";
import profiler from "utils/profiler";

class LinkController implements IController {
  public constructor(private linkService: ILinkService) {}
  run(): void {
    Memory.links = Memory.links || {};
    for (const room of Object.values(Game.rooms)) {
      this.linkService.executeRoom(room);
    }
  }
}
profiler.registerClass(LinkController, "LinkController");

export const linkController = new LinkController(linkService);
