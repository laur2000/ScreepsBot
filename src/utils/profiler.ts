"use strict";

let usedOnStart = 0;
let enabled = false;
let depth = 0;
let parentFn = "(tick)";

class ProfilerError extends Error {}

// Hack to ensure the InterShardMemory constant exists in sim
try {
  // eslint-disable-next-line no-unused-expressions
  InterShardMemory;
} catch (e) {
  global.InterShardMemory = undefined;
}

function setupProfiler() {
  depth = 0; // reset depth, this needs to be done each tick.
  parentFn = "(tick)";
  (Game as any).profiler = {
    stream(duration: any, filter: any) {
      setupMemory("stream", duration || 10, filter);
    },
    email(duration: any, filter: any) {
      setupMemory("email", duration || 100, filter);
    },
    profile(duration: any, filter: any) {
      setupMemory("profile", duration || 100, filter);
    },
    background(filter: any) {
      setupMemory("background", false, filter);
    },
    callgrind(duration: any, filter: any) {
      setupMemory("callgrind", duration || 100, filter);
    },
    restart() {
      if (Profiler.isProfiling()) {
        const filter = Memory.profiler.filter;
        let duration: any = false;
        if (!!Memory.profiler.disableTick) {
          // Calculate the original duration, profile is enabled on the tick after the first call,
          // so add 1.
          duration = Memory.profiler.disableTick - Memory.profiler.enabledTick + 1;
        }
        const type = Memory.profiler.type;
        setupMemory(type, duration, filter);
      }
    },
    reset: resetMemory,
    output: Profiler.output,
    downloadCallgrind: Profiler.downloadCallgrind
  };

  overloadCPUCalc();
}

function setupMemory(profileType: any, duration: any, filter: any) {
  resetMemory();
  const disableTick = Number.isInteger(duration) ? (Game as any).time + duration : false;
  if (!Memory.profiler) {
    Memory.profiler = {
      map: {},
      totalTime: 0,
      enabledTick: (Game as any).time + 1,
      disableTick,
      type: profileType,
      filter
    };
  }
  console.log(`Profiling type ${profileType} started at ${(Game as any).time + 1} for ${duration} ticks`);
}

function resetMemory() {
  Memory.profiler = null;
}

function overloadCPUCalc() {
  if ((Game as any).rooms.sim) {
    usedOnStart = 0; // This needs to be reset, but only in the sim.
    (Game as any).cpu.getUsed = function getUsed() {
      return Date.now() - usedOnStart;
    };
  }
}

function getFilter() {
  return Memory.profiler.filter;
}

const functionBlackList = [
  "getUsed", // Let's avoid wrapping this... may lead to recursion issues and should be inexpensive.
  "constructor" // es6 class constructors need to be called with `new`
];

const commonProperties = ["length", "name", "arguments", "caller", "prototype"];

function wrapFunction(name: any, originalFunction: any) {
  if (originalFunction.__profiler) {
    originalFunction.__profiler = Profiler;
    return originalFunction;
  }

  function wrappedFunction(this: any, ...args: any[]) {
    const profiler = wrappedFunction.__profiler;
    if (profiler.isProfiling()) {
      const nameMatchesFilter = name === getFilter();
      const start = (Game as any).cpu.getUsed();
      if (nameMatchesFilter) {
        depth++;
      }
      const curParent = parentFn;
      parentFn = name;
      let result;
      if (this && this.constructor === wrappedFunction) {
        result = new originalFunction(...args);
      } else {
        result = originalFunction.apply(this, args);
      }
      parentFn = curParent;
      if (depth > 0 || !getFilter()) {
        const end = (Game as any).cpu.getUsed();
        profiler.record(name, end - start, parentFn);
      }
      if (nameMatchesFilter) {
        depth--;
      }
      return result;
    }

    if (this && this.constructor === wrappedFunction) {
      return new originalFunction(...args);
    }
    return originalFunction.apply(this, args);
  }

  wrappedFunction.__profiler = Profiler;
  wrappedFunction.toString = () => `// screeps-profiler wrapped function:\n${originalFunction.toString()}`;

  Object.getOwnPropertyNames(originalFunction).forEach(property => {
    if (!commonProperties.includes(property)) {
      (wrappedFunction as any)[property] = originalFunction[property];
    }
  });

  return wrappedFunction;
}

function hookUpPrototypes() {
  for (const { name, val } of Profiler.prototypes) {
    if (!val) {
      console.log(`skipping prototype hook ${name}, object appears to be missing`);
      continue;
    }
    profileObjectFunctions(val, name);
  }
}

function profileObjectFunctions(object: any, label: any) {
  if (!object || !(typeof object === "object" || typeof object === "function")) {
    throw new ProfilerError(`Asked to profile non-object ${object} for ${label}
     (${typeof object})`);
  }

  if (object.prototype) {
    profileObjectFunctions(object.prototype, label);
  }
  const objectToWrap: any = object;

  Object.getOwnPropertyNames(objectToWrap).forEach(functionName => {
    const extendedLabel = `${label}.${functionName}`;

    const isBlackListed = functionBlackList.indexOf(functionName) !== -1;
    if (isBlackListed) {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, functionName);
    if (!descriptor) {
      return;
    }

    const hasAccessor = descriptor.get || descriptor.set;
    if (hasAccessor) {
      const configurable = descriptor.configurable;
      if (!configurable) {
        return;
      }

      const profileDescriptor: any = {};

      if (descriptor.get) {
        const extendedLabelGet = `${extendedLabel}:get`;
        profileDescriptor.get = profileFunction(descriptor.get, extendedLabelGet);
      }

      if (descriptor.set) {
        const extendedLabelSet = `${extendedLabel}:set`;
        profileDescriptor.set = profileFunction(descriptor.set, extendedLabelSet);
      }

      Object.defineProperty(objectToWrap, functionName, profileDescriptor);
      return;
    }

    const isFunction = typeof descriptor.value === "function";
    if (!isFunction || !descriptor.writable) {
      return;
    }
    const originalFunction = objectToWrap[functionName];
    objectToWrap[functionName] = profileFunction(originalFunction, extendedLabel);
  });

  return objectToWrap;
}

function profileFunction(fn: any, functionName: any) {
  const fnName = functionName || fn.name;
  if (!fnName) {
    console.log("Couldn't find a function name for - ", fn);
    console.log("Will not profile this function.");
    return fn;
  }

  return wrapFunction(fnName, fn);
}

const Profiler: any = {
  printProfile() {
    console.log(Profiler.output());
  },

  emailProfile() {
    (Game as any).notify(Profiler.output(1000));
  },

  downloadCallgrind() {
    const id = `id${Math.random()}`;
    const shardId = (Game as any).shard.name + ((Game as any).shard.ptr ? "-ptr" : "");
    const filename = `callgrind.${shardId}.${(Game as any).time}`;
    const data = Profiler.callgrind();
    if (!data) {
      console.log("No profile data to download");
      return;
    }
    /* eslint-disable */
    const download = `
    <script>
    var element = document.getElementById('${id}');
    if (!element) {
      element = document.createElement('a');
      element.setAttribute('id', '${id}');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,${encodeURIComponent(data)}');
      element.setAttribute('download', '${filename}');

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();
    }
    </script>
    `;
    /* eslint-enable */
    console.log(
      download
        .split("\n")
        .map(s => s.trim())
        .join("")
    );
  },

  callgrind() {
    if (!Memory.profiler || !Memory.profiler.enabledTick) return null;
    const elapsedTicks = (Game as any).time - Memory.profiler.enabledTick + 1;
    Profiler.checkMapItem("(tick)");
    Memory.profiler.map["(tick)"].calls = elapsedTicks;
    Memory.profiler.map["(tick)"].time = Memory.profiler.totalTime;
    Profiler.checkMapItem("(root)");
    Memory.profiler.map["(root)"].calls = 1;
    Memory.profiler.map["(root)"].time = Memory.profiler.totalTime;
    Profiler.checkMapItem("(tick)", Memory.profiler.map["(root)"].subs);
    Memory.profiler.map["(root)"].subs["(tick)"].calls = elapsedTicks;
    Memory.profiler.map["(root)"].subs["(tick)"].time = Memory.profiler.totalTime;
    let body = `events: ns\nsummary: ${Math.round(Memory.profiler.totalTime * 1000000)}\n`;
    for (const fnName of Object.keys(Memory.profiler.map)) {
      const fn = Memory.profiler.map[fnName];
      let callsBody = "";
      let callsTime = 0;
      for (const callName of Object.keys(fn.subs)) {
        const call = fn.subs[callName];
        const ns = Math.round(call.time * 1000000);
        callsBody += `cfn=${callName}\ncalls=${call.calls} 1\n1 ${ns}\n`;
        callsTime += call.time;
      }
      body += `\nfn=${fnName}\n1 ${Math.round((fn.time - callsTime) * 1000000)}\n${callsBody}`;
    }
    return body;
  },

  output(passedOutputLengthLimit: any) {
    const outputLengthLimit = passedOutputLengthLimit || 1000;
    if (!Memory.profiler || !Memory.profiler.enabledTick) {
      return "Profiler not active.";
    }

    const endTick = Math.min(Memory.profiler.disableTick || (Game as any).time, (Game as any).time);
    const startTick = Memory.profiler.enabledTick;
    const elapsedTicks = endTick - startTick + 1;
    const header = "calls\t\ttime\t\tavg\t\tfunction";
    const footer = [
      `Avg: ${(Memory.profiler.totalTime / elapsedTicks).toFixed(2)}`,
      `Total: ${Memory.profiler.totalTime.toFixed(2)}`,
      `Ticks: ${elapsedTicks}`
    ].join("\t");

    const lines = [header];
    let currentLength = header.length + 1 + footer.length;
    const allLines = Profiler.lines();
    let done = false;
    while (!done && allLines.length) {
      const line = allLines.shift();
      // each line added adds the line length plus a new line character.
      if (currentLength + line.length + 1 < outputLengthLimit) {
        lines.push(line);
        currentLength += line.length + 1;
      } else {
        done = true;
      }
    }
    lines.push(footer);
    return lines.join("\n");
  },

  lines() {
    const stats = Object.keys(Memory.profiler.map)
      .map(functionName => {
        const functionCalls = Memory.profiler.map[functionName];
        return {
          name: functionName,
          calls: functionCalls.calls,
          totalTime: functionCalls.time,
          averageTime: functionCalls.time / functionCalls.calls
        };
      })
      .sort((val1, val2) => {
        return val2.totalTime - val1.totalTime;
      });

    const lines = stats.map(data => {
      return [data.calls, data.totalTime.toFixed(1), data.averageTime.toFixed(3), data.name].join("\t\t");
    });

    return lines;
  },

  prototypes: [
    { name: "ConstructionSite", val: ConstructionSite },
    { name: "Creep", val: Creep },
    { name: "Deposit", val: Deposit },
    { name: "Flag", val: Flag },
    { name: "Game", val: Game as any },
    { name: "InterShardMemory", val: InterShardMemory },
    { name: "Mineral", val: Mineral },
    { name: "Nuke", val: Nuke },
    { name: "OwnedStructure", val: OwnedStructure },
    { name: "PathFinder", val: PathFinder },
    { name: "PowerCreep", val: PowerCreep },
    { name: "RawMemory", val: RawMemory },
    { name: "Resource", val: Resource },
    { name: "Room", val: Room },
    { name: "RoomObject", val: RoomObject },
    { name: "RoomPosition", val: RoomPosition },
    { name: "RoomVisual", val: RoomVisual },
    { name: "Ruin", val: Ruin },
    { name: "Source", val: Source },
    { name: "Store", val: {} as any },
    { name: "Structure", val: Structure },
    { name: "StructureContainer", val: StructureContainer },
    { name: "StructureController", val: StructureController },
    { name: "StructureExtension", val: StructureExtension },
    { name: "StructureExtractor", val: StructureExtractor },
    { name: "StructureFactory", val: StructureFactory },
    { name: "StructureInvaderCore", val: StructureInvaderCore },
    { name: "StructureKeeperLair", val: StructureKeeperLair },
    { name: "StructureLab", val: StructureLab },
    { name: "StructureLink", val: StructureLink },
    { name: "StructureNuker", val: StructureNuker },
    { name: "StructureObserver", val: StructureObserver },
    { name: "StructurePortal", val: StructurePortal },
    { name: "StructurePowerBank", val: StructurePowerBank },
    { name: "StructurePowerSpawn", val: StructurePowerSpawn },
    { name: "StructureRampart", val: StructureRampart },
    { name: "StructureRoad", val: StructureRoad },
    { name: "StructureSpawn", val: StructureSpawn },
    { name: "StructureStorage", val: StructureStorage },
    { name: "StructureTerminal", val: StructureTerminal },
    { name: "StructureTower", val: StructureTower },
    { name: "StructureWall", val: StructureWall },
    { name: "Tombstone", val: Tombstone }
  ],

  checkMapItem(functionName: any, map = Memory.profiler.map) {
    if (!map[functionName]) {
      // eslint-disable-next-line no-param-reassign
      map[functionName] = {
        time: 0,
        calls: 0,
        subs: {}
      };
    }
  },

  record(functionName: any, time: any, parent: any) {
    this.checkMapItem(functionName);
    Memory.profiler.map[functionName].calls++;
    Memory.profiler.map[functionName].time += time;
    if (parent) {
      this.checkMapItem(parent);
      this.checkMapItem(functionName, Memory.profiler.map[parent].subs);
      Memory.profiler.map[parent].subs[functionName].calls++;
      Memory.profiler.map[parent].subs[functionName].time += time;
    }
  },

  endTick() {
    if ((Game as any).time >= Memory.profiler.enabledTick) {
      const cpuUsed = (Game as any).cpu.getUsed();
      Memory.profiler.totalTime += cpuUsed;
      Profiler.report();
    }
  },

  report() {
    if (Profiler.shouldPrint()) {
      Profiler.printProfile();
    } else if (Profiler.shouldEmail()) {
      Profiler.emailProfile();
    } else if (Profiler.shouldCallgrind()) {
      Profiler.downloadCallgrind();
    }
  },

  isProfiling() {
    if (!enabled || !Memory.profiler) {
      return false;
    }
    return !Memory.profiler.disableTick || (Game as any).time <= Memory.profiler.disableTick;
  },

  type() {
    return Memory.profiler.type;
  },

  shouldPrint() {
    const streaming = Profiler.type() === "stream";
    const profiling = Profiler.type() === "profile";
    const onEndingTick = Memory.profiler.disableTick === (Game as any).time;
    return streaming || (profiling && onEndingTick);
  },

  shouldEmail() {
    return Profiler.type() === "email" && Memory.profiler.disableTick === (Game as any).time;
  },

  shouldCallgrind() {
    return Profiler.type() === "callgrind" && Memory.profiler.disableTick === (Game as any).time;
  }
};

export default {
  wrap(callback: any) {
    if (enabled) {
      setupProfiler();
    }

    if (Profiler.isProfiling()) {
      usedOnStart = (Game as any).cpu.getUsed();

      // Commented lines are part of an on going experiment to keep the profiler
      // performant, and measure certain types of overhead.

      // var callbackStart = (Game as any).cpu.getUsed();
      const returnVal = callback();
      // var callbackEnd = (Game as any).cpu.getUsed();
      Profiler.endTick();
      // var end = (Game as any).cpu.getUsed();

      // var profilerTime = (end - start) - (callbackEnd - callbackStart);
      // var callbackTime = callbackEnd - callbackStart;
      // var unaccounted = end - profilerTime - callbackTime;
      // console.log('total-', end, 'profiler-', profilerTime, 'callbacktime-',
      // callbackTime, 'start-', start, 'unaccounted', unaccounted);
      return returnVal;
    }

    return callback();
  },

  enable() {
    enabled = true;
    hookUpPrototypes();
  },

  output: Profiler.output,
  callgrind: Profiler.callgrind,

  registerObject: profileObjectFunctions,
  registerFN: profileFunction,
  registerClass: profileObjectFunctions,

  Error: ProfilerError
};
