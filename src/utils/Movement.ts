export default /******/ (function (modules) {
  // webpackBootstrap
  /******/ // The module cache
  /******/ var installedModules: any = {};
  /******/
  /******/ // The require function
  /******/ function __webpack_require__(moduleId: any) {
    /******/
    /******/ // Check if module is in cache
    /******/ if (installedModules[moduleId]) {
      /******/ return installedModules[moduleId].exports;
      /******/
    }
    /******/ // Create a new module (and put it into the cache)
    /******/ var module = (installedModules[moduleId] = {
      /******/ i: moduleId,
      /******/ l: false,
      /******/ exports: {}
      /******/
    });
    /******/
    /******/ // Execute the module function
    /******/ modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    /******/
    /******/ // Flag the module as loaded
    /******/ module.l = true;
    /******/
    /******/ // Return the exports of the module
    /******/ return module.exports;
    /******/
  }
  /******/
  /******/
  /******/ // expose the modules object (__webpack_modules__)
  /******/ __webpack_require__.m = modules;
  /******/
  /******/ // expose the module cache
  /******/ __webpack_require__.c = installedModules;
  /******/
  /******/ // define getter function for harmony exports
  /******/ __webpack_require__.d = function (exports: any, name: any, getter: any) {
    /******/ if (!__webpack_require__.o(exports, name)) {
      /******/ Object.defineProperty(exports, name, {
        /******/ configurable: false,
        /******/ enumerable: true,
        /******/ get: getter
        /******/
      });
      /******/
    }
    /******/
  };
  /******/
  /******/ // getDefaultExport function for compatibility with non-harmony modules
  /******/ __webpack_require__.n = function (module: any) {
    /******/ var getter =
      module && module.__esModule
        ? /******/ function getDefault() {
            return module["default"];
          }
        : /******/ function getModuleExports() {
            return module;
          };
    /******/ __webpack_require__.d(getter, "a", getter);
    /******/ return getter;
    /******/
  };
  /******/
  /******/ // Object.prototype.hasOwnProperty.call
  /******/ __webpack_require__.o = function (object: any, property: any) {
    return Object.prototype.hasOwnProperty.call(object, property);
  };
  /******/
  /******/ // __webpack_public_path__
  /******/ __webpack_require__.p = "";
  /******/
  /******/ // Load entry module and return exports
  /******/ return __webpack_require__((__webpack_require__.s = 8));
  /******/
})(
  /************************************************************************/
  /******/ [
    /* 0 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const defaultConfig = {
        calculateCarryWeight: false,
        defaultStuckLimit: 5,
        staticCreepFilter: defaultIsStatic,
        trackHostileRooms: false,
        visualise: true
      };
      exports.CREEPS_MOVEMENT_CONFIG = defaultConfig;
      function setConfigWithDefaults(cfg: any) {
        exports.CREEPS_MOVEMENT_CONFIG = _.defaults(cfg, defaultConfig);
      }
      exports.setConfigWithDefaults = setConfigWithDefaults;
      function defaultIsStatic(creep: any) {
        return !!creep.memory && creep.memory._moveStatic;
      }

      /***/
    },
    /* 1 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      function getMoveData(creep: any, reset: any) {
        creep.memory._move = reset ? {} : creep.memory._move || {};
        return creep.memory._move;
      }
      exports.getMoveData = getMoveData;

      /***/
    },
    /* 2 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const PASSABLE_STRUCTURES = [STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_PORTAL];
      function passableConstructionSite(site: any) {
        return (
          !site.my || site.structureType === STRUCTURE_RAMPART || _.contains(PASSABLE_STRUCTURES, site.structureType)
        );
      }
      function passableStructure(structure: any) {
        return _.contains(PASSABLE_STRUCTURES, structure.structureType) || accessibleRampart(structure);
      }
      function accessibleRampart(structure: any) {
        return structure instanceof StructureRampart && (structure.my || structure.isPublic);
      }
      function isBlocking(thing: any) {
        if (thing instanceof Structure) {
          return !passableStructure(thing);
        }
        return !passableConstructionSite(thing);
      }
      exports.isBlocking = isBlocking;
      function isTraversable(pos: any) {
        if (pos.x < 0 || pos.x > 49 || pos.y < 0 || pos.y > 49) {
          return false;
        }
        if (_.includes(OBSTACLE_OBJECT_TYPES, pos.lookFor(LOOK_TERRAIN)[0])) {
          return false;
        }
        if (Game.rooms[pos.roomName]) {
          if (_.find(pos.lookFor(LOOK_STRUCTURES), isBlocking)) {
            return false;
          }
          if (_.find(pos.lookFor(LOOK_CONSTRUCTION_SITES), isBlocking)) {
            return false;
          }
        }
        return true;
      }
      exports.isTraversable = isTraversable;
      const offsets: any = {
        [TOP]: [0, -1],
        [TOP_RIGHT]: [+1, -1],
        [RIGHT]: [+1, 0],
        [BOTTOM_RIGHT]: [+1, +1],
        [BOTTOM]: [0, +1],
        [BOTTOM_LEFT]: [-1, +1],
        [LEFT]: [-1, 0],
        [TOP_LEFT]: [-1, -1]
      };
      function positionInDirection(startPos: any, direction: any) {
        const [xOffset, yOffset] = offsets[direction];
        const x = startPos.x + xOffset;
        const y = startPos.y + yOffset;
        if (x > 49 || x < 0 || y > 49 || y < 0) {
          return null;
        }
        return new RoomPosition(x, y, startPos.roomName);
      }
      exports.positionInDirection = positionInDirection;

      /***/
    },
    /* 3 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const config_1 = __webpack_require__(0);
      const getRoomType_1 = __webpack_require__(4);
      const hostility_1 = __webpack_require__(10);
      const roomPosition_1 = __webpack_require__(2);
      function getCostMatrix(roomName: any, avoidCreepsIn: any, opts: any) {
        if (opts && opts.avoidRooms && _.contains(opts.avoidRooms, roomName)) {
          return false;
        }
        if (hostility_1.roomHostilityCheck(roomName)) {
          return false;
        }
        const room = Game.rooms[roomName];
        if (room) {
          if (avoidCreepsIn && roomName === avoidCreepsIn) {
            return getCreepMatrix(room);
          } else if (opts && opts.avoidSk && getRoomType_1.isSkRoom(roomName)) {
            return getSkMatrix(room);
          } else {
            return getDefaultMatrix(room);
          }
        }
        return true;
      }
      exports.getCostMatrix = getCostMatrix;
      function getDefaultMatrix(room: any) {
        if (room.__defaultMatrix) {
          return room.__defaultMatrix;
        }
        const matrix = new PathFinder.CostMatrix();
        _.forEach(room.find(FIND_STRUCTURES), s => {
          if (s instanceof StructureRoad) {
            matrix.set(s.pos.x, s.pos.y, 1);
          } else if (roomPosition_1.isBlocking(s)) {
            matrix.set(s.pos.x, s.pos.y, 0xff);
          }
        });
        _.forEach(room.find(FIND_CONSTRUCTION_SITES), cs => {
          if (roomPosition_1.isBlocking(cs)) {
            matrix.set(cs.pos.x, cs.pos.y, 0xff);
          }
        });
        if (config_1.CREEPS_MOVEMENT_CONFIG.staticCreepFilter) {
          _.forEach(room.find(FIND_CREEPS), c => {
            if (config_1.CREEPS_MOVEMENT_CONFIG.staticCreepFilter(c)) {
              matrix.set(c.pos.x, c.pos.y, 0xff);
            }
          });
        }
        return (room.__defaultMatrix = matrix);
      }
      exports.getDefaultMatrix = getDefaultMatrix;
      function getCreepMatrix(room: any) {
        if (room.__creepMatrix) {
          return room.__creepMatrix;
        }
        const clonedMatrix = getDefaultMatrix(room).clone();
        _.forEach(room.find(FIND_CREEPS), c => {
          clonedMatrix.set(c.pos.x, c.pos.y, 0xff);
        });
        return (room.__creepMatrix = clonedMatrix);
      }
      exports.getCreepMatrix = getCreepMatrix;
      function getSkMatrix(room: any) {
        if (room.__skMatrix) {
          return room.__skMatrix;
        }
        const matrix = getDefaultMatrix(room).clone();
        const toAvoid = [...room.find(FIND_SOURCES), ...room.find(FIND_MINERALS)];
        const range = 4;
        _.forEach(toAvoid, center => {
          for (let xO = -range; xO <= range; xO++) {
            for (let yO = -range; yO <= range; yO++) {
              if (roomPosition_1.isTraversable(new RoomPosition(center.pos.x + xO, center.pos.y + yO, room.name))) {
                matrix.set(center.pos.x + xO, center.pos.y + yO, 0xff);
              }
            }
          }
        });
        return (room.__skMatrix = matrix);
      }
      exports.getSkMatrix = getSkMatrix;

      /***/
    },
    /* 4 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      exports.isSkRoom = _.memoize((roomName: any) => {
        const coordinates = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
        if (!coordinates) {
          return false;
        }
        const x = Number(coordinates[1]) % 10;
        const y = Number(coordinates[2]) % 10;
        if (x === 5 && y === 5) {
          return false;
        }
        return x >= 4 && x <= 6 && y >= 4 && y <= 6;
      });

      /***/
    },
    /* 5 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const config_1 = __webpack_require__(0);
      const getMoveData_1 = __webpack_require__(1);
      function positionIsBlocked(creep: any, target: any, range: any = 0) {
        if (creep.pos.getRangeTo(target) > range) {
          return false;
        }
        return target.lookFor(LOOK_CREEPS).length > 0;
      }
      function creepIsStuck(creep: any, opts: any, checkAvailability: any) {
        const data = getMoveData_1.getMoveData(creep);
        if (checkAvailability && positionIsBlocked(creep, checkAvailability, opts.range)) {
          data.stuck = 0;
          return false;
        }
        data.stuck = (data.stuck || 0) + 1;
        const maxStuck = opts.maxStuck || config_1.CREEPS_MOVEMENT_CONFIG.defaultStuckLimit || 5;
        if (config_1.CREEPS_MOVEMENT_CONFIG.visualise && data.stuck > 1 && data.stuck < maxStuck) {
          const radius = data.stuck / (maxStuck - 1) / 2;
          creep.room.visual.circle(creep.pos, { fill: "#680000", radius });
        }
        return !!data.stuck && data.stuck >= maxStuck;
      }
      exports.creepIsStuck = creepIsStuck;
      function creepHasMoved(creep: any) {
        const data = getMoveData_1.getMoveData(creep);
        if (bouncingOnExit(creep, data)) {
          return false;
        }
        if (data.lastPosition) {
          return !creep.pos.isEqualTo(data.lastPosition.x, data.lastPosition.y);
        }
        return false;
      }
      exports.creepHasMoved = creepHasMoved;
      function isExitTile(pos: any) {
        return pos.x === 0 || pos.x === 49 || pos.y === 0 || pos.y === 49;
      }
      function bouncingOnExit(creep: any, data: any) {
        return isExitTile(creep.pos) && isExitTile(_.create(RoomPosition.prototype, data.lastPosition));
      }

      /***/
    },
    /* 6 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      function serialisePath(startPos: any, positions: any) {
        let path = "";
        if (positions.length === 0) {
          return path;
        }
        for (let i = 0; i < positions.length; i++) {
          const position = positions[i];
          if (i === 0 && startPos.roomName === positions[i].roomName) {
            path += startPos.getDirectionTo(position);
          }
          const nextPosition = positions[i + 1];
          if (nextPosition && nextPosition.roomName === position.roomName) {
            path += position.getDirectionTo(nextPosition);
          }
        }
        return path;
      }
      exports.serialisePath = serialisePath;

      /***/
    },
    /* 7 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const config_1 = __webpack_require__(0);
      function visualisePath(positions: any, color: any) {
        if (!config_1.CREEPS_MOVEMENT_CONFIG.visualise) {
          return;
        }
        const byRoom = _.groupBy(positions, (rp: any) => rp.roomName);
        _.forEach(byRoom, (roomPositions: any, roomName: any) => {
          if (Game.rooms[roomName]) {
            const points: any = _.map(roomPositions, (p: any) => [p.x, p.y]);
            Game.rooms[roomName].visual.poly(points, { lineStyle: "dashed", stroke: color });
          }
        });
      }
      exports.visualisePath = visualisePath;

      /***/
    },
    /* 8 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const config_1 = __webpack_require__(0);
      __webpack_require__(9);
      __webpack_require__(11);
      __webpack_require__(12);
      __webpack_require__(14);
      __webpack_require__(15);
      exports.setConfig = config_1.setConfigWithDefaults;

      /***/
    },
    /* 9 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const costMatrix_1 = __webpack_require__(3);
      const creep_1 = __webpack_require__(5);
      const getMoveData_1 = __webpack_require__(1);
      const serialisePath_1 = __webpack_require__(6);
      const visualisePath_1 = __webpack_require__(7);
      Creep.prototype.fleeFrom = function (targets: any, dist: any, maxRooms: any) {
        return fleeFrom(this, targets, dist, maxRooms);
      };
      function fleeFrom(creep: any, targets: any, dist = 10, maxRooms = 1) {
        const inRange = _.some(targets, ro => creep.pos.getRangeTo(ro) < dist);
        let data = getMoveData_1.getMoveData(creep);
        if (!inRange) {
          creep.memory._move = {};
          return OK;
        }
        if (data.fleeTick && data.fleeTick < Game.time - 1) {
          data = getMoveData_1.getMoveData(creep, true);
        }
        data.fleeTick = Game.time;
        if (!data.fleePath || !data.fleePath.length) {
          data.stuck = 0;
          data.fleePath = getPath(creep, targets, dist, maxRooms);
        } else if (creep_1.creepHasMoved(creep)) {
          data.stuck = 0;
          data.fleePath = trimFleePath(data);
        } else if (creep_1.creepIsStuck(creep, { maxStuck: 2 })) {
          data.stuck = 0;
          data.fleePath = getPath(creep, targets, dist, maxRooms);
        }
        data.lastPosition = creep.pos;
        if (data.fleePath && data.fleePath.length > 0) {
          const direction = Number(data.fleePath.slice(0, 1));
          return creep.move(direction);
        }
        return ERR_NO_PATH;
      }
      function getPath(creep: any, targets: any, range: any, maxRooms: any) {
        const goals = _.map(targets, (t: any) => ({ pos: t.pos, range }));
        const pathResult = PathFinder.search(creep.pos, goals, {
          flee: true,
          maxRooms,
          plainCost: 2,
          roomCallback: roomName => costMatrix_1.getCostMatrix(roomName, creep.pos.roomName)
        });
        visualisePath_1.visualisePath(pathResult.path, "yellow");
        return serialisePath_1.serialisePath(creep.pos, pathResult.path);
      }
      function trimFleePath(data: any) {
        data.fleePath = data.fleePath || "";
        return data.fleePath.slice(1, data.fleePath.length);
      }

      /***/
    },
    /* 10 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const config_1 = __webpack_require__(0);
      function roomHostilityCheck(roomName: any) {
        return (
          config_1.CREEPS_MOVEMENT_CONFIG.trackHostileRooms &&
          Memory.rooms[roomName] &&
          (Memory as any).rooms[roomName]._hostile
        );
      }
      exports.roomHostilityCheck = roomHostilityCheck;
      function setHostileRoom(room: any) {
        if (config_1.CREEPS_MOVEMENT_CONFIG.trackHostileRooms) {
          room.memory._hostile = roomIsHostile(room);
        }
      }
      exports.setHostileRoom = setHostileRoom;
      function roomIsHostile(room: any) {
        const c = room.controller;
        if (!c || !c.owner || c.my || c.level < 3) {
          return;
        }
        if (
          config_1.CREEPS_MOVEMENT_CONFIG.allies &&
          _.contains(config_1.CREEPS_MOVEMENT_CONFIG.allies, c.owner.username)
        ) {
          return;
        }
        return true;
      }

      /***/
    },
    /* 11 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const getMoveData_1 = __webpack_require__(1);
      const roomPosition_1 = __webpack_require__(2);
      Creep.prototype.moveOffRoad = function (towards: any) {
        const pos = towards ? towards.pos || towards : undefined;
        return moveOffRoad(this, pos);
      };
      function moveOffRoad(creep: any, towards: any) {
        const data = getMoveData_1.getMoveData(creep);
        if (data.offRoad === Game.time - 1) {
          data.offRoad = Game.time;
          return OK;
        }
        const inOffroadPosition = isOffRoadPosition(creep.pos);
        if (inOffroadPosition) {
          data.path = appendMoveToPath(creep, data);
          data.offRoad = Game.time;
          return OK;
        }
        const positions = getNearbyPositions(creep.pos);
        const validPositions = _.filter(
          positions,
          rp => isOffRoadPosition(rp) && withinRange(rp, creep.pos, towards) && noCreep(rp)
        );
        if (validPositions.length) {
          data.offRoadFrom = creep.pos;
          return creep.move(creep.pos.getDirectionTo(validPositions[0]));
        } else if (towards) {
          return creep.moveTo(towards, { range: 1 });
        }
        return ERR_NO_PATH;
      }
      function appendMoveToPath(creep: any, data: any) {
        if (data.offRoadFrom) {
          const path = data.path ? data.path.slice(1, data.path.length) : "";
          const newPath = creep.pos.getDirectionTo(data.offRoadFrom.x, data.offRoadFrom.y) + path;
          data.lastPosition = undefined;
          data.offRoadFrom = undefined;
          return newPath;
        }
        return data.path;
      }
      function withinRange(rp: any, startPos: any, towards: any) {
        if (!towards) {
          return true;
        }
        return rp.getRangeTo(towards) <= startPos.getRangeTo(towards);
      }
      function noCreep(rp: any) {
        return rp.lookFor(LOOK_CREEPS).length === 0;
      }
      function isOffRoadPosition(rp: any) {
        return (
          roomPosition_1.isTraversable(rp) && !_.some(rp.lookFor(LOOK_STRUCTURES), s => s instanceof StructureRoad)
        );
      }
      function getNearbyPositions(startPos: any) {
        const positions: any = [];
        const offsets = [-1, 0, 1];
        _.forEach(offsets, x =>
          _.forEach(offsets, y => {
            const p = new RoomPosition(startPos.x + x, startPos.y + y, startPos.roomName);
            if (p.x > 0 && p.x < 49 && p.y > 0 && p.y < 49) {
              positions.push(p);
            }
          })
        );
        return positions;
      }

      /***/
    },
    /* 12 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const costMatrix_1 = __webpack_require__(3);
      const creep_1 = __webpack_require__(5);
      const getMoveData_1 = __webpack_require__(1);
      const getRoomType_1 = __webpack_require__(4);
      const roomPosition_1 = __webpack_require__(2);
      const serialisePath_1 = __webpack_require__(6);
      const terrainCosts_1 = __webpack_require__(13);
      const visualisePath_1 = __webpack_require__(7);
      Creep.prototype.moveTo = function (...args: any) {
        const xyMove = args[0] instanceof Number;
        const pos = xyMove ? new RoomPosition(args[0], args[1], this.pos.roomName) : args[0].pos || args[0];
        const opts = xyMove ? args[2] : args[1];
        return moveTo(this, pos, opts);
      };
      function moveTo(creep: any, target: any, opts: any = {}) {
        if (creep.spawning || creep.fatigue) {
          return OK;
        }
        if (withinRange(creep, target, opts)) {
          creep.memory._move = undefined;
          return OK;
        }
        let data = getMoveData_1.getMoveData(creep);
        if (needsNewPath(creep, target, opts, data)) {
          data = getMoveData_1.getMoveData(creep, true);
          data.dest = target;
          data.path = getPathAsString(creep, target, opts);
        } else if (creep_1.creepHasMoved(creep)) {
          data.stuck = undefined;
          data.path = trimPath(data);
        } else if (creep_1.creepIsStuck(creep, opts, target)) {
          data.stuck = undefined;
          opts.avoidCreeps = true;
          data.path = getPathAsString(creep, target, opts);
        } else if (opts.pushPastFilter) {
          pushPast(creep, opts, data);
        }
        data.lastPosition = creep.pos;
        data.offRoad = undefined;
        if (data.path && data.path.length > 0) {
          data.lastMoveAttempt = Game.time;
          const direction = Number(data.path.slice(0, 1));
          return creep.move(direction);
        }
        return ERR_NO_PATH;
      }
      function trimPath(data: any) {
        data.path = data.path || "";
        return data.path.slice(1, data.path.length);
      }
      function needsNewPath(c: any, target: any, opts: any, data: any) {
        return !data.path || data.path.length === 0 || targetHasChanged(data, target) || needsSkRepath(c, opts, data);
      }
      function needsSkRepath(creep: any, opts: any, data: any) {
        if (creep.room.controller || !opts.avoidSk || !data.lastPosition) {
          return false;
        }
        if (data.lastPosition.roomName === creep.pos.roomName || !getRoomType_1.isSkRoom(creep.room.name)) {
          return false;
        }
        opts.avoidRooms = opts.avoidRooms || [];
        opts.avoidRooms.push(data.lastPosition.roomName);
        return true;
      }
      function getPathAsString(creep: any, target: any, opts: any) {
        const pathResult = getPath(creep, target, opts);
        const colour = pathResult.incomplete ? "red" : opts.avoidCreeps ? "orange" : "white";
        visualisePath_1.visualisePath([creep.pos, ...pathResult.path], colour);
        return serialisePath_1.serialisePath(creep.pos, pathResult.path);
      }
      function withinRange(creep: any, target: any, opts: any) {
        const range = creep.pos.getRangeTo(target);
        return !range || (!!opts.range && range <= opts.range);
      }
      function targetHasChanged(data: any, tgt: any) {
        const d = data.dest;
        return !d || d.x !== tgt.x || d.y !== tgt.y || d.roomName !== tgt.roomName;
      }
      function getPath(creep: any, target: any, opts: any) {
        const avoidIn = opts.avoidCreeps ? creep.pos.roomName : undefined;
        const terrainCosts = terrainCosts_1.getTerrainCosts(creep);
        opts.plainCost = opts.plainCost === undefined ? terrainCosts.plains : opts.plainCost;
        opts.swampCost = opts.swampCost === undefined ? terrainCosts.swamp : opts.swampCost;
        opts.range = opts.range === undefined ? (roomPosition_1.isTraversable(target) ? 0 : 1) : opts.range;
        opts.roomCallback = (name: any) => costMatrix_1.getCostMatrix(name, avoidIn, opts);
        return PathFinder.search(creep.pos, { pos: target, range: opts.range }, opts);
      }
      function pushPast(creep: any, opts: any, data: any) {
        const predicate = opts.pushPastFilter;
        if (!predicate) {
          return;
        }
        if (!data.path || (!data.stuck && data.lastPush !== Game.time - 1)) {
          return;
        }
        const pos = roomPosition_1.positionInDirection(creep.pos, Number(data.path.slice(0, 1)));
        if (!pos) {
          return;
        }
        const otherCreep = pos.lookFor(LOOK_CREEPS)[0];
        if (!otherCreep || !otherCreep.my || !predicate(otherCreep)) {
          return;
        }
        const otherData = getMoveData_1.getMoveData(otherCreep);
        if (otherData.lastMoveAttempt && otherData.lastMoveAttempt >= Game.time - 1) {
          return;
        }
        data.lastPush = Game.time;
        otherCreep.move(otherCreep.pos.getDirectionTo(creep));
        otherCreep.memory._move = undefined;
      }

      /***/
    },
    /* 13 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Object.defineProperty(exports, "__esModule", { value: true });
      const config_1 = __webpack_require__(0);
      function getTerrainCosts(creep: any) {
        const data = getCreepWeightInfo(creep);
        const ratio = data.weighted / data.move;
        return {
          plains: ratio <= 1 ? 1 : 2,
          swamp: getSwampCost(ratio)
        };
      }
      exports.getTerrainCosts = getTerrainCosts;
      function getSwampCost(ratio: any) {
        const clamped = ratio < 0.2 ? 0.2 : ratio > 1 ? 1 : ratio;
        return Math.ceil(clamped * 5);
      }
      function getCreepWeightInfo(creep: any) {
        const calcCarry = config_1.CREEPS_MOVEMENT_CONFIG.calculateCarryWeight;
        const unWeightedParts = calcCarry ? [MOVE, CARRY] : [MOVE];
        const bodyParts = _.countBy(creep.body, (p: any) =>
          _.contains(unWeightedParts, p.type) ? p.type : "weighted"
        );
        bodyParts.weighted = bodyParts.weighted || 0;
        return {
          move: bodyParts.move || 0,
          weighted: bodyParts[CARRY] ? Math.ceil(_.sum(creep.carry) / 50) + bodyParts.weighted : bodyParts.weighted
        };
      }

      /***/
    },
    /* 14 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Creep.prototype.moveToRoom = function (roomName: any, range: any) {
        return moveToRoom(this, roomName);
      };
      function moveToRoom(creep: any, roomName: any, range = 23) {
        return creep.moveTo(new RoomPosition(25, 25, roomName), {
          avoidSk: true,
          maxOps: 10000,
          range
        });
      }

      /***/
    },
    /* 15 */
    /***/ function (module: any, exports: any, __webpack_require__: any) {
      "use strict";

      Creep.prototype.setStatic = function (value = true) {
        this.memory._moveStatic = value ? true : undefined;
      };

      /***/
    }
    /******/
  ]
);

export function actionOrMove<T extends Creep>(
  creep: T,
  action: () => ScreepsReturnCode,
  target: RoomPosition | HasPos
): ScreepsReturnCode {
  const result = action();

  if (result === ERR_NOT_IN_RANGE) {
    creep.travelTo(target);
    return OK;
  }
  return result;
}

Creep.prototype.kiteAttack = function (target: AnyCreep) {
  this.rangedAttack(target);

  const distance = this.pos.getRangeTo(target);
  if (distance < 3) {
    this.fleeFrom([target], 3);
  } else if (distance > 3) {
    this.moveTo(target, { range: 3 });
  }
};

Creep.prototype.healClosestAlly = function () {
  const ally = this.pos.findClosestByRange(FIND_MY_CREEPS, {
    filter: creep => creep.hits < creep.hitsMax && this.pos.getRangeTo(creep) < 6
  });
  if (ally) {
    const err = this.heal(ally);
    if (err === ERR_NOT_IN_RANGE) {
      this.moveTo(ally);
    }
  }
};
