import { IController } from "./controller";

class TurretController implements IController {
  run(): void {
    // do nothing
  }
}

export const turretController = new TurretController();
