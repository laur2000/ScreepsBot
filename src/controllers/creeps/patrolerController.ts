import { IController } from "controllers";
import { CreepRole, FlagType, PatrolerCreep, PatrolerMemory, PatrolerState } from "models";
import { findRepository } from "repositories";
import { spawnService } from "services/structures/spawnService";
import { findFlags } from "utils";
import "utils/Movement";
import profiler from "utils/profiler";

const patrolerBody = [
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
  MOVE,
  MOVE,
  RANGED_ATTACK,
  RANGED_ATTACK,
  RANGED_ATTACK,
  RANGED_ATTACK,
  RANGED_ATTACK,
  RANGED_ATTACK,
  RANGED_ATTACK,
  RANGED_ATTACK,
  RANGED_ATTACK,
  RANGED_ATTACK,
  HEAL,
  HEAL,
  HEAL,
  HEAL,
  HEAL,
  HEAL,
  HEAL,
  HEAL,
  HEAL,
  HEAL
];
class PatrolerController implements IController {
  constructor() {}
  run(): void {
    this.spawnPatroler();
    this.updatePatrolerState();
    this.executePatrolerState();
  }

  getSourceKeepersGroups() {
    return findFlags(FlagType.SK).reduce((acc, flag) => {
      const lair = flag.pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_KEEPER_LAIR) as
        | StructureKeeperLair
        | undefined;

      if (!lair) return acc;

      const [_, id] = flag.name.split(",");

      if (!acc[id]) {
        acc[id] = [];
      }

      acc[id].push(lair);
      return acc;
    }, {} as Record<string, StructureKeeperLair[]>);
  }

  getPatrolerCreeps({ willDie }: { willDie: boolean }) {
    return Object.values(Game.creeps).filter(
      (creep: Creep) => creep.memory.role === CreepRole.Patroler && ((creep.ticksToLive ?? 0) > 350 || !willDie)
    ) as PatrolerCreep[];
  }

  findAvailableSKGroup() {
    const skGroups = this.getSourceKeepersGroups();
    const patrolerCreeps = this.getPatrolerCreeps({ willDie: true });

    return Object.entries(skGroups).find(([id]) => !patrolerCreeps.find(creep => creep.memory.groupId === id)) ?? [];
  }

  spawnPatroler() {
    const [availableGroup, sks] = this.findAvailableSKGroup();

    if (!availableGroup || !sks) return;

    spawnService.spawnClosestAvailable({
      target: sks[0],
      body: patrolerBody,
      name: `patroler-${availableGroup}`,
      opts: {
        memory: {
          role: CreepRole.Patroler,
          groupId: availableGroup,
          spawnId: "",
          state: PatrolerState.Patroling
        } as PatrolerMemory
      }
    });
  }

  updatePatrolerState() {
    const patrolerCreeps = this.getPatrolerCreeps({ willDie: false });
    const skGroups = this.getSourceKeepersGroups();

    for (const creep of patrolerCreeps) {
      const skGroup = skGroups[creep.memory.groupId];
      if (!skGroup) return;
      switch (creep.memory.state) {
        case PatrolerState.Patroling:
          const closestSpawningSk = skGroup.sort((a, b) => (a.ticksToSpawn ?? 0) - (b.ticksToSpawn ?? 0))[0];
          if (closestSpawningSk.pos.getRangeTo(creep) < 3) {
            creep.memory.state = PatrolerState.Attacking;
          }
          const closestEnemy = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
          if (closestEnemy && closestEnemy.pos.getRangeTo(creep) < 5) {
            creep.memory.state = PatrolerState.Attacking;
          }
          break;
        case PatrolerState.Attacking:
          const closestSk = skGroup.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep))[0];
          const [skCreep] = closestSk.pos.findInRange(FIND_HOSTILE_CREEPS, 6);
          if (!skCreep) {
            creep.memory.state = PatrolerState.Patroling;
          }
          break;
        case PatrolerState.Recycling:
          break;
        default:
          creep.memory.state = PatrolerState.Patroling;
      }
    }
  }

  executePatrolerState() {
    const patrolerCreeps = this.getPatrolerCreeps({ willDie: false });

    for (const creep of patrolerCreeps) {
      switch (creep.memory.state) {
        case PatrolerState.Patroling:
          this.doPatrol(creep);
          break;
        case PatrolerState.Attacking:
          this.doAttack(creep);
          break;
        case PatrolerState.Recycling:
          this.doRecycle(creep);
      }
    }
  }

  doRecycle(creep: PatrolerCreep) {
    const closestSpawn = findRepository.findClosestSpawn(Object.values(Game.spawns), creep);
    if (!closestSpawn) return;
    creep.travelTo(closestSpawn);
    closestSpawn.recycleCreep(creep);
  }

  doPatrol(creep: PatrolerCreep) {
    const skGroups = this.getSourceKeepersGroups();
    const skGroup = skGroups[creep.memory.groupId];
    if (!skGroup) return;
    const sk = skGroup.sort((a, b) => (a.ticksToSpawn ?? 0) - (b.ticksToSpawn ?? 0))[0];
    creep.heal(creep);

    creep.travelTo(sk, {
      allowSK: true,
      range: 2
    });

    creep.healClosestAlly();
  }

  doAttack(creep: PatrolerCreep) {
    const skCreep = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: sk => sk.pos.getRangeTo(creep) < 6 });

    if (!skCreep) {
      creep.healClosestAlly();
      return;
    }

    creep.heal(creep);
    creep.kiteAttack(skCreep);
  }
}
profiler.registerClass(PatrolerController, "PatrolerController");

export const patrolerController = new PatrolerController();
