


import { linkController } from './linkController';
import { terminalController } from './terminalController';
import { turretController } from './turretController';




class StructuresController {
    run() {
        linkController.run();
        terminalController.run();
        turretController.run();
    }
}


export const structuresController = new StructuresController();
