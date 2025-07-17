import { IController } from "controllers";
import { CreepRole, FlagType, PowerHarvesterCreep, PowerHarvesterMemory, PowerHarvesterState } from "models";
import { PowerHealerCreep, PowerHealerMemory, PowerHealerState } from "models/creeps/powerHealerModel";
import { spawnService } from "services/structures/spawnService";
import { findFlags, getUniqueId, recordCountToArray } from "utils";

class PowerHarvesterController implements IController {
  run(): void {
    this.spawnCreeps();

    // this.moveToFlag();

    this.boostPowerHarvester();

    this.doHeal();
    this.doHarvest();

    // this.doAttack();
  }

  moveToFlag() {
    const creeps = Object.values(Game.creeps).filter(
      x => x.memory.role === CreepRole.PowerHarvester || x.memory.role === CreepRole.PowerHealer
    );

    for (const creep of creeps) {
      const flag = Game.flags[creep.memory.flagName];
      if (!flag) continue;
      creep.travelTo(flag.pos);
    }
  }

  doHarvest() {
    const powerHarvesters = Object.values(Game.creeps).filter(x => x.memory.role === CreepRole.PowerHarvester);

    for (const powerHarvester of powerHarvesters) {
      const flag = Game.flags[powerHarvester.memory.flagName];
      if (!flag) continue;
      const powerBank = flag.pos.lookFor(LOOK_STRUCTURES).find(x => x.structureType === STRUCTURE_POWER_BANK);
      if (!powerBank) continue;
      if (powerHarvester.hits < powerHarvester.hitsMax) continue;

      // if (flag.name === "power1" && powerBank.hits < 2000) continue;

      const err = powerHarvester.attack(powerBank);
      if (err == ERR_NOT_IN_RANGE) powerHarvester.moveTo(powerBank);
    }
  }

  doAttack() {
    const powerHarvesters = Object.values(Game.creeps).filter(x => x.memory.role === CreepRole.PowerHarvester);

    for (const powerHarvester of powerHarvesters) {
      const flag = Game.flags[powerHarvester.memory.flagName];
      if (!flag) continue;

      const hostileHealCreep = powerHarvester.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: hostile => {
          return hostile.getActiveBodyparts(HEAL) > 0;
        }
      });

      if (hostileHealCreep) {
        const err = powerHarvester.attack(hostileHealCreep);
        if (err == ERR_NOT_IN_RANGE) powerHarvester.moveTo(hostileHealCreep);
        return;
      }

      const attackerCreep = powerHarvester.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: hostile => {
          return hostile.getActiveBodyparts(ATTACK) > 0;
        }
      });

      if (attackerCreep) {
        const err = powerHarvester.attack(attackerCreep);
        if (err == ERR_NOT_IN_RANGE) powerHarvester.moveTo(attackerCreep);
        return;
      }
    }
  }
  doHeal() {
    const powerHealers = Object.values(Game.creeps).filter(x => x.memory.role === CreepRole.PowerHealer);

    for (const powerHealer of powerHealers) {
      if (powerHealer.hits < powerHealer.hitsMax) {
        powerHealer.heal(powerHealer);
        continue;
      }
      const powerHarvester = Object.values(Game.creeps).find(
        x => x.memory.role === CreepRole.PowerHarvester && x.memory.flagName === powerHealer.memory.flagName
      );

      if (!powerHarvester) continue;
      const err = powerHealer.heal(powerHarvester);
      if (err == ERR_NOT_IN_RANGE) powerHealer.moveTo(powerHarvester);
    }
  }

  boostPowerHarvester() {
    const powerHarvesters1 = Object.values(Game.creeps).filter(
      x => x.memory.role === CreepRole.PowerHarvester && x.body.some(x => x.type === TOUGH && !x.boost)
    );
    const lab1 = Game.getObjectById("68659e498391330212dd3a6c") as StructureLab;

    for (const powerHarvester of powerHarvesters1) {
      powerHarvester.moveTo(lab1);
      lab1.boostCreep(powerHarvester);
    }

    const powerHarvesters2 = Object.values(Game.creeps).filter(
      x => x.memory.role === CreepRole.PowerHarvester && x.body.some(x => x.type === ATTACK && !x.boost)
    );
    const lab2 = Game.getObjectById("6865a526ff4607ae13eebbb6") as StructureLab;

    for (const powerHarvester of powerHarvesters2) {
      powerHarvester.moveTo(lab2);
      lab2.boostCreep(powerHarvester);
    }
  }

  updatePowerHarvester() {
    const creepCountPerFlag = this.getCreepCountPerFlag();
    const powerHarvesters = Object.values(Game.creeps).filter(x => x.memory.role === CreepRole.PowerHarvester);

    for (const powerHarvester of powerHarvesters) {
      if (!creepCountPerFlag[powerHarvester.memory.flagName]) continue;
    }
  }

  getCreepCountPerFlag() {
    const countCreepsByFlag = findFlags(FlagType.Power).reduce((acc, flag) => {
      if (!acc[flag.name]) acc[flag.name] = { harvesters: [], healers: [] };

      return acc;
    }, {} as Record<string, { harvesters: PowerHarvesterCreep[]; healers: PowerHealerCreep[] }>);

    const powerHarvesters = Object.values(Game.creeps).filter(
      x => x.memory.role === CreepRole.PowerHarvester
    ) as PowerHarvesterCreep[];

    for (const powerHarvester of powerHarvesters) {
      if (!countCreepsByFlag[powerHarvester.memory.flagName]) continue;

      countCreepsByFlag[powerHarvester.memory.flagName].harvesters.push(powerHarvester);
    }

    const powerHealers = Object.values(Game.creeps).filter(
      x => x.memory.role === CreepRole.PowerHealer
    ) as PowerHealerCreep[];

    for (const powerHelear of powerHealers) {
      if (!countCreepsByFlag[powerHelear.memory.flagName]) continue;

      countCreepsByFlag[powerHelear.memory.flagName].healers.push(powerHelear);
    }

    return countCreepsByFlag;
  }

  spawnCreeps(): void {
    const countCreepsByFlag = this.getCreepCountPerFlag();
    const needPowerHarvester = Object.entries(countCreepsByFlag).find(([flagName, { harvesters }]) => {
      if (harvesters.length < 1) return true;
      return false;
    });
    if (needPowerHarvester) this.spawnPowerHarvester(Game.flags[needPowerHarvester[0]]);

    const needPowerHealer = Object.entries(countCreepsByFlag).find(([flagName, { healers }]) => {
      if (healers.length < 2) return true;
      return false;
    });
    if (needPowerHealer) this.spawnPowerHealer(Game.flags[needPowerHealer[0]]);
  }

  spawnPowerHarvester(flag: Flag): void {
    const powerHarvesterBody = [
      TOUGH,
      TOUGH,
      TOUGH,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      ATTACK,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE
    ];
    spawnService.spawnClosestAvailable({
      target: { id: flag.name, pos: flag.pos },
      body: powerHarvesterBody,
      name: `${flag.name}-harvester-${getUniqueId()}`,
      opts: {
        memory: {
          role: CreepRole.PowerHarvester,
          flagName: flag.name,
          spawnId: "",
          state: PowerHarvesterState.Idle
        } as PowerHarvesterMemory
      }
    });
  }

  spawnPowerHealer(flag: Flag): void {
    const powerHealerBody = recordCountToArray({ [MOVE]: 13, [HEAL]: 13 });
    spawnService.spawnClosestAvailable({
      target: { id: flag.name, pos: flag.pos },
      body: powerHealerBody,
      name: `${flag.name}-healer-${getUniqueId()}`,
      opts: {
        memory: {
          role: CreepRole.PowerHealer,
          flagName: flag.name,
          spawnId: "",
          state: PowerHealerState.Idle
        } as PowerHealerMemory
      }
    });
  }
}

export const powerHarvesterController = new PowerHarvesterController();
