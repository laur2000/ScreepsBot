import { creepsController, globalController, structuresController } from "controllers";
import { ErrorMapper, measureCpu, tryRun } from "utils";
import { CacheFor } from "utils/cache";
import profiler from "utils/profiler";
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code

profiler.enable();
// export const loop = ErrorMapper.wrapLoop(() => {
//   creepsController.run();
//   globalController.run();
//   structuresController.run();
// });

const originalHarvestFn = Creep.prototype.harvest;

Creep.prototype.harvest = function (target) {
  const startCpu = Game.cpu.getUsed();
  const res = originalHarvestFn.call(this, target);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.harvest += cpuUsed;
  return res;
};

const originalTransferFn = Creep.prototype.transfer;
Creep.prototype.transfer = function (target, resourceType) {
  const startCpu = Game.cpu.getUsed();
  const res = originalTransferFn.call(this, target, resourceType);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.transfer += cpuUsed;
  return res;
};

const originalWithdrawFn = Creep.prototype.withdraw;
Creep.prototype.withdraw = function (target, resourceType) {
  const startCpu = Game.cpu.getUsed();
  const res = originalWithdrawFn.call(this, target, resourceType);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.withdraw += cpuUsed;
  return res;
};

const originalBuildFn = Creep.prototype.build;
Creep.prototype.build = function (target) {
  const startCpu = Game.cpu.getUsed();
  const res = originalBuildFn.call(this, target);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.build += cpuUsed;
  return res;
};

const originalMoveFn = Creep.prototype.move;
Creep.prototype.move = function (target: any) {
  const startCpu = Game.cpu.getUsed();
  const res = originalMoveFn.call(this, target) as any;
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.move += cpuUsed;
  return res;
};

const originalUpgradeFn = Creep.prototype.upgradeController;
Creep.prototype.upgradeController = function (target) {
  const startCpu = Game.cpu.getUsed();
  const res = originalUpgradeFn.call(this, target);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.upgrade += cpuUsed;
  return res;
};

const originalRunReaction = StructureLab.prototype.runReaction;

StructureLab.prototype.runReaction = function (lab1, lab2) {
  const startCpu = Game.cpu.getUsed();
  const res = originalRunReaction.call(this, lab1, lab2);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.runReactions += cpuUsed;
  return res;
};

const originalReverseReaction = StructureLab.prototype.reverseReaction;

StructureLab.prototype.reverseReaction = function (lab1, lab2) {
  const startCpu = Game.cpu.getUsed();
  const res = originalReverseReaction.call(this, lab1, lab2);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.reverseReactions += cpuUsed;
  return res;
};

const originalSpawn = StructureSpawn.prototype.spawnCreep;

StructureSpawn.prototype.spawnCreep = function (body, name, memory) {
  const startCpu = Game.cpu.getUsed();
  const res = originalSpawn.call(this, body, name, memory);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.spawn += cpuUsed;
  return res;
};

const originalTowerRepair = StructureTower.prototype.repair;

StructureTower.prototype.repair = function (target) {
  const startCpu = Game.cpu.getUsed();
  const res = originalTowerRepair.call(this, target);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.tower += cpuUsed;
  return res;
};

const originalProduceFactory = StructureFactory.prototype.produce;

StructureFactory.prototype.produce = function (product) {
  const startCpu = Game.cpu.getUsed();
  const res = originalProduceFactory.call(this, product);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.factory += cpuUsed;
  return res;
};

const originalLinkTransfer = StructureLink.prototype.transferEnergy;

StructureLink.prototype.transferEnergy = function (target) {
  const startCpu = Game.cpu.getUsed();
  const res = originalLinkTransfer.call(this, target);
  const cpuUsed = Game.cpu.getUsed() - startCpu;
  Memory.metrics.transfer += cpuUsed;
  return res;
};

export const loop = function () {
  Memory.metrics = {
    harvest: 0,
    transfer: 0,
    build: 0,
    withdraw: 0,
    upgrade: 0,
    move: 0,
    runReactions: 0,
    reverseReactions: 0,
    spawn: 0,
    tower: 0,
    factory: 0,
    callback: 0
  };
  const startLoop = Game.cpu.getUsed();
  profiler.wrap(function () {
    measureCpu(() => tryRun(() => creepsController.run()), "creepsController.run");
    measureCpu(() => tryRun(() => globalController.run()), "globalController.run");
    measureCpu(() => tryRun(() => structuresController.run()), "structuresController.run");
  });

  const endLoop = Game.cpu.getUsed() - startLoop;

  Memory.metrics.total = endLoop;
  Memory.metrics.intents =
    Memory.metrics.harvest +
    Memory.metrics.transfer +
    Memory.metrics.build +
    Memory.metrics.withdraw +
    Memory.metrics.move +
    Memory.metrics.runReactions +
    Memory.metrics.reverseReactions +
    Memory.metrics.spawn +
    Memory.metrics.tower +
    Memory.metrics.factory +
    Memory.metrics.upgrade;
  // console.log(formatMetrics(Memory.metrics));
};

function formatMetrics(metrics: any) {
  const res = {} as Record<string, string>;
  for (const key in metrics) {
    res[key] = metrics[key].toFixed(2);
  }
  return JSON.stringify(res);
}
