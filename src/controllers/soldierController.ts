import { IController } from "./controller";

class SoldierController implements IController {
  run(): void {
    // do nothing
  }
}

export const soldierController = new SoldierController();
