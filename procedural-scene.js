/*
 * VankorAR procedural scene
 * Original author: Данил Каханов
 * Procedural oilfield scene, characters, and site logic
 * 2026
 */

import * as THREE from "three";

const BEAR_HEIGHT = 0.065;
const WORKER_HEIGHT = 0.072;
const MARKER_ASPECT = 704 / 1472;

export const SCENE_LAYOUT = {
    markerAspect: MARKER_ASPECT,
    extent: {
        minX: -0.48,
        maxX: 0.48,
        minY: -MARKER_ASPECT * 0.5 + 0.016,
        maxY: MARKER_ASPECT * 0.5 - 0.016
    },
    lakeKeepout: { x: -0.32, y: 0.13, radiusX: 0.10, radiusY: 0.068 },
    helipad: { x: -0.21, y: 0.032, z: 0 },
    helipadSize: 0.10,
    helipadRadius: 0.055,
    tanks: { x: -0.18, y: -0.152, z: 0 },
    tanksFootprint: 0.115,
    pumpjack: { x: 0.27, y: -0.108, z: 0 },
    pumpjackFootprint: 0.10,
    rig: { x: 0.33, y: 0.128, z: 0 },
    rigFootprint: 0.16,
    building: { x: 0.00, y: -0.100, z: 0 },
    buildingFootprint: 0.154,
    buildingYaw: 0,
    containers: { x: -0.30, y: -0.155, z: 0 },
    containersFootprint: 0.08,
    yard: { x: 0.00, y: 0.038, radiusX: 0.12, radiusY: 0.022 },
    processCorridorY: 0.008,
    eastCorridorX: 0.445,
    tanksPumpSouthY: -0.210,
    road: { x: 0.34, y: 0.008, z: 0, length: 0.22 },
    signs: [
        { kind: "uc", x: -0.46, y: -0.18, yaw: 0 },
        { kind: "vankor", x: 0.44, y: -0.18, yaw: 0 }
    ],
    southProps: [
        { kind: "crate", x: -0.08, y: -0.188, yaw: 0.4 },
        { kind: "generator", x: 0.36, y: -0.175, yaw: -0.2 },
        { kind: "spotlight", x: 0.42, y: -0.10, yaw: 0.6 }
    ],
    bearZones: [
        { name: "westSnow", x: -0.18, y: -0.165, radiusX: 0.12, radiusY: 0.042 },
        { name: "southRoad", x: 0.02, y: -0.178, radiusX: 0.10, radiusY: 0.036 },
        { name: "eastSnow", x: 0.20, y: -0.165, radiusX: 0.10, radiusY: 0.040 }
    ]
};

const PROCEDURAL_RIG_FOOTPRINT = SCENE_LAYOUT.rigFootprint;
const RIG_POSITION = SCENE_LAYOUT.rig;
const PUMPJACK_POSITION = SCENE_LAYOUT.pumpjack;
const TANKS_POSITION = SCENE_LAYOUT.tanks;
const CONTAINERS_POSITION = SCENE_LAYOUT.containers;
const BUILDING_POSITION = SCENE_LAYOUT.building;
const RIG_BASE_SIZE = 0.50;
const RIG_SCALE = PROCEDURAL_RIG_FOOTPRINT / RIG_BASE_SIZE;
const TANK_VISUAL_SPAN = 0.43;
const PUMP_VISUAL_SPAN = 0.50;
const TANK_SCALE = SCENE_LAYOUT.tanksFootprint / TANK_VISUAL_SPAN;
const PUMP_SCALE = SCENE_LAYOUT.pumpjackFootprint / PUMP_VISUAL_SPAN;
const PIPE_RADIUS = 0.0055;
const PIPE_NOZZLE_RADIUS = 0.004;
const PIPE_STUB_LENGTH = 0.011;
const PIPE_CENTER_Y = 0.18 * PUMP_SCALE;
const PIPE_SUPPORT_TOP = PIPE_CENTER_Y - PIPE_RADIUS;
const TANK_NOZZLE_Z = 0.092 * TANK_SCALE;
const RIG_NOZZLE_Z = 0.086 * RIG_SCALE;
const LADDER_RUNG_COUNT = 16;
const CLIMB_SPEED = 0.055;
const RIG_EXIT_SPEED = 0.030;

const RIG_TOWER_HEIGHT = 1.50;
const RIG_TOWER_BOTTOM = 0.18;
const RIG_TOWER_TOP = 0.055;
const RIG_PLATFORM_POSITION = { x: 0, y: 1.12, z: 0 };
const RIG_PLATFORM_SIZE = { x: 0.40, y: 0.022, z: 0.40 };
const RIG_PLATFORM_INNER = 0.22;
const RIG_LADDER_X = 0;
const RIG_LADDER_Y0 = 0.10;
const RIG_LADDER_Y1 = RIG_PLATFORM_POSITION.y + RIG_PLATFORM_SIZE.y * 0.5;
const RIG_HATCH_WIDTH = 0.12;

function rigSpreadAt(y) {
    return THREE.MathUtils.lerp(RIG_TOWER_BOTTOM, RIG_TOWER_TOP, y / RIG_TOWER_HEIGHT);
}

const RIG_LADDER_Z0 = rigSpreadAt(RIG_LADDER_Y0) + 0.028;
const RIG_LADDER_Z1 = (RIG_PLATFORM_INNER + RIG_PLATFORM_SIZE.z) * 0.25;
const BEAR_TURN_SPEED = 2.4;
const BEAR_WALK_FREQUENCY = 7;
const BEAR_REACH_EPSILON = 0.028;
const CHARACTER_RADIUS = 0.02;
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();

export const SCENE_EXTENT = SCENE_LAYOUT.extent;

export const BEAR_WANDER_BOUNDS = {
    minX: SCENE_LAYOUT.extent.minX + 0.04,
    maxX: 0.34,
    minY: SCENE_LAYOUT.extent.minY + 0.02,
    maxY: -0.04
};

export const HELI_PAD_CENTER = SCENE_LAYOUT.helipad;
export const HELI_PAD_SIZE = SCENE_LAYOUT.helipadSize;
export const HELI_PAD_RADIUS = SCENE_LAYOUT.helipadRadius;
export const HELI_ZONE_BOUNDS = {
    minX: HELI_PAD_CENTER.x - 0.10,
    maxX: HELI_PAD_CENTER.x + 0.10,
    minY: HELI_PAD_CENTER.y - 0.10,
    maxY: HELI_PAD_CENTER.y + 0.10
};
export const HELI_CRUISE_Z = 0.22;
export const HELI_HOVER_Z = 0.13;
export const HELI_LANDED_Z = 0;
export const HELI_FLIGHT_POINTS = {
    far: { x: -0.44, y: -0.04, z: HELI_CRUISE_Z },
    wait: { x: -0.44, y: 0.16, z: HELI_CRUISE_Z },
    north: { x: -0.36, y: 0.205, z: HELI_CRUISE_Z },
    west: { x: -0.45, y: 0.06, z: 0.20 },
    south: { x: -0.30, y: -0.10, z: 0.18 },
    approach: { x: -0.24, y: -0.04, z: 0.14 },
    hover: { x: HELI_PAD_CENTER.x, y: HELI_PAD_CENTER.y, z: HELI_HOVER_Z }
};
const HELI_PATROL_KEYS = ["far", "west", "wait", "north"];
const HELI_APPROACH_KEYS = ["west", "south", "approach", "hover"];
const HELI_DEPART_KEYS = ["approach", "south", "west"];
const HELI_FLY_SPEED = 0.08;
const HELI_LAND_SPEED = 0.042;
const HELI_ROTOR_FLY = 26;
const HELI_ROTOR_SLOW = 3.2;
const HELI_ROTOR_LANDED = 0;
const HELI_HEIGHT = 0.048;

export const SCENE_OBSTACLES = [
    { name: "building", x: BUILDING_POSITION.x, y: BUILDING_POSITION.y, radiusX: 0.078, radiusY: 0.066 },
    { name: "rig", x: RIG_POSITION.x, y: RIG_POSITION.y, radiusX: 0.095, radiusY: 0.095 },
    { name: "pumpjack", x: PUMPJACK_POSITION.x, y: PUMPJACK_POSITION.y, radiusX: 0.065, radiusY: 0.055 },
    { name: "tanks", x: TANKS_POSITION.x, y: TANKS_POSITION.y, radiusX: 0.068, radiusY: 0.052 },
    { name: "containers", x: CONTAINERS_POSITION.x, y: CONTAINERS_POSITION.y, radiusX: 0.055, radiusY: 0.048 },
    { name: "lake", x: SCENE_LAYOUT.lakeKeepout.x, y: SCENE_LAYOUT.lakeKeepout.y, radiusX: SCENE_LAYOUT.lakeKeepout.radiusX, radiusY: SCENE_LAYOUT.lakeKeepout.radiusY },
    { name: "pipesTanksDrop", x: TANKS_POSITION.x + 0.057, y: (TANKS_POSITION.y + SCENE_LAYOUT.tanksPumpSouthY) * 0.5, radiusX: 0.012, radiusY: 0.034 },
    { name: "pipesTanksSouth", x: 0.052, y: SCENE_LAYOUT.tanksPumpSouthY, radiusX: 0.188, radiusY: 0.012 },
    { name: "pipesTanksRise", x: PUMPJACK_POSITION.x - 0.042, y: (SCENE_LAYOUT.tanksPumpSouthY + PUMPJACK_POSITION.y) * 0.5, radiusX: 0.012, radiusY: 0.054 },
    { name: "pipesSouth", x: 0.35, y: SCENE_LAYOUT.processCorridorY, radiusX: 0.12, radiusY: 0.016 },
    { name: "pipesEast", x: SCENE_LAYOUT.eastCorridorX, y: (SCENE_LAYOUT.processCorridorY + RIG_POSITION.y) * 0.5, radiusX: 0.016, radiusY: 0.07 },
    { name: "pipesRigIn", x: RIG_POSITION.x + 0.09, y: RIG_POSITION.y - 0.006, radiusX: 0.028, radiusY: 0.016 },
    { name: "pumpPanel", x: PUMPJACK_POSITION.x, y: PUMPJACK_POSITION.y - 0.065, radiusX: 0.022, radiusY: 0.022 },
    { name: "helipad", x: HELI_PAD_CENTER.x, y: HELI_PAD_CENTER.y, radiusX: HELI_PAD_RADIUS, radiusY: HELI_PAD_RADIUS }
];

export const WORK_ZONES = [
    { name: "rig", x: RIG_POSITION.x - 0.04, y: RIG_POSITION.y - 0.075, radiusX: 0.05, radiusY: 0.032 },
    { name: "tanks", x: TANKS_POSITION.x + 0.078, y: TANKS_POSITION.y + 0.008, radiusX: 0.032, radiusY: 0.028 },
    { name: "pipes", x: SCENE_LAYOUT.eastCorridorX - 0.04, y: SCENE_LAYOUT.processCorridorY + 0.02, radiusX: 0.05, radiusY: 0.022 },
    { name: "yard", x: SCENE_LAYOUT.yard.x, y: SCENE_LAYOUT.yard.y, radiusX: SCENE_LAYOUT.yard.radiusX, radiusY: SCENE_LAYOUT.yard.radiusY }
];

function rigLocalToMap(lx, ly, lz) {
    return new THREE.Vector3(
        RIG_POSITION.x + lx * RIG_SCALE,
        RIG_POSITION.y - lz * RIG_SCALE,
        ly * RIG_SCALE
    );
}

function buildRigClimbPath() {
    const points = [];
    const count = 10;

    for (let i = 0; i < count; i += 1) {
        const t = i / (count - 1);
        const y = THREE.MathUtils.lerp(RIG_LADDER_Y0, RIG_LADDER_Y1, t);
        const z = THREE.MathUtils.lerp(RIG_LADDER_Z0, RIG_LADDER_Z1, t);
        points.push(rigLocalToMap(RIG_LADDER_X, y, z));
    }

    return points;
}

export const RIG_CLIMB_PATH = buildRigClimbPath();
const RIG_PLATFORM_ENTRY = rigLocalToMap(
    RIG_HATCH_WIDTH * 0.5 + 0.018,
    RIG_LADDER_Y1,
    RIG_LADDER_Z1
);
const RIG_PLATFORM_CLEAR = rigLocalToMap(0.09, RIG_LADDER_Y1, 0.168);
const RIG_TERMINAL_LOCAL = { x: 0.145, y: RIG_PLATFORM_POSITION.y + 0.03, z: 0.148 };
const RIG_TERMINAL_STAND = rigLocalToMap(0.145, RIG_LADDER_Y1, 0.178);
const RIG_LADDER_EXIT_POINT = rigLocalToMap(RIG_LADDER_X, 0.02, RIG_LADDER_Z0 + 0.18);
const RIG_INSPECT_POINTS = [
    new THREE.Vector3(RIG_POSITION.x, RIG_POSITION.y - 0.08, 0),
    new THREE.Vector3(RIG_POSITION.x + 0.08, RIG_POSITION.y - 0.06, 0),
    new THREE.Vector3(RIG_POSITION.x - 0.10, RIG_POSITION.y - 0.06, 0),
    new THREE.Vector3(RIG_POSITION.x - 0.12, RIG_POSITION.y + 0.01, 0)
];
const PUMPJACK_PANEL_POSITION = {
    x: PUMPJACK_POSITION.x,
    y: PUMPJACK_POSITION.y - 0.065,
    z: 0
};
const PUMPJACK_PANEL_STAND = new THREE.Vector3(
    PUMPJACK_PANEL_POSITION.x,
    PUMPJACK_PANEL_POSITION.y - 0.024,
    0
);
const PUMPJACK_INSPECT = new THREE.Vector3(PUMPJACK_POSITION.x + 0.035, PUMPJACK_POSITION.y - 0.055, 0);

function visualMapOffset(vx, vz, scale) {
    return {
        x: vx * scale,
        y: -vz * scale
    };
}

const TANK_EAST_OFFSET = visualMapOffset(0.212, 0, TANK_SCALE);
const TANK_NORTH_OFFSETS = [-0.12, 0, 0.12].map((vx) => visualMapOffset(vx, -0.088, TANK_SCALE));
const PUMP_WEST_OFFSET = visualMapOffset(-0.208, 0, PUMP_SCALE);
const PUMP_NORTH_OFFSET = visualMapOffset(0, -0.096, PUMP_SCALE);
const RIG_EAST_OFFSET = visualMapOffset(0.242, 0.02, RIG_SCALE);

const PUMP_INLET_CONNECTION = {
    x: PUMPJACK_POSITION.x + PUMP_WEST_OFFSET.x,
    y: PUMPJACK_POSITION.y + PUMP_WEST_OFFSET.y
};
const PUMP_OUTLET_CONNECTION = {
    x: PUMPJACK_POSITION.x + PUMP_NORTH_OFFSET.x,
    y: PUMPJACK_POSITION.y + PUMP_NORTH_OFFSET.y
};
const RIG_PROCESS_CONNECTION = {
    x: RIG_POSITION.x + RIG_EAST_OFFSET.x,
    y: RIG_POSITION.y + RIG_EAST_OFFSET.y
};

const TANK_OUTLET_CONNECTIONS = {
    east: {
        x: TANKS_POSITION.x + TANK_EAST_OFFSET.x,
        y: TANKS_POSITION.y + TANK_EAST_OFFSET.y,
        dir: { x: 1, y: 0 }
    },
    northWest: {
        x: TANKS_POSITION.x + TANK_NORTH_OFFSETS[0].x,
        y: TANKS_POSITION.y + TANK_NORTH_OFFSETS[0].y,
        dir: { x: 0, y: 1 }
    },
    northMid: {
        x: TANKS_POSITION.x + TANK_NORTH_OFFSETS[1].x,
        y: TANKS_POSITION.y + TANK_NORTH_OFFSETS[1].y,
        dir: { x: 0, y: 1 }
    },
    northEast: {
        x: TANKS_POSITION.x + TANK_NORTH_OFFSETS[2].x,
        y: TANKS_POSITION.y + TANK_NORTH_OFFSETS[2].y,
        dir: { x: 0, y: 1 }
    }
};

const PIPE_STUBS = [
    { from: TANK_OUTLET_CONNECTIONS.east, inward: { x: -1, y: 0 }, z: TANK_NOZZLE_Z },
    { from: TANK_OUTLET_CONNECTIONS.northWest, inward: { x: 0, y: -1 }, z: TANK_NOZZLE_Z },
    { from: TANK_OUTLET_CONNECTIONS.northMid, inward: { x: 0, y: -1 }, z: TANK_NOZZLE_Z },
    { from: TANK_OUTLET_CONNECTIONS.northEast, inward: { x: 0, y: -1 }, z: TANK_NOZZLE_Z },
    { from: PUMP_INLET_CONNECTION, inward: { x: 1, y: 0 }, z: PIPE_CENTER_Y },
    { from: PUMP_OUTLET_CONNECTION, inward: { x: 0, y: -1 }, z: PIPE_CENTER_Y },
    { from: RIG_PROCESS_CONNECTION, inward: { x: -1, y: 0 }, z: RIG_NOZZLE_Z, length: 0.012 }
];

const PIPE_LINES = [
    {
        name: "tanksHeader",
        height: TANK_NOZZLE_Z,
        points: [
            TANK_OUTLET_CONNECTIONS.northWest,
            TANK_OUTLET_CONNECTIONS.northMid,
            TANK_OUTLET_CONNECTIONS.northEast,
            { x: TANK_OUTLET_CONNECTIONS.east.x, y: TANK_OUTLET_CONNECTIONS.northEast.y },
            TANK_OUTLET_CONNECTIONS.east
        ]
    },
    {
        name: "tanksToPump",
        height: TANK_NOZZLE_Z,
        points: [
            TANK_OUTLET_CONNECTIONS.east,
            { x: TANK_OUTLET_CONNECTIONS.east.x, y: SCENE_LAYOUT.tanksPumpSouthY },
            { x: PUMP_INLET_CONNECTION.x, y: SCENE_LAYOUT.tanksPumpSouthY },
            PUMP_INLET_CONNECTION
        ]
    },
    {
        name: "pumpToRig",
        height: PIPE_CENTER_Y,
        points: [
            PUMP_OUTLET_CONNECTION,
            { x: PUMP_OUTLET_CONNECTION.x, y: SCENE_LAYOUT.processCorridorY },
            { x: SCENE_LAYOUT.eastCorridorX, y: SCENE_LAYOUT.processCorridorY },
            { x: SCENE_LAYOUT.eastCorridorX, y: RIG_PROCESS_CONNECTION.y },
            RIG_PROCESS_CONNECTION
        ]
    }
];

const BUILDING_HALF_Y = SCENE_LAYOUT.buildingFootprint * (0.20 / 0.24) * 0.5;
const BUILDING_DOOR_APPROACH = new THREE.Vector3(
    BUILDING_POSITION.x,
    BUILDING_POSITION.y - BUILDING_HALF_Y - 0.022,
    0
);
const BUILDING_INSIDE = new THREE.Vector3(
    BUILDING_POSITION.x,
    BUILDING_POSITION.y - 0.018,
    0
);
const BUILDING_LEAVE_POINT = new THREE.Vector3(
    BUILDING_POSITION.x + 0.07,
    BUILDING_POSITION.y - BUILDING_HALF_Y - 0.028,
    0
);

const BIRD_MIN_Z = 0.16;

const BIRD_ROUTES = [
    {
        name: "upperCrossing",
        speed: 0.10,
        scale: 1.15,
        delay: 0,
        turnSpeed: 3.2,
        pingPong: true,
        points: [
            { x: -0.44, y: 0.205, z: 0.18 },
            { x: -0.16, y: 0.205, z: 0.20 },
            { x: 0.14, y: 0.205, z: 0.19 },
            { x: 0.42, y: 0.18, z: 0.18 }
        ]
    },
    {
        name: "forestLoop",
        speed: 0.08,
        scale: 0.9,
        delay: 0.8,
        turnSpeed: 2.6,
        pingPong: true,
        points: [
            { x: -0.46, y: 0.08, z: 0.16 },
            { x: -0.44, y: 0.18, z: 0.17 },
            { x: -0.42, y: 0.00, z: 0.16 },
            { x: -0.46, y: -0.10, z: 0.15 }
        ]
    },
    {
        name: "yardPass",
        speed: 0.12,
        scale: 1.05,
        delay: 0.3,
        turnSpeed: 3.8,
        pingPong: true,
        points: [
            { x: -0.14, y: 0.04, z: 0.17 },
            { x: 0.00, y: 0.06, z: 0.18 },
            { x: 0.14, y: 0.04, z: 0.17 },
            { x: 0.00, y: -0.08, z: 0.16 }
        ]
    },
    {
        name: "eastSector",
        speed: 0.07,
        scale: 0.85,
        delay: 1.4,
        turnSpeed: 2.4,
        pingPong: true,
        points: [
            { x: 0.42, y: -0.04, z: 0.16 },
            { x: 0.44, y: 0.06, z: 0.17 },
            { x: 0.42, y: -0.12, z: 0.16 }
        ]
    },
    {
        name: "westSector",
        speed: 0.09,
        scale: 1.0,
        delay: 0.6,
        turnSpeed: 3.0,
        pingPong: true,
        points: [
            { x: -0.44, y: -0.06, z: 0.15 },
            { x: -0.40, y: -0.16, z: 0.16 },
            { x: -0.22, y: -0.18, z: 0.15 }
        ]
    },
    {
        name: "longCircuit",
        speed: 0.11,
        scale: 1.2,
        delay: 1.1,
        turnSpeed: 2.8,
        pingPong: false,
        points: [
            { x: -0.44, y: -0.08, z: 0.17 },
            { x: -0.42, y: 0.10, z: 0.18 },
            { x: -0.10, y: 0.205, z: 0.19 },
            { x: 0.20, y: 0.205, z: 0.18 },
            { x: 0.44, y: 0.08, z: 0.17 },
            { x: 0.42, y: -0.10, z: 0.16 },
            { x: 0.12, y: -0.20, z: 0.15 },
            { x: -0.16, y: -0.20, z: 0.16 }
        ]
    }
];

const BEAR_SPAWNS = [
    {
        name: "bearForest",
        position: { x: SCENE_LAYOUT.bearZones[0].x, y: SCENE_LAYOUT.bearZones[0].y, z: 0 },
        speed: 0.042,
        turnSpeed: 1.55,
        phase: 0.35,
        seed: 11,
        pause: 1.1,
        pauseMin: 0.9,
        pauseMax: 2.6,
        zone: SCENE_LAYOUT.bearZones[0],
        zoneBias: 0.8
    },
    {
        name: "bearRoad",
        position: { x: SCENE_LAYOUT.bearZones[1].x, y: SCENE_LAYOUT.bearZones[1].y, z: 0 },
        speed: 0.062,
        turnSpeed: 1.85,
        phase: 1.7,
        seed: 27,
        pause: 0.5,
        pauseMin: 0.35,
        pauseMax: 1.4,
        zone: SCENE_LAYOUT.bearZones[1],
        zoneBias: 0.74
    },
    {
        name: "bearSnow",
        position: { x: SCENE_LAYOUT.bearZones[2].x, y: SCENE_LAYOUT.bearZones[2].y, z: 0 },
        speed: 0.054,
        turnSpeed: 1.7,
        phase: 2.9,
        seed: 43,
        pause: 0.7,
        pauseMin: 0.5,
        pauseMax: 1.9,
        zone: SCENE_LAYOUT.bearZones[2],
        zoneBias: 0.72
    }
];

const WORKER_SPAWNS = [
    {
        name: "workerRig",
        role: "rigWork",
        workZone: "rig",
        stationed: false,
        climber: true,
        position: { x: RIG_POSITION.x, y: RIG_POSITION.y - 0.08, z: 0 },
        yaw: 0,
        speed: 0.038,
        phase: 1.1,
        scale: 1.03,
        workDuration: 4.8,
        idleDuration: 1.4,
        waypoints: [
            new THREE.Vector3(RIG_POSITION.x, RIG_POSITION.y - 0.08, 0),
            new THREE.Vector3(RIG_POSITION.x - 0.10, RIG_POSITION.y - 0.06, 0),
            new THREE.Vector3(RIG_POSITION.x + 0.08, RIG_POSITION.y - 0.06, 0)
        ]
    },
    {
        name: "workerPatrol",
        role: "patrol",
        workZone: "yard",
        stationed: false,
        buildingVisitor: true,
        position: { x: SCENE_LAYOUT.yard.x, y: SCENE_LAYOUT.yard.y, z: 0 },
        speed: 0.04,
        phase: 0.2,
        scale: 0.98,
        waypoints: [
            new THREE.Vector3(SCENE_LAYOUT.yard.x, SCENE_LAYOUT.yard.y, 0),
            new THREE.Vector3(TANKS_POSITION.x + 0.08, TANKS_POSITION.y + 0.04, 0),
            new THREE.Vector3(BUILDING_POSITION.x + 0.08, BUILDING_POSITION.y - 0.08, 0),
            new THREE.Vector3(SCENE_LAYOUT.eastCorridorX - 0.06, SCENE_LAYOUT.processCorridorY - 0.02, 0)
        ]
    },
    {
        name: "workerTanks",
        role: "tankWork",
        workZone: "tanks",
        stationed: true,
        position: { x: TANKS_POSITION.x + 0.078, y: TANKS_POSITION.y + 0.012, z: 0 },
        yaw: Math.PI,
        speed: 0,
        phase: 2.2,
        scale: 1.02,
        workDuration: 3.2,
        idleDuration: 1.6,
        waypoints: []
    },
    {
        name: "workerPipes",
        role: "pipeWork",
        workZone: "pipes",
        stationed: true,
        position: { x: SCENE_LAYOUT.eastCorridorX - 0.04, y: SCENE_LAYOUT.processCorridorY + 0.02, z: 0 },
        yaw: Math.PI * 0.5,
        speed: 0,
        phase: 0.8,
        scale: 0.97,
        workDuration: 3.8,
        idleDuration: 0.9,
        waypoints: []
    },
    {
        name: "workerField",
        role: "fieldPatrol",
        workZone: "yard",
        stationed: false,
        position: { x: -0.16, y: -0.12, z: 0 },
        speed: 0.036,
        phase: 2.8,
        scale: 1.05,
        waypoints: [
            new THREE.Vector3(-0.16, -0.12, 0),
            new THREE.Vector3(-0.28, -0.18, 0),
            new THREE.Vector3(0.08, -0.16, 0)
        ]
    },
    {
        name: "workerPumpjack",
        role: "pumpWork",
        workZone: "yard",
        stationed: false,
        climber: false,
        pumpOperator: true,
        position: { x: PUMPJACK_POSITION.x, y: PUMPJACK_POSITION.y - 0.092, z: 0 },
        yaw: 0,
        speed: 0.034,
        phase: 1.6,
        scale: 1.04,
        workDuration: 4.2,
        idleDuration: 1.0,
        waypoints: []
    },
    {
        name: "workerNorth",
        role: "northPatrol",
        workZone: "yard",
        stationed: false,
        position: { x: 0.06, y: 0.036, z: 0 },
        speed: 0.033,
        phase: 0.55,
        scale: 0.96,
        waypoints: [
            new THREE.Vector3(0.06, 0.036, 0),
            new THREE.Vector3(-0.12, 0.034, 0),
            new THREE.Vector3(0.16, 0.034, 0)
        ]
    }
];

let kit = null;
let bearsRoot = null;
let workersRoot = null;
let rigRoot = null;
let siteRoot = null;
let natureRoot = null;
const bearInstances = [];
const workerInstances = [];
const birdInstances = [];
let pumpjackBeam = null;
let activeRigWorker = null;
let rigWarningLight = null;
let rigTerminalFx = null;
let pumpjackTerminalFx = null;
let helicopterRoot = null;
let heliPadLightMat = null;
let buildingRoot = null;
let buildingDoor = null;
let buildingDoorOpen = 0;
let activeBuildingWorker = null;
const interactiveObjects = [];

function markInteractive(object, type, title, description) {
    object.userData.interactive = true;
    object.userData.interactiveType = type;
    object.userData.title = title;
    object.userData.description = description;
    if (!interactiveObjects.includes(object)) {
        interactiveObjects.push(object);
    }
}

export function getInteractiveObjects() {
    return interactiveObjects;
}

function isRigWorkCycleActive() {
    const worker = workerInstances.find((item) => item.userData.climber);
    if (!worker) {
        return false;
    }

    const state = worker.userData.climbState;
    return Boolean(activeRigWorker)
        || (state && state !== "idle" && state !== "ground");
}

function isPumpjackWorkCycleActive() {
    const worker = workerInstances.find((item) => item.userData.pumpOperator);
    if (!worker) {
        return false;
    }

    const state = worker.userData.pumpState;
    return Boolean(state && state !== "idle");
}

export function isRigDemoRunning() {
    return isRigWorkCycleActive();
}

export function isPumpjackDemoRunning() {
    return isPumpjackWorkCycleActive();
}

export function requestRigWorkDemo() {
    const worker = workerInstances.find((item) => item.userData.climber);
    if (!worker) {
        return false;
    }

    if (isRigWorkCycleActive()) {
        return false;
    }

    worker.userData.climbWait = 0;
    return true;
}

export function requestPumpjackWorkDemo() {
    const worker = workerInstances.find((item) => item.userData.pumpOperator);
    if (!worker) {
        return false;
    }

    if (isPumpjackWorkCycleActive()) {
        return false;
    }

    worker.userData.climbWait = 0;
    return true;
}

function isHeliCycleBusy() {
    if (!helicopterRoot) {
        return false;
    }

    const mode = helicopterRoot.userData.mode;
    return mode === "approach" || mode === "landing" || mode === "takeoff";
}

export function isHeliDemoRunning() {
    return isHeliCycleBusy();
}

export function requestHeliLandingDemo() {
    if (!helicopterRoot) {
        return false;
    }

    if (isHeliCycleBusy()) {
        return false;
    }

    const data = helicopterRoot.userData;
    if (data.mode === "landed") {
        data.mode = "takeoff";
        data.modeTimer = 0;
        data.spoolTimer = 1.6;
        data.departStarted = false;
        data.departStage = 0;
        data.rotorTarget = HELI_ROTOR_FLY;
        data.demoReturn = true;
        return true;
    }

    data.mode = "approach";
    data.modeTimer = 0;
    data.approachStage = 0;
    data.patrolIndex = 0;
    data.rotorTarget = HELI_ROTOR_FLY;
    data.demoReturn = false;
    return true;
}

function isBuildingVisitActive() {
    const worker = workerInstances.find((item) => item.userData.buildingVisitor);
    if (!worker) {
        return false;
    }

    const state = worker.userData.buildingVisitState;
    return Boolean(activeBuildingWorker)
        || (state && state !== "idle");
}

export function isBuildingDemoRunning() {
    return isBuildingVisitActive();
}

export function requestBuildingWorkDemo() {
    const worker = workerInstances.find((item) => item.userData.buildingVisitor);
    if (!worker) {
        return false;
    }

    if (isBuildingVisitActive()) {
        return false;
    }

    if (worker.userData.climber && isRigWorkCycleActive()) {
        return false;
    }

    worker.userData.buildingVisitState = "approachDoor";
    worker.userData.buildingVisitWait = 0;
    worker.userData.pauseTimer = 0;
    worker.userData.interactHold = 0;
    worker.visible = true;
    activeBuildingWorker = worker;
    return true;
}

function setTerminalFxActive(fx, active) {
    if (!fx || fx.active === Boolean(active)) {
        return;
    }

    fx.active = Boolean(active);
    fx.screenMats.forEach((material) => {
        material.emissive.setHex(active ? 0x3aa7ff : 0x000000);
        material.emissiveIntensity = active ? 1.05 : 0;
    });
    fx.indicatorMats.forEach((material) => {
        material.emissive.copy(material.color);
        material.emissiveIntensity = active ? 0.9 : 0;
    });
    if (fx.light) {
        fx.light.intensity = active ? 0.28 : 0;
    }
}

function setRigTerminalActive(active) {
    setTerminalFxActive(rigTerminalFx, active);
}

function setPumpjackTerminalActive(active) {
    setTerminalFxActive(pumpjackTerminalFx, active);
}

function getKit() {
    if (kit) {
        return kit;
    }

    const lambert = (color) => new THREE.MeshLambertMaterial({ color });
    const standard = (color, roughness = 0.88) => new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: 0
    });

    kit = {
        geo: {
            box: new THREE.BoxGeometry(1, 1, 1),
            sphere: new THREE.SphereGeometry(1, 8, 6),
            sphereMid: new THREE.SphereGeometry(1, 7, 5),
            sphereLow: new THREE.SphereGeometry(1, 6, 4),
            sphereTiny: new THREE.SphereGeometry(1, 5, 4),
            ico: new THREE.IcosahedronGeometry(1, 0),
            capsule: new THREE.CapsuleGeometry(0.075, 0.14, 2, 6),
            cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
            cylLow: new THREE.CylinderGeometry(1, 1, 1, 6),
            cone: new THREE.ConeGeometry(1, 1, 6),
            torus: new THREE.TorusGeometry(1, 0.22, 6, 10)
        },
        mat: {
            fur: standard(0xe6ebef, 0.94),
            furDark: standard(0xc5cdd4, 0.95),
            furPaw: standard(0xdde3e8, 0.94),
            pawPad: standard(0xa8b2b8, 0.92),
            muzzle: standard(0xd2d8de, 0.9),
            nose: standard(0x1a120c, 0.55),
            eye: standard(0x0a0a0a, 0.35),
            earInner: standard(0xc9b8b6, 0.9),
            snow: lambert(0xf4f8fb),
            snowShade: lambert(0xd5dee5),
            steel: lambert(0x3e454c),
            steelDark: lambert(0x22272c),
            steelLight: lambert(0x5c646c),
            yellow: lambert(0xe6b325),
            orange: lambert(0xd35400),
            tank: lambert(0xb7bec4),
            tankDark: lambert(0x6f777e),
            concrete: lambert(0x7a7d80),
            rust: lambert(0x6b3e2e),
            suit: lambert(0x1a1d22),
            suitDark: lambert(0x121416),
            helmet: lambert(0xf0c419),
            skin: lambert(0xc6865a),
            boot: lambert(0x141414),
            glove: lambert(0x1b1b1b),
            reflect: lambert(0xc8ced4),
            containerBlue: lambert(0x2e6aa6),
            containerRed: lambert(0xa33b2b),
            bark: lambert(0x5a3b24),
            pine: lambert(0x2f5c32),
            pineDark: lambert(0x234728),
            bush: lambert(0x3d6b34),
            rock: lambert(0x7a776f),
            stump: lambert(0x6a4a32),
            bird: lambert(0x2c2c2c),
            birdWing: lambert(0x3a3a3a),
            panelScreen: lambert(0x1b4d7a),
            warningRed: new THREE.MeshLambertMaterial({
                color: 0xff2a2a,
                emissive: 0xff0000,
                emissiveIntensity: 1.6
            }),
            padLight: new THREE.MeshLambertMaterial({
                color: 0xe6b325,
                emissive: 0xe69000,
                emissiveIntensity: 0.7
            })
        }
    };

    return kit;
}

function addPart(parent, geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(rx, ry, rz);
    parent.add(mesh);
    return mesh;
}

function addBrandMark(parent, x, y, z, scale = 1, ry = 0) {
    const { geo, mat } = getKit();
    const mark = new THREE.Group();
    mark.name = "brandMark";
    mark.position.set(x, y, z);
    mark.rotation.y = ry;
    addPart(mark, geo.box, mat.steelDark, 0, 0, 0, 0.026 * scale, 0.026 * scale, 0.005 * scale);
    addPart(mark, geo.box, mat.yellow, 0, 0.002 * scale, 0.0036 * scale, 0.006 * scale, 0.016 * scale, 0.003 * scale);
    addPart(mark, geo.box, mat.yellow, 0.007 * scale, -0.005 * scale, 0.0036 * scale, 0.014 * scale, 0.005 * scale, 0.003 * scale);
    addPart(mark, geo.box, mat.reflect, -0.007 * scale, 0.007 * scale, 0.0036 * scale, 0.006 * scale, 0.006 * scale, 0.002 * scale);
    parent.add(mark);
    return mark;
}

function addBrandPlaque(parent, x, y, z, rx = 0, ry = 0, rz = 0, scale = 1) {
    const { geo, mat } = getKit();
    const plaque = new THREE.Group();
    plaque.name = "brandPlaque";
    plaque.position.set(x, y, z);
    plaque.rotation.set(rx, ry, rz);
    addPart(plaque, geo.box, mat.steelDark, 0, 0, 0, 0.09 * scale, 0.032 * scale, 0.008 * scale);
    addPart(plaque, geo.box, mat.yellow, 0, 0.013 * scale, 0.005 * scale, 0.09 * scale, 0.004 * scale, 0.002 * scale);
    addPart(plaque, geo.box, mat.yellow, 0, -0.013 * scale, 0.005 * scale, 0.09 * scale, 0.004 * scale, 0.002 * scale);
    addBrandMark(plaque, -0.026 * scale, 0, 0.006 * scale, 0.85 * scale);
    addPart(plaque, geo.box, mat.yellow, 0.016 * scale, 0.004 * scale, 0.005 * scale, 0.032 * scale, 0.004 * scale, 0.002 * scale);
    addPart(plaque, geo.box, mat.reflect, 0.014 * scale, -0.004 * scale, 0.005 * scale, 0.026 * scale, 0.003 * scale, 0.002 * scale);
    parent.add(plaque);
    return plaque;
}

function addStrut(parent, geo, mat, x1, y1, z1, x2, y2, z2, radius) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dy, dz) || 0.001;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    mesh.scale.set(radius, len, radius);
    mesh.quaternion.setFromUnitVectors(_up, _dir.set(dx / len, dy / len, dz / len));
    parent.add(mesh);
    return mesh;
}

function placeYUpByHeight(model, targetHeight) {
    model.rotation.x = Math.PI / 2;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    if (size.z > 0 && targetHeight > 0) {
        model.scale.setScalar(targetHeight / size.z);
        model.updateMatrixWorld(true);
        box.setFromObject(model);
    }

    model.position.set(
        -(box.min.x + box.max.x) / 2,
        -(box.min.y + box.max.y) / 2,
        -box.min.z
    );
}

function placeYUpByFootprint(model, footprint) {
    model.rotation.x = Math.PI / 2;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const current = Math.max(size.x, size.y);

    if (current > 0 && footprint > 0) {
        model.scale.setScalar(footprint / current);
        model.updateMatrixWorld(true);
        box.setFromObject(model);
    }

    model.position.set(
        -(box.min.x + box.max.x) / 2,
        -(box.min.y + box.max.y) / 2,
        -box.min.z
    );
}

function createPlacedGroup(visual, position, yaw = 0) {
    const group = new THREE.Group();
    group.add(visual);
    group.position.set(position.x, position.y, position.z || 0);
    group.rotation.z = yaw;
    return group;
}

function createRng(seed) {
    let state = seed % 2147483647;
    if (state <= 0) {
        state += 2147483646;
    }

    return () => {
        state = state * 16807 % 2147483647;
        return (state - 1) / 2147483646;
    };
}

function getFacingYaw(from, to) {
    return Math.atan2(to.x - from.x, -(to.y - from.y));
}

const CLIMB_YAW = getFacingYaw(RIG_CLIMB_PATH[0], RIG_CLIMB_PATH[RIG_CLIMB_PATH.length - 1]);
const DESCEND_YAW = CLIMB_YAW;

function lerpAngle(current, target, maxStep) {
    let diff = target - current;

    while (diff > Math.PI) {
        diff -= Math.PI * 2;
    }

    while (diff < -Math.PI) {
        diff += Math.PI * 2;
    }

    if (Math.abs(diff) <= maxStep) {
        return target;
    }

    return current + Math.sign(diff) * maxStep;
}

function isInsideBounds(x, y) {
    return x >= BEAR_WANDER_BOUNDS.minX
        && x <= BEAR_WANDER_BOUNDS.maxX
        && y >= BEAR_WANDER_BOUNDS.minY
        && y <= BEAR_WANDER_BOUNDS.maxY;
}

function isInsideObstacle(x, y, obstacle, padding = 0) {
    const radiusX = obstacle.radiusX + padding;
    const radiusY = obstacle.radiusY + padding;

    if (radiusX <= 0 || radiusY <= 0) {
        return false;
    }

    const dx = (x - obstacle.x) / radiusX;
    const dy = (y - obstacle.y) / radiusY;
    return dx * dx + dy * dy < 1;
}

export function isPointInsideSceneObstacle(point, padding = CHARACTER_RADIUS) {
    return SCENE_OBSTACLES.some((obstacle) => isInsideObstacle(point.x, point.y, obstacle, padding));
}

function segmentHitsUnitCircle(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const startInside = x1 * x1 + y1 * y1 < 1;

    if (startInside) {
        return true;
    }

    const a = dx * dx + dy * dy;

    if (a < 1e-12) {
        return startInside;
    }

    const b = 2 * (x1 * dx + y1 * dy);
    const c = x1 * x1 + y1 * y1 - 1;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
        return false;
    }

    const sqrt = Math.sqrt(discriminant);
    const t1 = (-b - sqrt) / (2 * a);
    const t2 = (-b + sqrt) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

function segmentHitsObstacle(ax, ay, bx, by, obstacle, padding = 0) {
    const radiusX = obstacle.radiusX + padding;
    const radiusY = obstacle.radiusY + padding;

    if (radiusX <= 0 || radiusY <= 0) {
        return false;
    }

    return segmentHitsUnitCircle(
        (ax - obstacle.x) / radiusX,
        (ay - obstacle.y) / radiusY,
        (bx - obstacle.x) / radiusX,
        (by - obstacle.y) / radiusY
    );
}

function doesPathCrossObstacle(from, to, padding = CHARACTER_RADIUS) {
    if (isPointInsideSceneObstacle(to, padding)) {
        return true;
    }

    return SCENE_OBSTACLES.some((obstacle) => {
        return segmentHitsObstacle(from.x, from.y, to.x, to.y, obstacle, padding);
    });
}

function isPathAllowed(ax, ay, bx, by, padding = CHARACTER_RADIUS) {
    if (!isInsideBounds(bx, by) || isPointInsideSceneObstacle({ x: bx, y: by }, padding)) {
        return false;
    }

    return !doesPathCrossObstacle({ x: ax, y: ay }, { x: bx, y: by }, padding);
}

function pickPointInZone(rng, zone) {
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng());
    return {
        x: zone.x + Math.cos(angle) * zone.radiusX * radius,
        y: zone.y + Math.sin(angle) * zone.radiusY * radius
    };
}

function pickRandomWanderPoint(rng, fromX, fromY, zone, zoneBias = 0) {
    for (let i = 0; i < 32; i += 1) {
        let x;
        let y;

        if (zone && rng() < zoneBias) {
            const local = pickPointInZone(rng, zone);
            x = local.x;
            y = local.y;
        } else {
            x = THREE.MathUtils.lerp(BEAR_WANDER_BOUNDS.minX, BEAR_WANDER_BOUNDS.maxX, rng());
            y = THREE.MathUtils.lerp(BEAR_WANDER_BOUNDS.minY, BEAR_WANDER_BOUNDS.maxY, rng());
        }

        if (isPathAllowed(fromX, fromY, x, y) && !isPointInsideSceneObstacle({ x, y })) {
            return new THREE.Vector3(x, y, 0);
        }
    }

    const probes = [
        [0.08, 0], [-0.08, 0], [0, 0.08], [0, -0.08],
        [0.06, 0.06], [-0.06, 0.06], [0.06, -0.06], [-0.06, -0.06]
    ];

    for (let i = 0; i < probes.length; i += 1) {
        const x = THREE.MathUtils.clamp(
            fromX + probes[i][0],
            BEAR_WANDER_BOUNDS.minX,
            BEAR_WANDER_BOUNDS.maxX
        );
        const y = THREE.MathUtils.clamp(
            fromY + probes[i][1],
            BEAR_WANDER_BOUNDS.minY,
            BEAR_WANDER_BOUNDS.maxY
        );

        if (isPathAllowed(fromX, fromY, x, y) && !isPointInsideSceneObstacle({ x, y })) {
            return new THREE.Vector3(x, y, 0);
        }
    }

    return new THREE.Vector3(fromX, fromY, 0);
}

function createBearMesh(geometry, material, position, scale) {
    const mesh = new THREE.Mesh(geometry, material);

    if (position) {
        mesh.position.copy(position);
    }

    if (scale) {
        mesh.scale.copy(scale);
    }

    return mesh;
}

function createBearLeg(shared, x, z, isFront) {
    const { geo, mat } = shared;
    const leg = new THREE.Group();
    leg.position.set(x, 0.30, z);

    const thigh = new THREE.Mesh(geo.capsule, mat.furPaw);
    thigh.position.y = -0.12;
    if (isFront) {
        thigh.scale.set(0.93, 1, 0.93);
    }

    const foot = createBearMesh(
        geo.sphereLow,
        mat.pawPad,
        new THREE.Vector3(0, -0.28, 0.035),
        new THREE.Vector3(isFront ? 0.10 : 0.115, 0.045, 0.14)
    );

    leg.add(thigh, foot);
    return leg;
}

export function createLowPolyBear() {
    const shared = getKit();
    const { geo, mat } = shared;
    const group = new THREE.Group();
    group.name = "bearGroup";

    const bodyPivot = new THREE.Group();
    bodyPivot.name = "body";
    bodyPivot.position.set(0, 0.40, 0);
    bodyPivot.userData.restY = 0.40;

    bodyPivot.add(
        createBearMesh(geo.sphere, mat.fur, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.36, 0.30, 0.50)),
        createBearMesh(geo.sphereMid, mat.furDark, new THREE.Vector3(0, 0.18, -0.12), new THREE.Vector3(0.22, 0.14, 0.24))
    );

    const tailPivot = new THREE.Group();
    tailPivot.name = "tail";
    tailPivot.position.set(0, -0.04, -0.48);
    tailPivot.add(createBearMesh(
        geo.sphereLow,
        mat.fur,
        new THREE.Vector3(0, 0, -0.04),
        new THREE.Vector3(0.07, 0.065, 0.09)
    ));
    bodyPivot.add(tailPivot);

    const headPivot = new THREE.Group();
    headPivot.name = "head";
    headPivot.position.set(0, 0.14, 0.40);
    headPivot.add(
        createBearMesh(geo.sphere, mat.fur, new THREE.Vector3(0, 0.08, 0.08), new THREE.Vector3(0.22, 0.20, 0.20)),
        createBearMesh(geo.sphereMid, mat.muzzle, new THREE.Vector3(0, 0.03, 0.26), new THREE.Vector3(0.10, 0.08, 0.14)),
        createBearMesh(geo.sphereLow, mat.nose, new THREE.Vector3(0, 0.045, 0.39), new THREE.Vector3(0.035, 0.03, 0.03)),
        createBearMesh(geo.sphereLow, mat.fur, new THREE.Vector3(-0.14, 0.24, 0.02), new THREE.Vector3(0.08, 0.09, 0.06)),
        createBearMesh(geo.sphereLow, mat.fur, new THREE.Vector3(0.14, 0.24, 0.02), new THREE.Vector3(0.08, 0.09, 0.06)),
        createBearMesh(geo.sphereTiny, mat.earInner, new THREE.Vector3(-0.14, 0.24, 0.055), new THREE.Vector3(0.045, 0.05, 0.02)),
        createBearMesh(geo.sphereTiny, mat.earInner, new THREE.Vector3(0.14, 0.24, 0.055), new THREE.Vector3(0.045, 0.05, 0.02)),
        createBearMesh(geo.sphereTiny, mat.eye, new THREE.Vector3(-0.08, 0.12, 0.24), new THREE.Vector3(0.028, 0.032, 0.028)),
        createBearMesh(geo.sphereTiny, mat.eye, new THREE.Vector3(0.08, 0.12, 0.24), new THREE.Vector3(0.028, 0.032, 0.028))
    );
    bodyPivot.add(headPivot);

    const frontLeftLeg = createBearLeg(shared, -0.18, 0.24, true);
    const frontRightLeg = createBearLeg(shared, 0.18, 0.24, true);
    const backLeftLeg = createBearLeg(shared, -0.20, -0.28, false);
    const backRightLeg = createBearLeg(shared, 0.20, -0.28, false);

    group.add(bodyPivot, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg);
    group.userData.parts = {
        body: bodyPivot,
        head: headPivot,
        frontLegs: { left: frontLeftLeg, right: frontRightLeg },
        backLegs: { left: backLeftLeg, right: backRightLeg },
        tail: tailPivot
    };

    return group;
}

export function createBearInstance(config) {
    const visual = createLowPolyBear();
    placeYUpByHeight(visual, BEAR_HEIGHT);

    const rng = createRng(config.seed);
    const root = createPlacedGroup(visual, config.position, config.yaw || 0);
    root.name = config.name;
    root.userData.isProcedural = true;
    root.userData.parts = visual.userData.parts;
    root.userData.speed = config.speed;
    root.userData.turnSpeed = config.turnSpeed || BEAR_TURN_SPEED;
    root.userData.phase = config.phase;
    root.userData.rng = rng;
    root.userData.pauseTimer = config.pause || 0;
    root.userData.pauseMin = config.pauseMin || 0.4;
    root.userData.pauseMax = config.pauseMax || 1.8;
    root.userData.zone = config.zone || null;
    root.userData.zoneBias = config.zoneBias || 0;
    root.userData.walkAmount = 0;
    root.userData.walkDisplay = 0;
    root.userData.target = pickRandomWanderPoint(
        rng,
        config.position.x,
        config.position.y,
        config.zone,
        config.zoneBias
    );
    root.userData.interactHold = 0;
    markInteractive(
        root,
        "bear",
        "Белый медведь",
        "Северный ландшафт рядом с промышленной площадкой напоминает о том, что работа человека здесь проходит в суровой природной среде."
    );

    return root;
}

export function createProceduralBears() {
    if (bearsRoot) {
        return Promise.resolve(bearsRoot);
    }

    bearsRoot = new THREE.Group();
    bearsRoot.name = "bearsRoot";

    BEAR_SPAWNS.forEach((config) => {
        const bear = createBearInstance(config);
        bearInstances.push(bear);
        bearsRoot.add(bear);
    });

    return Promise.resolve(bearsRoot);
}

function updateBearInstanceAnimation(bear, delta, elapsedTime) {
    const parts = bear.userData.parts;
    if (!parts) {
        return;
    }

    bear.userData.walkDisplay = THREE.MathUtils.damp(
        bear.userData.walkDisplay,
        bear.userData.walkAmount,
        8,
        delta
    );

    const amount = bear.userData.walkDisplay;
    const t = elapsedTime * BEAR_WALK_FREQUENCY + bear.userData.phase;
    const swing = Math.sin(t) * 0.42 * amount;
    const idle = 1 - amount;

    parts.frontLegs.left.rotation.x = swing;
    parts.backLegs.right.rotation.x = swing;
    parts.frontLegs.right.rotation.x = -swing;
    parts.backLegs.left.rotation.x = -swing;

    parts.body.position.y = parts.body.userData.restY + Math.abs(Math.sin(t * 2)) * 0.018 * amount;
    parts.body.rotation.z = Math.sin(t) * 0.07 * amount;
    parts.body.rotation.x = Math.sin(t * 2) * 0.045 * amount + Math.sin(elapsedTime * 1.4 + bear.userData.phase) * 0.02 * idle;
    parts.head.rotation.x = Math.sin(t * 2) * 0.08 * amount + Math.sin(elapsedTime * 1.1 + bear.userData.phase) * 0.03 * idle;
    parts.head.rotation.y = Math.sin(t * 0.5) * 0.10 * amount;
    parts.tail.rotation.z = Math.sin(t * 2.2) * 0.35 * amount + Math.sin(elapsedTime * 2 + bear.userData.phase) * 0.12 * idle;

    if (bear.userData.interactHold > 0) {
        parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, 0.55, 0.18);
        parts.head.rotation.x = THREE.MathUtils.lerp(parts.head.rotation.x, 0.14, 0.14);
    }
}

function updateBearInstanceMovement(bear, delta) {
    const data = bear.userData;
    const position = bear.position;

    if (data.interactHold > 0) {
        data.interactHold -= delta;
        data.walkAmount = 0;
        return;
    }

    if (data.pauseTimer > 0) {
        data.pauseTimer -= delta;
        data.walkAmount = 0;

        if (data.pauseTimer <= 0) {
            data.target = pickRandomWanderPoint(
                data.rng,
                position.x,
                position.y,
                data.zone,
                data.zoneBias
            );
        }

        return;
    }

    const target = data.target;
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= BEAR_REACH_EPSILON) {
        data.pauseTimer = data.pauseMin + data.rng() * (data.pauseMax - data.pauseMin);
        data.walkAmount = 0;
        return;
    }

    if (doesPathCrossObstacle(position, target) || !isInsideBounds(target.x, target.y)) {
        data.target = pickRandomWanderPoint(
            data.rng,
            position.x,
            position.y,
            data.zone,
            data.zoneBias
        );
        data.walkAmount = 0;
        return;
    }

    const nextX = position.x + (dx / distance) * Math.min(data.speed * delta, distance);
    const nextY = position.y + (dy / distance) * Math.min(data.speed * delta, distance);

    if (!isPathAllowed(position.x, position.y, nextX, nextY)) {
        data.target = pickRandomWanderPoint(
            data.rng,
            position.x,
            position.y,
            data.zone,
            data.zoneBias
        );
        data.walkAmount = 0;
        return;
    }

    bear.rotation.z = lerpAngle(
        bear.rotation.z,
        getFacingYaw(position, target),
        data.turnSpeed * delta
    );

    position.x = nextX;
    position.y = nextY;
    position.z = 0;
    data.walkAmount = 1;
}

export function updateBearMovement(delta) {
    bearInstances.forEach((bear) => {
        updateBearInstanceMovement(bear, delta);
    });
}

export function updateBearAnimation(delta, elapsedTime) {
    bearInstances.forEach((bear) => {
        updateBearInstanceAnimation(bear, delta, elapsedTime);
    });
}

function createLimb(shared, isArm) {
    const { geo, mat } = shared;
    const limb = new THREE.Group();
    const upper = addPart(
        limb,
        geo.cylLow,
        isArm ? mat.suit : mat.suitDark,
        0,
        isArm ? -0.09 : -0.11,
        0,
        isArm ? 0.035 : 0.042,
        isArm ? 0.16 : 0.20,
        isArm ? 0.035 : 0.042
    );
    const lower = addPart(
        limb,
        geo.cylLow,
        isArm ? mat.suit : mat.suitDark,
        0,
        isArm ? -0.20 : -0.26,
        0,
        isArm ? 0.03 : 0.038,
        isArm ? 0.12 : 0.16,
        isArm ? 0.03 : 0.038
    );
    const end = addPart(
        limb,
        geo.sphereLow,
        isArm ? mat.glove : mat.boot,
        0,
        isArm ? -0.27 : -0.35,
        isArm ? 0.01 : 0.02,
        isArm ? 0.032 : 0.045,
        isArm ? 0.028 : 0.03,
        isArm ? 0.04 : 0.07
    );
    limb.userData.meshes = { upper, lower, end };
    return limb;
}

export function createProceduralOilWorker() {
    const shared = getKit();
    const { geo, mat } = shared;
    const workerGroup = new THREE.Group();
    workerGroup.name = "workerGroup";

    const body = new THREE.Group();
    body.name = "body";
    body.position.set(0, 0.36, 0);
    body.userData.restY = 0.36;

    const torso = addPart(body, geo.box, mat.suit, 0, 0.04, 0, 0.22, 0.28, 0.14);
    addPart(body, geo.box, mat.suitDark, 0, -0.08, 0.01, 0.20, 0.10, 0.13);
    addPart(body, geo.box, mat.yellow, -0.09, 0.15, 0.01, 0.08, 0.04, 0.13);
    addPart(body, geo.box, mat.yellow, 0.09, 0.15, 0.01, 0.08, 0.04, 0.13);
    addPart(body, geo.box, mat.reflect, 0, 0.09, 0.074, 0.18, 0.012, 0.008);
    addPart(body, geo.box, mat.reflect, 0, 0.02, 0.074, 0.18, 0.01, 0.008);
    addPart(body, geo.box, mat.yellow, 0, -0.04, 0.074, 0.16, 0.008, 0.006);
    addBrandMark(body, 0.045, 0.055, 0.08, 0.72);
    const backpack = addPart(body, geo.box, mat.suitDark, 0, 0.05, -0.09, 0.14, 0.16, 0.06);
    addPart(body, geo.box, mat.reflect, 0, 0.05, -0.122, 0.12, 0.01, 0.004);

    const head = new THREE.Group();
    head.name = "head";
    head.position.set(0, 0.24, 0);
    addPart(head, geo.sphere, mat.skin, 0, 0, 0.01, 0.08, 0.09, 0.08);
    const helmet = new THREE.Group();
    helmet.name = "helmet";
    addPart(helmet, geo.cylLow, mat.helmet, 0, 0.06, 0, 0.09, 0.06, 0.09);
    addPart(helmet, geo.cylLow, mat.suitDark, 0, 0.042, 0, 0.093, 0.012, 0.093);
    addPart(helmet, geo.cylLow, mat.helmet, 0, 0.035, 0.04, 0.10, 0.015, 0.11);
    addBrandMark(helmet, 0, 0.058, 0.05, 0.42);
    head.add(helmet);
    body.add(head);

    const leftArm = createLimb(shared, true);
    leftArm.name = "leftArm";
    leftArm.position.set(-0.14, 0.12, 0);
    addPart(leftArm, geo.box, mat.yellow, 0, -0.09, 0.02, 0.04, 0.02, 0.014);
    addPart(leftArm, geo.box, mat.reflect, 0, -0.14, 0.02, 0.036, 0.008, 0.01);
    const rightArm = createLimb(shared, true);
    rightArm.name = "rightArm";
    rightArm.position.set(0.14, 0.12, 0);
    addPart(rightArm, geo.box, mat.reflect, 0, -0.14, 0.02, 0.036, 0.008, 0.01);
    body.add(leftArm, rightArm);

    const hips = new THREE.Group();
    hips.position.set(0, 0.36, 0);
    const leftLeg = createLimb(shared, false);
    leftLeg.name = "leftLeg";
    leftLeg.position.set(-0.06, 0, 0);
    const rightLeg = createLimb(shared, false);
    rightLeg.name = "rightLeg";
    rightLeg.position.set(0.06, 0, 0);
    hips.add(leftLeg, rightLeg);

    workerGroup.add(body, hips);
    workerGroup.userData.parts = {
        body,
        head,
        helmet,
        torso,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        boots: { left: leftLeg.userData.meshes.end, right: rightLeg.userData.meshes.end },
        backpack
    };

    return workerGroup;
}

function createWorkerInstance(config) {
    const visual = createProceduralOilWorker();
    placeYUpByHeight(visual, WORKER_HEIGHT * (config.scale || 1));

    const yaw = config.yaw !== undefined
        ? config.yaw
        : (config.waypoints[1] ? getFacingYaw(config.position, config.waypoints[1]) : 0);

    const root = createPlacedGroup(visual, config.position, yaw);
    root.name = config.name;
    root.userData.role = config.role;
    root.userData.workZone = config.workZone || "yard";
    root.userData.stationed = Boolean(config.stationed);
    root.userData.mode = config.stationed ? "work" : "walk";
    root.userData.parts = visual.userData.parts;
    root.userData.waypoints = config.waypoints;
    root.userData.waypointIndex = 0;
    root.userData.speed = config.speed;
    root.userData.phase = config.phase;
    root.userData.pauseTimer = config.stationed ? 0 : 0.2;
    root.userData.workDuration = config.workDuration || 3.6;
    root.userData.idleDuration = config.idleDuration || 1.2;
    root.userData.workTimer = config.stationed ? root.userData.workDuration : 0;
    root.userData.climber = Boolean(config.climber);
    root.userData.pumpOperator = Boolean(config.pumpOperator);
    root.userData.buildingVisitor = Boolean(config.buildingVisitor);
    root.userData.climbState = config.climber ? "idle" : null;
    root.userData.pumpState = config.pumpOperator ? "idle" : null;
    root.userData.buildingVisitState = config.buildingVisitor ? "idle" : null;
    root.userData.climbIndex = 0;
    root.userData.climbT = 0;
    root.userData.climbWait = config.climber
        ? (config.climbWait !== undefined ? config.climbWait : 2 + config.phase)
        : (config.pumpOperator ? 1.2 + config.phase : 0);
    root.userData.interactHold = 0;
    markInteractive(
        root,
        "worker",
        "Нефтяник",
        "Работа на промысле — это постоянный контроль оборудования, технические операции и обслуживание объектов в самых разных условиях."
    );

    return root;
}

export function createProceduralWorkers() {
    if (workersRoot) {
        return Promise.resolve(workersRoot);
    }

    workersRoot = new THREE.Group();
    workersRoot.name = "workersRoot";

    WORKER_SPAWNS.forEach((config) => {
        const worker = createWorkerInstance(config);
        workerInstances.push(worker);
        workersRoot.add(worker);
    });

    return Promise.resolve(workersRoot);
}

export function updateWorkerAnimation(worker, delta, elapsedTime) {
    const parts = worker.userData.parts;
    if (!parts) {
        return;
    }

    if (worker.userData.interactHold > 0) {
        parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, 0.48, 0.2);
        parts.head.rotation.x = THREE.MathUtils.lerp(parts.head.rotation.x, 0.08, 0.15);
        parts.body.rotation.z = THREE.MathUtils.lerp(parts.body.rotation.z, 0.06, 0.12);
        return;
    }

    const t = elapsedTime * 6.2 + worker.userData.phase;
    const mode = worker.userData.mode;

    if (mode === "walk") {
        const swing = Math.sin(t) * 0.48;
        parts.leftLeg.rotation.x = swing;
        parts.rightLeg.rotation.x = -swing;
        parts.leftArm.rotation.x = -swing * 0.7;
        parts.rightArm.rotation.x = swing * 0.7;
        parts.body.rotation.z = Math.sin(t) * 0.05;
        parts.body.rotation.x = Math.sin(t * 2) * 0.03;
        parts.body.position.y = parts.body.userData.restY + Math.abs(Math.sin(t * 2)) * 0.008;
        parts.head.rotation.y = Math.sin(t * 0.5) * 0.08;
        parts.head.rotation.x = 0;
        parts.leftArm.rotation.z = 0;
        parts.rightArm.rotation.z = 0;
    } else if (mode === "climb" || mode === "descend") {
        const swing = Math.sin(t * 1.1) * 0.32;
        parts.leftLeg.rotation.x = swing;
        parts.rightLeg.rotation.x = -swing;
        parts.leftArm.rotation.x = -0.7 + swing * 0.25;
        parts.rightArm.rotation.x = -0.7 - swing * 0.25;
        parts.body.rotation.x = 0.08;
        parts.body.position.y = parts.body.userData.restY;
        parts.head.rotation.y = 0;
        parts.head.rotation.x = 0;
        parts.leftArm.rotation.z = 0;
        parts.rightArm.rotation.z = 0;
    } else if (mode === "workTerminal" || mode === "workControlPanel" || mode === "workHigh") {
        parts.leftLeg.rotation.x = 0.05;
        parts.rightLeg.rotation.x = -0.04;
        parts.body.rotation.x = 0.16 + Math.sin(t * 1.2) * 0.05;
        parts.body.rotation.z = Math.sin(t * 0.9) * 0.03;
        parts.rightArm.rotation.x = -1.05 + Math.sin(t * 2.2) * 0.22;
        parts.rightArm.rotation.z = 0.12;
        parts.leftArm.rotation.x = -0.55 + Math.sin(t * 1.4) * 0.08;
        parts.head.rotation.y = Math.sin(elapsedTime * 0.7 + worker.userData.phase) * 0.22;
        parts.head.rotation.x = 0.08;
        parts.body.position.y = parts.body.userData.restY;
    } else if (mode === "inspectRig") {
        parts.leftLeg.rotation.x = 0.04;
        parts.rightLeg.rotation.x = -0.05;
        parts.body.rotation.x = 0.12 + Math.sin(t * 0.8) * 0.04;
        parts.body.rotation.z = Math.sin(t * 0.6) * 0.03;
        parts.rightArm.rotation.x = -0.55 + Math.sin(t * 1.6) * 0.16;
        parts.leftArm.rotation.x = -0.28 + Math.sin(t * 1.2) * 0.08;
        parts.head.rotation.x = 0.22 + Math.sin(elapsedTime * 0.5 + worker.userData.phase) * 0.08;
        parts.head.rotation.y = Math.sin(elapsedTime * 0.45 + worker.userData.phase) * 0.2;
        parts.body.position.y = parts.body.userData.restY;
    } else if (mode === "inspectPumpjack") {
        parts.leftLeg.rotation.x = 0.06;
        parts.rightLeg.rotation.x = -0.05;
        parts.body.rotation.x = 0.22 + Math.sin(t * 0.9) * 0.04;
        parts.rightArm.rotation.x = -0.45 + Math.sin(t * 1.5) * 0.12;
        parts.leftArm.rotation.x = -0.22 + Math.sin(t * 1.1) * 0.08;
        parts.head.rotation.x = 0.18;
        parts.head.rotation.y = Math.sin(elapsedTime * 0.45 + worker.userData.phase) * 0.18;
        parts.body.position.y = parts.body.userData.restY;
    } else if (mode === "work") {
        parts.leftLeg.rotation.x = 0.08;
        parts.rightLeg.rotation.x = -0.04;
        parts.body.rotation.x = 0.18 + Math.sin(t * 1.4) * 0.06;
        parts.body.rotation.z = Math.sin(t * 0.8) * 0.03;
        parts.rightArm.rotation.x = -0.85 + Math.sin(t * 2.1) * 0.28;
        parts.rightArm.rotation.z = 0.15;
        parts.leftArm.rotation.x = -0.35 + Math.sin(t * 1.6) * 0.12;
        parts.head.rotation.x = 0.12;
        parts.body.position.y = parts.body.userData.restY;
    } else {
        const idle = Math.sin(elapsedTime * 1.3 + worker.userData.phase);
        parts.leftLeg.rotation.x = 0.03;
        parts.rightLeg.rotation.x = -0.03;
        parts.leftArm.rotation.x = 0.08;
        parts.rightArm.rotation.x = -0.06;
        parts.body.rotation.x = idle * 0.02;
        parts.body.rotation.z = 0;
        parts.body.position.y = parts.body.userData.restY + idle * 0.004;
        parts.head.rotation.y = Math.sin(elapsedTime * 0.7 + worker.userData.phase) * 0.12;
        parts.head.rotation.x = 0;
        parts.leftArm.rotation.z = 0;
        parts.rightArm.rotation.z = 0;
    }

    void delta;
}

function findClearWorkerWaypoint(worker, startIndex) {
    const waypoints = worker.userData.waypoints;
    if (!waypoints.length) {
        return -1;
    }

    for (let offset = 0; offset < waypoints.length; offset += 1) {
        const index = (startIndex + offset) % waypoints.length;
        const candidate = waypoints[index];

        if (isPathAllowed(worker.position.x, worker.position.y, candidate.x, candidate.y)) {
            return index;
        }
    }

    return -1;
}

function moveAlongClimbPath(worker, delta, reverse) {
    const data = worker.userData;
    const path = RIG_CLIMB_PATH;
    const start = reverse ? path[path.length - 1 - data.climbIndex] : path[data.climbIndex];
    const end = reverse ? path[path.length - 2 - data.climbIndex] : path[data.climbIndex + 1];
    const length = start.distanceTo(end) || 0.001;
    data.climbT += (CLIMB_SPEED * delta) / length;

    if (data.climbT >= 1) {
        worker.position.copy(end);
        data.climbT = 0;
        data.climbIndex += 1;
        return data.climbIndex >= path.length - 1;
    }

    worker.position.lerpVectors(start, end, data.climbT);
    worker.rotation.z = lerpAngle(
        worker.rotation.z,
        reverse ? DESCEND_YAW : CLIMB_YAW,
        3.4 * delta
    );
    return false;
}

function walkToward(worker, target, delta, speed, lockZ) {
    const dx = target.x - worker.position.x;
    const dy = target.y - worker.position.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= 0.016) {
        worker.position.x = target.x;
        worker.position.y = target.y;
        if (lockZ) {
            worker.position.z = target.z;
        }
        return true;
    }

    worker.rotation.z = lerpAngle(
        worker.rotation.z,
        getFacingYaw(worker.position, target),
        2.6 * delta
    );
    const step = Math.min(speed * delta, distance);
    worker.position.x += (dx / distance) * step;
    worker.position.y += (dy / distance) * step;
    worker.position.z = lockZ ? target.z : 0;
    return false;
}

function getGroundWorkPoint(worker) {
    const waypoints = worker.userData.waypoints;
    if (waypoints && waypoints.length) {
        return waypoints[0];
    }

    const zone = WORK_ZONES.find((item) => item.name === worker.userData.workZone);
    if (zone) {
        return new THREE.Vector3(zone.x, zone.y, 0);
    }

    return new THREE.Vector3(0.10, 0.10, 0);
}

function finishRigCycle(worker) {
    const data = worker.userData;
    data.climbState = "idle";
    data.mode = "idle";
    data.climbWait = 8 + Math.random() * 5;
    data.inspectIndex = 0;
    data.inspectHold = 0;
    data.inspectLeft = undefined;
    data.enterClear = false;
    setRigTerminalActive(false);
    if (activeRigWorker === worker) {
        activeRigWorker = null;
    }
}

function updateClimber(worker, delta) {
    const data = worker.userData;
    const path = RIG_CLIMB_PATH;
    const hatch = path[path.length - 1];
    const panelMap = rigLocalToMap(RIG_TERMINAL_LOCAL.x, RIG_LADDER_Y1, RIG_TERMINAL_LOCAL.z);

    if (data.climbState === "idle" || data.climbState === "ground") {
        data.climbWait -= delta;
        if (data.climbWait <= 0 && !activeRigWorker) {
            activeRigWorker = worker;
            data.climbState = "approachRig";
            data.mode = "walk";
            data.enterClear = false;
            data.returnViaEntry = false;
            return true;
        }
        return false;
    }

    if (data.climbState === "approachRig" || data.climbState === "toLadder") {
        data.mode = "walk";
        if (walkToward(worker, path[0], delta, data.speed, false)) {
            data.climbState = "climb";
            data.mode = "climb";
            data.climbIndex = 0;
            data.climbT = 0;
            worker.rotation.z = CLIMB_YAW;
        }
        return true;
    }

    if (data.climbState === "climb") {
        data.mode = "climb";
        const done = moveAlongClimbPath(worker, delta, false);
        if (done) {
            worker.position.copy(hatch);
            data.climbState = "enterPlatform";
            data.mode = "walk";
            data.enterClear = false;
        }
        return true;
    }

    if (data.climbState === "enterPlatform") {
        data.mode = "walk";
        const via = data.enterClear ? RIG_PLATFORM_CLEAR : RIG_PLATFORM_ENTRY;
        if (walkToward(worker, via, delta, data.speed, true)) {
            if (!data.enterClear) {
                data.enterClear = true;
            } else {
                data.enterClear = false;
                data.climbState = "walkToTerminal";
            }
        }
        return true;
    }

    if (data.climbState === "walkToTerminal") {
        data.mode = "walk";
        if (walkToward(worker, RIG_TERMINAL_STAND, delta, data.speed, true)) {
            data.climbState = "workTerminal";
            data.mode = "workTerminal";
            data.climbWait = 4 + Math.random() * 4;
            worker.rotation.z = getFacingYaw(worker.position, panelMap);
            setRigTerminalActive(true);
        }
        return true;
    }

    if (data.climbState === "workTerminal") {
        data.mode = "workTerminal";
        data.climbLook = (data.climbLook || 0) + delta;
        worker.rotation.z = lerpAngle(
            worker.rotation.z,
            getFacingYaw(worker.position, panelMap) + Math.sin(data.climbLook * 0.6) * 0.18,
            1.8 * delta
        );
        data.climbWait -= delta;
        if (data.climbWait <= 0) {
            setRigTerminalActive(false);
            data.climbState = "returnToLadder";
            data.mode = "walk";
            data.climbLook = 0;
        }
        return true;
    }

    if (data.climbState === "returnToLadder") {
        data.mode = "walk";
        const via = data.returnViaEntry ? hatch : RIG_PLATFORM_ENTRY;
        if (walkToward(worker, via, delta, data.speed, true)) {
            if (!data.returnViaEntry) {
                data.returnViaEntry = true;
            } else {
                data.returnViaEntry = false;
                data.climbState = "descend";
                data.mode = "descend";
                data.climbIndex = 0;
                data.climbT = 0;
                worker.rotation.z = DESCEND_YAW;
            }
        }
        return true;
    }

    if (data.climbState === "descend") {
        data.mode = "descend";
        const done = moveAlongClimbPath(worker, delta, true);
        if (done) {
            worker.position.copy(path[0]);
            worker.position.z = 0;
            data.climbState = "exitRig";
            data.mode = "walk";
        }
        return true;
    }

    if (data.climbState === "exitRig") {
        data.mode = "walk";
        if (walkToward(worker, RIG_LADDER_EXIT_POINT, delta, RIG_EXIT_SPEED, false)) {
            data.climbState = "inspectRig";
            data.inspectIndex = 0;
            data.inspectHold = 0;
            data.inspectLeft = 5 + Math.random() * 3;
            data.mode = "inspectRig";
        }
        return true;
    }

    if (data.climbState === "inspectRig") {
        data.inspectLeft -= delta;
        const point = RIG_INSPECT_POINTS[data.inspectIndex % RIG_INSPECT_POINTS.length];
        if (!walkToward(worker, point, delta, data.speed, false)) {
            data.mode = "walk";
            return true;
        }

        data.mode = "inspectRig";
        worker.rotation.z = lerpAngle(
            worker.rotation.z,
            getFacingYaw(worker.position, RIG_POSITION),
            2.0 * delta
        );
        data.inspectHold += delta;
        if (data.inspectHold >= 1.15) {
            data.inspectHold = 0;
            data.inspectIndex += 1;
        }
        if (data.inspectLeft <= 0) {
            data.climbState = "returnGroundWork";
            data.mode = "walk";
        }
        return true;
    }

    if (data.climbState === "returnGroundWork") {
        data.mode = "walk";
        if (walkToward(worker, getGroundWorkPoint(worker), delta, data.speed, false)) {
            finishRigCycle(worker);
        }
        return true;
    }

    return false;
}

function updatePumpOperator(worker, delta) {
    const data = worker.userData;

    if (data.pumpState === "idle") {
        data.climbWait -= delta;
        data.mode = "idle";
        setPumpjackTerminalActive(false);
        if (data.climbWait <= 0) {
            data.pumpState = "approachPumpjack";
            data.mode = "walk";
        }
        return true;
    }

    if (data.pumpState === "approachPumpjack") {
        data.mode = "walk";
        if (walkToward(worker, PUMPJACK_PANEL_STAND, delta, data.speed, false)) {
            data.pumpState = "workControlPanel";
            data.mode = "workControlPanel";
            data.climbWait = 3.2 + Math.random() * 2.4;
            worker.rotation.z = getFacingYaw(worker.position, PUMPJACK_PANEL_POSITION);
            setPumpjackTerminalActive(true);
        }
        return true;
    }

    if (data.pumpState === "workControlPanel") {
        data.mode = "workControlPanel";
        worker.rotation.z = lerpAngle(
            worker.rotation.z,
            getFacingYaw(worker.position, PUMPJACK_PANEL_POSITION),
            2.0 * delta
        );
        data.climbWait -= delta;
        if (data.climbWait <= 0) {
            setPumpjackTerminalActive(false);
            data.pumpState = "inspectPumpjack";
            data.mode = "walk";
        }
        return true;
    }

    if (data.pumpState === "inspectPumpjack") {
        if (data.inspectLeft === undefined) {
            data.inspectLeft = 2.2 + Math.random() * 1.4;
        }

        if (!walkToward(worker, PUMPJACK_INSPECT, delta, data.speed, false)) {
            data.mode = "walk";
            return true;
        }

        data.mode = "inspectPumpjack";
        worker.rotation.z = lerpAngle(
            worker.rotation.z,
            getFacingYaw(worker.position, PUMPJACK_POSITION),
            2.0 * delta
        );
        data.inspectLeft -= delta;
        if (data.inspectLeft <= 0) {
            data.pumpState = "returnControlPanel";
            data.mode = "walk";
            data.inspectLeft = undefined;
        }
        return true;
    }

    if (data.pumpState === "returnControlPanel") {
        data.mode = "walk";
        if (walkToward(worker, PUMPJACK_PANEL_STAND, delta, data.speed, false)) {
            data.pumpState = "idle";
            data.mode = "idle";
            data.climbWait = 2.4 + Math.random() * 2.2;
        }
        return true;
    }

    return false;
}

function finishBuildingVisit(worker) {
    const data = worker.userData;
    data.buildingVisitState = "idle";
    data.mode = "idle";
    data.pauseTimer = 1.2;
    data.buildingVisitWait = 0;
    worker.visible = true;
    if (activeBuildingWorker === worker) {
        activeBuildingWorker = null;
    }
}

function setBuildingDoorTarget(open) {
    if (!buildingDoor) {
        return;
    }
    buildingDoor.userData.targetOpen = open ? 1 : 0;
}

function updateBuildingVisitor(worker, delta) {
    const data = worker.userData;
    const state = data.buildingVisitState;

    if (!state || state === "idle") {
        return false;
    }

    if (state === "approachDoor") {
        data.mode = "walk";
        worker.visible = true;
        if (walkToward(worker, BUILDING_DOOR_APPROACH, delta, data.speed, false)) {
            data.buildingVisitState = "openDoor";
            data.buildingVisitWait = 0.7;
            worker.rotation.z = getFacingYaw(worker.position, BUILDING_INSIDE);
            setBuildingDoorTarget(true);
        }
        return true;
    }

    if (state === "openDoor") {
        data.mode = "idle";
        data.buildingVisitWait -= delta;
        if (data.buildingVisitWait <= 0) {
            data.buildingVisitState = "enter";
            data.mode = "walk";
        }
        return true;
    }

    if (state === "enter") {
        data.mode = "walk";
        if (walkToward(worker, BUILDING_INSIDE, delta, data.speed * 0.85, false)) {
            worker.visible = false;
            data.buildingVisitState = "inside";
            data.buildingVisitWait = 3.4;
            data.mode = "idle";
            setBuildingDoorTarget(false);
        }
        return true;
    }

    if (state === "inside") {
        data.mode = "idle";
        worker.visible = false;
        data.buildingVisitWait -= delta;
        if (data.buildingVisitWait <= 0) {
            data.buildingVisitState = "exitOpen";
            data.buildingVisitWait = 0.65;
            setBuildingDoorTarget(true);
        }
        return true;
    }

    if (state === "exitOpen") {
        data.mode = "idle";
        data.buildingVisitWait -= delta;
        if (data.buildingVisitWait <= 0) {
            worker.visible = true;
            worker.position.copy(BUILDING_INSIDE);
            data.buildingVisitState = "exit";
            data.mode = "walk";
        }
        return true;
    }

    if (state === "exit") {
        data.mode = "walk";
        worker.visible = true;
        if (walkToward(worker, BUILDING_DOOR_APPROACH, delta, data.speed, false)) {
            data.buildingVisitState = "leave";
            setBuildingDoorTarget(false);
        }
        return true;
    }

    if (state === "leave") {
        data.mode = "walk";
        if (walkToward(worker, BUILDING_LEAVE_POINT, delta, data.speed, false)) {
            finishBuildingVisit(worker);
        }
        return true;
    }

    return false;
}

function updateWorkerMovement(worker, delta) {
    const data = worker.userData;

    if (data.interactHold > 0) {
        data.interactHold -= delta;
        return;
    }

    if (data.buildingVisitor && updateBuildingVisitor(worker, delta)) {
        return;
    }

    if (data.climber && updateClimber(worker, delta)) {
        return;
    }

    if (data.pumpOperator && updatePumpOperator(worker, delta)) {
        return;
    }

    if (data.stationed) {
        data.workTimer -= delta;
        if (data.workTimer <= 0) {
            data.mode = data.mode === "work" ? "idle" : "work";
            data.workTimer = data.mode === "work"
                ? data.workDuration + Math.random() * 0.6
                : data.idleDuration + Math.random() * 0.4;
        }
        return;
    }

    if (data.pauseTimer > 0) {
        data.pauseTimer -= delta;
        data.mode = data.pauseTimer < 0.8 ? "work" : "idle";
        return;
    }

    const waypoints = data.waypoints;
    if (!waypoints.length) {
        data.mode = "idle";
        return;
    }

    let target = waypoints[data.waypointIndex];
    let dx = target.x - worker.position.x;
    let dy = target.y - worker.position.y;
    let distance = Math.hypot(dx, dy);

    if (distance <= 0.02) {
        const nextIndex = findClearWorkerWaypoint(worker, data.waypointIndex + 1);
        data.waypointIndex = nextIndex === -1 ? (data.waypointIndex + 1) % waypoints.length : nextIndex;
        data.pauseTimer = 0.6 + Math.random() * 1.4;
        data.mode = "idle";
        return;
    }

    if (doesPathCrossObstacle(worker.position, target) || !isInsideBounds(target.x, target.y)) {
        const nextIndex = findClearWorkerWaypoint(worker, data.waypointIndex + 1);

        if (nextIndex === -1) {
            data.mode = "idle";
            data.pauseTimer = 0.8;
            return;
        }

        data.waypointIndex = nextIndex;
        data.walkAmount = 0;
        return;
    }

    data.mode = "walk";
    worker.rotation.z = lerpAngle(
        worker.rotation.z,
        getFacingYaw(worker.position, target),
        2.2 * delta
    );

    const step = Math.min(data.speed * delta, distance);
    const nextX = worker.position.x + (dx / distance) * step;
    const nextY = worker.position.y + (dy / distance) * step;

    if (!isPathAllowed(worker.position.x, worker.position.y, nextX, nextY)) {
        const nextIndex = findClearWorkerWaypoint(worker, data.waypointIndex + 1);
        data.waypointIndex = nextIndex === -1 ? data.waypointIndex : nextIndex;
        data.mode = "idle";
        data.pauseTimer = 0.5;
        return;
    }

    worker.position.x = nextX;
    worker.position.y = nextY;
    worker.position.z = 0;
}

export function updateWorkers(delta, elapsedTime) {
    workerInstances.forEach((worker) => {
        updateWorkerMovement(worker, delta);
        updateWorkerAnimation(worker, delta, elapsedTime);
    });
}

function createControlPanelMesh() {
    const { geo, mat } = getKit();
    const panel = new THREE.Group();
    panel.name = "controlPanel";

    addPart(panel, geo.box, mat.steelDark, 0, 0.016, 0, 0.05, 0.032, 0.038);
    addPart(panel, geo.box, mat.steel, 0, 0.036, 0.004, 0.062, 0.008, 0.046);
    addPart(panel, geo.box, mat.steelLight, 0, 0.062, -0.006, 0.072, 0.048, 0.012);
    addPart(panel, geo.box, mat.panelScreen, 0.004, 0.066, 0.002, 0.038, 0.026, 0.006);
    addPart(panel, geo.cylLow, mat.yellow, -0.02, 0.048, 0.016, 0.006, 0.007, 0.006);
    addPart(panel, geo.cylLow, mat.orange, 0, 0.048, 0.016, 0.006, 0.007, 0.006);
    addPart(panel, geo.cylLow, mat.yellow, 0.02, 0.048, 0.016, 0.006, 0.007, 0.006);
    addPart(panel, geo.box, mat.orange, 0.026, 0.078, 0.002, 0.008, 0.008, 0.006);
    addPart(panel, geo.box, mat.yellow, -0.026, 0.078, 0.002, 0.008, 0.008, 0.006);

    return panel;
}

function attachTerminalFx(panel, lightColor) {
    const { mat } = getKit();
    const fx = {
        active: false,
        screenMats: [],
        indicatorMats: [],
        light: null
    };

    panel.traverse((child) => {
        if (!child.isMesh) {
            return;
        }

        const source = child.material;
        if (source === mat.panelScreen) {
            child.material = source.clone();
            child.material.emissive = new THREE.Color(0x000000);
            child.material.emissiveIntensity = 0;
            fx.screenMats.push(child.material);
        } else if (source === mat.yellow || source === mat.orange) {
            child.material = source.clone();
            child.material.emissive = new THREE.Color(0x000000);
            child.material.emissiveIntensity = 0;
            fx.indicatorMats.push(child.material);
        }
    });

    const light = new THREE.PointLight(lightColor, 0, 0.16, 2);
    light.position.set(0, 0.072, 0.028);
    panel.add(light);
    fx.light = light;
    return fx;
}

function createRigControlPanel() {
    const { geo, mat } = getKit();
    const panel = createControlPanelMesh();
    panel.name = "rigControlPanel";
    panel.position.set(RIG_TERMINAL_LOCAL.x, RIG_TERMINAL_LOCAL.y, RIG_TERMINAL_LOCAL.z);
    rigTerminalFx = attachTerminalFx(panel, 0x66ccff);
    setRigTerminalActive(false);
    addPart(panel, geo.box, mat.yellow, 0, 0.016, 0.02, 0.052, 0.006, 0.004);
    addBrandPlaque(panel, 0, 0.038, 0.028, 0, 0, 0, 0.42);
    return panel;
}

function createPumpjackControlPanel() {
    const { geo, mat } = getKit();
    const visual = createControlPanelMesh();
    pumpjackTerminalFx = attachTerminalFx(visual, 0x66ccff);
    setPumpjackTerminalActive(false);
    addPart(visual, geo.box, mat.yellow, 0, 0.016, 0.02, 0.052, 0.006, 0.004);
    addBrandMark(visual, -0.026, 0.038, 0.024, 0.5);
    placeYUpByHeight(visual, 0.052);
    const root = createPlacedGroup(visual, PUMPJACK_PANEL_POSITION, 0);
    root.name = "pumpjackControlPanel";
    return root;
}

function createRigWarningLight() {
    const { geo, mat } = getKit();
    const group = new THREE.Group();
    group.name = "rigWarningLight";
    const bulbMat = mat.warningRed.clone();
    const bulb = addPart(group, geo.sphereTiny, bulbMat, 0, 0.008, 0, 0.011, 0.011, 0.011);
    addPart(group, geo.cylLow, mat.steelDark, 0, 0, 0, 0.008, 0.012, 0.008);
    const light = new THREE.PointLight(0xff1a1a, 0.4, 0.22, 2);
    light.position.set(0, 0.01, 0);
    group.add(light);
    group.position.set(0, 1.675, 0);
    rigWarningLight = { group, bulb, mat: bulbMat, light };
    return group;
}

function addPlatformRail(visual, geo, mat, x1, z1, x2, z2, railY, midY) {
    addStrut(visual, geo.cylLow, mat, x1, railY, z1, x2, railY, z2, 0.006);
    addStrut(visual, geo.cylLow, mat, x1, midY, z1, x2, midY, z2, 0.005);
}

function addRingWorkPlatform(visual, geo, mat) {
    const y = RIG_PLATFORM_POSITION.y;
    const thick = RIG_PLATFORM_SIZE.y;
    const outer = RIG_PLATFORM_SIZE.x;
    const inner = RIG_PLATFORM_INNER;
    const walk = (outer - inner) * 0.5;
    const mid = (inner + outer) * 0.25;
    const outerHalf = outer * 0.5;
    const innerHalf = inner * 0.5;
    const hatchHalf = RIG_HATCH_WIDTH * 0.5;
    const southWidth = (outer - RIG_HATCH_WIDTH) * 0.5;
    const southX = hatchHalf + southWidth * 0.5;
    const deckY = y;
    const grateY = y + thick * 0.42;

    addPart(visual, geo.box, mat.steel, 0, deckY, -mid, outer, thick, walk);
    addPart(visual, geo.box, mat.steel, mid, deckY, 0, walk, thick, outer);
    addPart(visual, geo.box, mat.steel, -mid, deckY, 0, walk, thick, outer);
    addPart(visual, geo.box, mat.steel, -southX, deckY, mid, southWidth, thick, walk);
    addPart(visual, geo.box, mat.steel, southX, deckY, mid, southWidth, thick, walk);

    addPart(visual, geo.box, mat.steelLight, 0, grateY, -mid, outer * 0.96, 0.005, walk * 0.86);
    addPart(visual, geo.box, mat.steelLight, mid, grateY, 0, walk * 0.86, 0.005, outer * 0.96);
    addPart(visual, geo.box, mat.steelLight, -mid, grateY, 0, walk * 0.86, 0.005, outer * 0.96);
    addPart(visual, geo.box, mat.steelLight, -southX, grateY, mid, southWidth * 0.9, 0.005, walk * 0.86);
    addPart(visual, geo.box, mat.steelLight, southX, grateY, mid, southWidth * 0.9, 0.005, walk * 0.86);

    addPart(visual, geo.box, mat.yellow, 0, grateY + 0.003, -mid, outer * 0.04, 0.003, walk * 0.7);
    addPart(visual, geo.box, mat.yellow, mid, grateY + 0.003, 0, walk * 0.7, 0.003, outer * 0.04);

    const coamingH = 0.018;
    addPart(visual, geo.box, mat.yellow, 0, y + thick * 0.5 + coamingH * 0.5, innerHalf, RIG_HATCH_WIDTH, coamingH, 0.008);
    addPart(visual, geo.box, mat.yellow, -hatchHalf, y + thick * 0.5 + coamingH * 0.5, mid, 0.008, coamingH, walk);
    addPart(visual, geo.box, mat.yellow, hatchHalf, y + thick * 0.5 + coamingH * 0.5, mid, 0.008, coamingH, walk);

    const railH = 0.11;
    const railY = y + thick * 0.5 + railH;
    const midRailY = y + thick * 0.5 + railH * 0.52;
    const postY = y + thick * 0.5 + railH * 0.5;
    const posts = [
        [-outerHalf, -outerHalf], [0, -outerHalf], [outerHalf, -outerHalf],
        [outerHalf, 0], [outerHalf, outerHalf],
        [-outerHalf, 0], [-outerHalf, outerHalf],
        [-hatchHalf, outerHalf], [hatchHalf, outerHalf],
        [-hatchHalf, innerHalf], [hatchHalf, innerHalf],
        [-innerHalf, -innerHalf], [innerHalf, -innerHalf],
        [-innerHalf, innerHalf], [innerHalf, innerHalf],
        [0, -innerHalf], [-innerHalf, 0], [innerHalf, 0]
    ];
    posts.forEach(([px, pz]) => {
        addPart(visual, geo.cylLow, mat.yellow, px, postY, pz, 0.007, railH, 0.007);
    });

    addPlatformRail(visual, geo, mat.yellow, -outerHalf, -outerHalf, outerHalf, -outerHalf, railY, midRailY);
    addPlatformRail(visual, geo, mat.yellow, outerHalf, -outerHalf, outerHalf, outerHalf, railY, midRailY);
    addPlatformRail(visual, geo, mat.yellow, -outerHalf, -outerHalf, -outerHalf, outerHalf, railY, midRailY);
    addPlatformRail(visual, geo, mat.yellow, -outerHalf, outerHalf, -hatchHalf, outerHalf, railY, midRailY);
    addPlatformRail(visual, geo, mat.yellow, hatchHalf, outerHalf, outerHalf, outerHalf, railY, midRailY);

    addPlatformRail(visual, geo, mat.yellow, -innerHalf, -innerHalf, innerHalf, -innerHalf, railY, midRailY);
    addPlatformRail(visual, geo, mat.yellow, innerHalf, -innerHalf, innerHalf, innerHalf, railY, midRailY);
    addPlatformRail(visual, geo, mat.yellow, -innerHalf, -innerHalf, -innerHalf, innerHalf, railY, midRailY);
    addPlatformRail(visual, geo, mat.yellow, -innerHalf, innerHalf, -hatchHalf, innerHalf, railY, midRailY);
    addPlatformRail(visual, geo, mat.yellow, hatchHalf, innerHalf, innerHalf, innerHalf, railY, midRailY);

    addPlatformRail(visual, geo, mat.yellow, -hatchHalf, innerHalf, -hatchHalf, outerHalf, railY, midRailY);
    addPlatformRail(visual, geo, mat.yellow, hatchHalf, innerHalf, hatchHalf, outerHalf, railY, midRailY);
}

export function createProceduralOilRig() {
    if (rigRoot) {
        return Promise.resolve(rigRoot);
    }

    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    visual.name = "oilRig";

    const height = 1.50;
    const bottom = 0.18;
    const top = 0.055;
    const levels = [0.10, 0.36, 0.62, 0.88, 1.12, 1.32, 1.46];
    const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];

    const spreadAt = (y) => THREE.MathUtils.lerp(bottom, top, y / height);
    const cornerPos = (i, j, y) => {
        const s = spreadAt(y);
        return [i * s, y, j * s];
    };

    addPart(visual, geo.box, mat.concrete, 0, 0.03, 0, 0.50, 0.06, 0.50);
    addPart(visual, geo.box, mat.steelDark, 0, 0.08, 0, 0.42, 0.04, 0.42);
    addPart(visual, geo.box, mat.yellow, 0.21, 0.09, 0, 0.03, 0.03, 0.42);
    addPart(visual, geo.box, mat.yellow, -0.21, 0.09, 0, 0.03, 0.03, 0.42);
    addPart(visual, geo.box, mat.suitDark, 0, 0.105, 0.21, 0.16, 0.012, 0.02);
    addPart(visual, geo.box, mat.yellow, 0, 0.105, 0.222, 0.16, 0.006, 0.006);
    addPart(visual, geo.box, mat.steelDark, -0.08, 0.16, 0.08, 0.16, 0.12, 0.14);
    addBrandPlaque(visual, 0, 0.13, 0.22, 0, 0, 0, 0.85);

    corners.forEach(([i, j]) => {
        const [x1, y1, z1] = cornerPos(i, j, 0.08);
        const [x2, y2, z2] = cornerPos(i, j, height);
        addStrut(visual, geo.cylLow, mat.steel, x1, y1, z1, x2, y2, z2, 0.018);
    });

    for (let l = 0; l < levels.length; l += 1) {
        const y = levels[l];
        for (let c = 0; c < 4; c += 1) {
            const a = corners[c];
            const b = corners[(c + 1) % 4];
            const p1 = cornerPos(a[0], a[1], y);
            const p2 = cornerPos(b[0], b[1], y);
            addStrut(visual, geo.cylLow, mat.steelLight, p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], 0.012);

            if (l < levels.length - 1) {
                const y2 = levels[l + 1];
                const p3 = cornerPos(b[0], b[1], y2);
                addStrut(visual, geo.cylLow, mat.steelDark, p1[0], p1[1], p1[2], p3[0], p3[1], p3[2], 0.01);
            }
        }
    }

    addRingWorkPlatform(visual, geo, mat);
    visual.add(createRigControlPanel());
    visual.add(createRigWarningLight());

    addPart(visual, geo.box, mat.steelDark, 0.16, 0.12, 0.02, 0.12, 0.10, 0.10);
    addPart(visual, geo.cylLow, mat.rust, 0.22, 0.086, 0.02, 0.012, 0.04, 0.012, 0, 0, Math.PI / 2);
    addPart(visual, geo.cylLow, mat.steelDark, 0.235, 0.086, 0.02, 0.014, 0.012, 0.014, 0, 0, Math.PI / 2);
    addPart(visual, geo.box, mat.steelLight, 0.242, 0.086, 0.02, 0.008, 0.024, 0.024);

    const crownY = 1.50;
    const crownSpread = spreadAt(crownY);
    corners.forEach(([i, j]) => {
        const [x1, y1, z1] = cornerPos(i, j, 1.46);
        const [x2, y2, z2] = [i * crownSpread * 0.85, 1.56, j * crownSpread * 0.85];
        addStrut(visual, geo.cylLow, mat.steel, x1, y1, z1, x2, y2, z2, 0.012);
    });

    const crownHalf = crownSpread * 0.9;
    addStrut(visual, geo.cylLow, mat.steelLight, crownHalf, 1.56, crownHalf, -crownHalf, 1.56, crownHalf, 0.01);
    addStrut(visual, geo.cylLow, mat.steelLight, -crownHalf, 1.56, crownHalf, -crownHalf, 1.56, -crownHalf, 0.01);
    addStrut(visual, geo.cylLow, mat.steelLight, -crownHalf, 1.56, -crownHalf, crownHalf, 1.56, -crownHalf, 0.01);
    addStrut(visual, geo.cylLow, mat.steelLight, crownHalf, 1.56, -crownHalf, crownHalf, 1.56, crownHalf, 0.01);
    addStrut(visual, geo.cylLow, mat.steelLight, crownHalf, 1.56, 0, -crownHalf, 1.56, 0, 0.009);
    addStrut(visual, geo.cylLow, mat.steelLight, 0, 1.56, crownHalf, 0, 1.56, -crownHalf, 0.009);

    addPart(visual, geo.box, mat.steelDark, 0, 1.58, 0, 0.09, 0.04, 0.07);
    addPart(visual, geo.cylLow, mat.steelLight, 0, 1.61, 0.018, 0.016, 0.05, 0.016, 0, 0, Math.PI / 2);
    addPart(visual, geo.cylLow, mat.steelLight, 0, 1.61, -0.018, 0.016, 0.05, 0.016, 0, 0, Math.PI / 2);
    addPart(visual, geo.box, mat.steel, 0, 1.64, 0, 0.05, 0.03, 0.04);
    addPart(visual, geo.box, mat.yellow, 0, 1.58, 0.04, 0.03, 0.03, 0.02);

    addPart(visual, geo.cylLow, mat.steelDark, 0, 0.56, 0, 0.018, 0.88, 0.018);

    const ladderX = RIG_LADDER_X;
    const ladderY0 = RIG_LADDER_Y0;
    const ladderY1 = RIG_LADDER_Y1;
    const ladderZ0 = RIG_LADDER_Z0;
    const ladderZ1 = RIG_LADDER_Z1;
    const railOffset = 0.048;
    addStrut(visual, geo.cylLow, mat.yellow, ladderX - railOffset, ladderY0, ladderZ0, ladderX - railOffset, ladderY1, ladderZ1, 0.01);
    addStrut(visual, geo.cylLow, mat.yellow, ladderX + railOffset, ladderY0, ladderZ0, ladderX + railOffset, ladderY1, ladderZ1, 0.01);
    addStrut(
        visual,
        geo.cylLow,
        mat.steelLight,
        ladderX - 0.068,
        ladderY0 + 0.04,
        ladderZ0 + 0.02,
        ladderX - 0.055,
        ladderY1,
        ladderZ1 + 0.018,
        0.007
    );
    addStrut(
        visual,
        geo.cylLow,
        mat.steelLight,
        ladderX + 0.068,
        ladderY0 + 0.04,
        ladderZ0 + 0.02,
        ladderX + 0.055,
        ladderY1,
        ladderZ1 + 0.018,
        0.007
    );

    for (let i = 0; i < LADDER_RUNG_COUNT; i += 1) {
        const t = i / (LADDER_RUNG_COUNT - 1);
        const y = THREE.MathUtils.lerp(ladderY0, ladderY1, t);
        const z = THREE.MathUtils.lerp(ladderZ0, ladderZ1, t);
        addPart(visual, geo.box, mat.yellow, ladderX, y, z, 0.10, 0.014, 0.016);
    }

    placeYUpByFootprint(visual, PROCEDURAL_RIG_FOOTPRINT);
    rigRoot = createPlacedGroup(visual, RIG_POSITION);
    rigRoot.name = "proceduralOilRig";
    markInteractive(
        rigRoot,
        "rig",
        "Буровая установка",
        "Один из ключевых объектов нефтяного промысла. Здесь выполняют буровые и технологические операции при работе со скважинами."
    );

    return Promise.resolve(rigRoot);
}

function createPumpjack() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();

    addPart(visual, geo.box, mat.steelDark, 0, 0.03, 0, 0.36, 0.06, 0.16);
    addPart(visual, geo.box, mat.yellow, 0, 0.07, 0.07, 0.36, 0.02, 0.02);
    addPart(visual, geo.box, mat.suitDark, 0.10, 0.08, 0.082, 0.10, 0.012, 0.008);
    addBrandPlaque(visual, 0.10, 0.11, 0.086, 0, 0, 0, 0.7);
    addPart(visual, geo.box, mat.steel, -0.04, 0.22, 0.04, 0.04, 0.36, 0.04);
    addPart(visual, geo.box, mat.steel, -0.04, 0.22, -0.04, 0.04, 0.36, 0.04);
    addPart(visual, geo.box, mat.steel, -0.04, 0.38, 0, 0.05, 0.05, 0.12);

    const beam = new THREE.Group();
    beam.position.set(-0.04, 0.40, 0);
    addPart(beam, geo.box, mat.steelLight, 0.06, 0, 0, 0.46, 0.045, 0.05);
    addPart(beam, geo.box, mat.yellow, 0.28, -0.04, 0, 0.10, 0.12, 0.06);
    addPart(beam, geo.box, mat.steelDark, -0.18, 0.03, 0, 0.10, 0.08, 0.08);
    addPart(beam, geo.cylLow, mat.steelDark, 0.30, -0.16, 0, 0.012, 0.22, 0.012);
    visual.add(beam);

    addPart(visual, geo.cylLow, mat.steel, 0.22, 0.08, 0, 0.03, 0.12, 0.03);
    addPart(visual, geo.cone, mat.rust, 0.22, 0.16, 0, 0.04, 0.06, 0.04);

    addPart(visual, geo.cylLow, mat.rust, -0.18, 0.18, 0, 0.024, 0.055, 0.024, 0, 0, Math.PI / 2);
    addPart(visual, geo.cylLow, mat.steelDark, -0.20, 0.18, 0, 0.028, 0.012, 0.028, 0, 0, Math.PI / 2);
    addPart(visual, geo.box, mat.steelLight, -0.208, 0.18, 0, 0.008, 0.028, 0.028);
    addPart(visual, geo.cylLow, mat.rust, 0.0, 0.18, -0.08, 0.024, 0.04, 0.024, Math.PI / 2, 0, 0);
    addPart(visual, geo.cylLow, mat.steelDark, 0.0, 0.18, -0.09, 0.028, 0.01, 0.028, Math.PI / 2, 0, 0);
    addPart(visual, geo.box, mat.steelLight, 0.0, 0.18, -0.096, 0.028, 0.028, 0.008);

    placeYUpByFootprint(visual, SCENE_LAYOUT.pumpjackFootprint);
    const root = createPlacedGroup(visual, PUMPJACK_POSITION, 0);
    root.name = "pumpjack";
    root.userData.beam = beam;
    pumpjackBeam = beam;
    markInteractive(
        root,
        "pumpjack",
        "Насос-качалка",
        "Механизм для механизированной добычи нефти. Рабочий контролирует оборудование и следит за его работой."
    );
    return root;
}

function createTanks() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    const xs = [-0.12, 0, 0.12];

    xs.forEach((x, index) => {
        const h = 0.28 + index * 0.03;
        addPart(visual, geo.cyl, mat.tank, x, h / 2, 0, 0.07, h, 0.07);
        addPart(visual, geo.cone, mat.tankDark, x, h + 0.03, 0, 0.075, 0.06, 0.075);
        addPart(visual, geo.cylLow, mat.steelDark, x, 0.02, 0, 0.08, 0.03, 0.08);
        addPart(visual, geo.box, mat.yellow, x, h * 0.6, 0.07, 0.02, 0.04, 0.01);
        addPart(visual, geo.cylLow, mat.rust, x, 0.092, -0.07, 0.012, 0.04, 0.012, Math.PI / 2, 0, 0);
        addPart(visual, geo.cylLow, mat.steelDark, x, 0.092, -0.082, 0.014, 0.01, 0.014, Math.PI / 2, 0, 0);
        addPart(visual, geo.box, mat.steelLight, x, 0.092, -0.088, 0.024, 0.024, 0.008);
    });

    addPart(visual, geo.cylLow, mat.rust, 0.19, 0.092, 0, 0.012, 0.05, 0.012, 0, 0, Math.PI / 2);
    addPart(visual, geo.cylLow, mat.steelDark, 0.205, 0.092, 0, 0.014, 0.01, 0.014, 0, 0, Math.PI / 2);
    addPart(visual, geo.box, mat.steelLight, 0.212, 0.092, 0, 0.008, 0.024, 0.024);

    addPart(visual, geo.box, mat.concrete, 0, 0.015, 0, 0.42, 0.03, 0.22);
    addBrandPlaque(visual, 0, 0.08, 0.12, 0, 0, 0, 0.75);

    placeYUpByFootprint(visual, SCENE_LAYOUT.tanksFootprint);
    const root = createPlacedGroup(visual, TANKS_POSITION, 0);
    root.name = "tanks";
    markInteractive(
        root,
        "tanks",
        "Резервуары",
        "Здесь собираются и временно хранятся продукты добычи перед дальнейшими технологическими операциями."
    );
    return root;
}

function mapToLocal(mapX, mapY, height) {
    return {
        x: mapX,
        y: height,
        z: -mapY
    };
}

function addPipeSegment(visual, geo, mat, x1, y1, x2, y2, centerY, radius) {
    const start = mapToLocal(x1, y1, centerY);
    const end = mapToLocal(x2, y2, centerY);
    addStrut(visual, geo, mat, start.x, start.y, start.z, end.x, end.y, end.z, radius);
}

function addPipeElbow(visual, geo, mat, mapX, mapY, centerY, radius) {
    const point = mapToLocal(mapX, mapY, centerY);
    addPart(visual, geo, mat, point.x, point.y, point.z, radius * 1.25, radius * 1.25, radius * 1.25);
}

function addPipeSupport(visual, geo, mat, mapX, mapY, supportTopY, pipeRadius) {
    const post = mapToLocal(mapX, mapY, supportTopY * 0.5);
    addPart(visual, geo.cylLow, mat, post.x, post.y, post.z, 0.009, supportTopY, 0.009);
    addPart(visual, geo.box, mat, post.x, 0.006, post.z, 0.03, 0.012, 0.03);

    const saddle = mapToLocal(mapX, mapY, supportTopY);
    addPart(
        visual,
        geo.box,
        mat,
        saddle.x,
        saddle.y,
        saddle.z,
        pipeRadius * 2.4,
        0.008,
        pipeRadius * 2.2
    );
}

function addPipeSupports(visual, geo, mat, x1, y1, x2, y2, supportTopY, pipeRadius, spacing) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 0.08) {
        return 0;
    }

    const count = Math.max(2, Math.round(length / spacing));
    let placed = 0;

    for (let i = 1; i < count; i += 1) {
        const t = i / count;
        addPipeSupport(
            visual,
            geo,
            mat,
            x1 + (x2 - x1) * t,
            y1 + (y2 - y1) * t,
            supportTopY,
            pipeRadius
        );
        placed += 1;
    }

    return placed;
}

function addPipeRiser(visual, geo, mat, mapX, mapY, y0, y1, radius) {
    if (Math.abs(y1 - y0) < 0.003) {
        return;
    }

    const { geo: kitGeo, mat: kitMat } = getKit();
    const start = mapToLocal(mapX, mapY, y0);
    const end = mapToLocal(mapX, mapY, y1);
    addStrut(visual, geo, mat, start.x, start.y, start.z, end.x, end.y, end.z, radius);
    addPipeElbow(visual, kitGeo.sphereLow, kitMat.steelLight, mapX, mapY, y0, radius);
    addPipeElbow(visual, kitGeo.sphereLow, kitMat.steelLight, mapX, mapY, y1, radius);
}

function addPipeFlange(visual, geo, mat, mapX, mapY, centerY, dirX, dirY, radius) {
    const point = mapToLocal(mapX, mapY, centerY);
    const size = radius * 2.4;
    const thick = radius * 0.7;
    const alongX = Math.abs(dirX) >= Math.abs(dirY);
    if (alongX) {
        addPart(visual, geo.box, mat, point.x, point.y, point.z, thick, size, size);
    } else {
        addPart(visual, geo.box, mat, point.x, point.y, point.z, size, size, thick);
    }
}

function addPipeStub(visual, geo, mat, point, inward, centerY, radius, length = 0.022) {
    const mag = Math.hypot(inward.x, inward.y) || 1;
    const ix = (inward.x / mag) * length;
    const iy = (inward.y / mag) * length;
    const adapterX = point.x - (inward.x / mag) * radius * 2.2;
    const adapterY = point.y - (inward.y / mag) * radius * 2.2;
    addPipeSegment(
        visual,
        geo.cylLow,
        mat.rust,
        point.x,
        point.y,
        point.x + ix,
        point.y + iy,
        centerY,
        PIPE_NOZZLE_RADIUS
    );
    addPipeSegment(
        visual,
        geo.cylLow,
        mat.steelDark,
        point.x,
        point.y,
        adapterX,
        adapterY,
        centerY,
        radius * 0.9
    );
    addPipeFlange(visual, geo, mat.steelLight, point.x, point.y, centerY, inward.x, inward.y, radius);
}

function createPipes() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    visual.name = "pipes";

    const pipeRadius = PIPE_RADIUS;
    let supportCount = 0;

    PIPE_LINES.forEach((line) => {
        const points = line.points;
        const height = line.height === undefined ? PIPE_CENTER_Y : line.height;
        for (let i = 0; i < points.length - 1; i += 1) {
            const from = points[i];
            const to = points[i + 1];
            const length = Math.hypot(to.x - from.x, to.y - from.y);
            addPipeSegment(visual, geo.cylLow, mat.rust, from.x, from.y, to.x, to.y, height, pipeRadius);
            if (length >= 0.08) {
                supportCount += addPipeSupports(
                    visual,
                    geo,
                    mat.steelDark,
                    from.x,
                    from.y,
                    to.x,
                    to.y,
                    height - pipeRadius,
                    pipeRadius,
                    0.07
                );
            }
            addPipeElbow(visual, geo.sphereLow, mat.steelLight, from.x, from.y, height, pipeRadius);
            if (length >= 0.08) {
                addPipeFlange(
                    visual,
                    geo,
                    mat.steelLight,
                    (from.x + to.x) * 0.5,
                    (from.y + to.y) * 0.5,
                    height,
                    to.x - from.x,
                    to.y - from.y,
                    pipeRadius
                );
            }
        }
        const last = points[points.length - 1];
        addPipeElbow(visual, geo.sphereLow, mat.steelLight, last.x, last.y, height, pipeRadius);
    });

    addPipeRiser(
        visual,
        geo.cylLow,
        mat.rust,
        PUMP_INLET_CONNECTION.x,
        PUMP_INLET_CONNECTION.y,
        TANK_NOZZLE_Z,
        PIPE_CENTER_Y,
        pipeRadius
    );
    addPipeRiser(
        visual,
        geo.cylLow,
        mat.rust,
        RIG_PROCESS_CONNECTION.x,
        RIG_PROCESS_CONNECTION.y,
        PIPE_CENTER_Y,
        RIG_NOZZLE_Z,
        pipeRadius
    );

    PIPE_STUBS.forEach((stub) => {
        addPipeStub(
            visual,
            geo,
            mat,
            stub.from,
            stub.inward,
            stub.z === undefined ? PIPE_CENTER_Y : stub.z,
            pipeRadius,
            stub.length || PIPE_STUB_LENGTH
        );
    });

    const valve = mapToLocal(
        (SCENE_LAYOUT.eastCorridorX + PUMP_OUTLET_CONNECTION.x) * 0.5,
        SCENE_LAYOUT.processCorridorY,
        PIPE_CENTER_Y
    );
    addPart(visual, geo.box, mat.yellow, valve.x, valve.y + 0.01, valve.z, 0.014, 0.012, 0.02);
    addPart(visual, geo.cylLow, mat.steelDark, valve.x, valve.y + 0.018, valve.z, 0.005, 0.01, 0.005);

    visual.userData.supportCount = supportCount;
    visual.rotation.x = Math.PI / 2;
    return visual;
}

function createContainers() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();

    addPart(visual, geo.box, mat.containerBlue, -0.08, 0.045, 0, 0.16, 0.09, 0.08);
    addPart(visual, geo.box, mat.containerRed, 0.09, 0.04, 0.01, 0.14, 0.08, 0.07);
    addPart(visual, geo.box, mat.orange, -0.08, 0.10, 0, 0.16, 0.02, 0.08);
    addPart(visual, geo.box, mat.yellow, 0.09, 0.085, 0.01, 0.14, 0.015, 0.07);

    placeYUpByFootprint(visual, SCENE_LAYOUT.containersFootprint);
    const root = createPlacedGroup(visual, CONTAINERS_POSITION, 0.1);
    root.name = "containers";
    return root;
}

function createFences() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    const posts = [
        [-0.12, -0.10], [0.12, -0.10], [0.12, 0.10], [-0.12, 0.10]
    ];

    posts.forEach(([x, z], index) => {
        addPart(visual, geo.cylLow, mat.yellow, x, 0.06, z, 0.01, 0.12, 0.01);
        const next = posts[(index + 1) % posts.length];
        addStrut(visual, geo.cylLow, mat.steelLight, x, 0.08, z, next[0], 0.08, next[1], 0.006);
        addStrut(visual, geo.cylLow, mat.steelLight, x, 0.04, z, next[0], 0.04, next[1], 0.006);
    });

    placeYUpByFootprint(visual, SCENE_LAYOUT.tanksFootprint * 1.15);
    const root = createPlacedGroup(visual, TANKS_POSITION);
    root.name = "fences";
    return root;
}

function createHeliPad() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    visual.name = "heliPadVisual";

    addPart(visual, geo.cylLow, mat.steelDark, 0, 0.01, 0, 0.50, 0.02, 0.50);
    addPart(visual, geo.cylLow, mat.yellow, 0, 0.014, 0, 0.50, 0.006, 0.50);
    addPart(visual, geo.cylLow, mat.steelDark, 0, 0.018, 0, 0.44, 0.008, 0.44);
    addPart(visual, geo.box, mat.yellow, -0.14, 0.026, 0, 0.06, 0.012, 0.32);
    addPart(visual, geo.box, mat.yellow, 0.14, 0.026, 0, 0.06, 0.012, 0.32);
    addPart(visual, geo.box, mat.yellow, 0, 0.026, 0, 0.22, 0.012, 0.07);
    addPart(visual, geo.box, mat.suitDark, 0, 0.022, -0.42, 0.16, 0.01, 0.04);
    addBrandMark(visual, 0, 0.03, -0.40, 1.1);

    const lights = [
        [-0.38, 0.38], [0.38, 0.38], [-0.38, -0.38], [0.38, -0.38]
    ];
    heliPadLightMat = mat.padLight;
    lights.forEach(([x, z]) => {
        addPart(visual, geo.sphereTiny, mat.padLight, x, 0.03, z, 0.03, 0.03, 0.03);
        addPart(visual, geo.cylLow, mat.steelDark, x, 0.016, z, 0.018, 0.02, 0.018);
    });

    placeYUpByFootprint(visual, HELI_PAD_SIZE);
    const root = createPlacedGroup(visual, HELI_PAD_CENTER, 0);
    root.name = "heliPad";
    return root;
}

function createHelicopterMesh() {
    const { geo, mat } = getKit();
    const heli = new THREE.Group();
    heli.name = "helicopterMesh";

    addPart(heli, geo.box, mat.steelDark, 0, 0.055, 0.02, 0.09, 0.07, 0.20);
    addPart(heli, geo.box, mat.yellow, 0, 0.055, 0.02, 0.094, 0.016, 0.12);
    addPart(heli, geo.box, mat.panelScreen, 0, 0.062, 0.12, 0.08, 0.055, 0.08);
    addPart(heli, geo.box, mat.steelLight, 0, 0.08, 0.13, 0.084, 0.012, 0.06);
    addPart(heli, geo.cylLow, mat.steel, 0, 0.055, -0.18, 0.018, 0.22, 0.018, Math.PI / 2, 0, 0);
    addPart(heli, geo.box, mat.steelDark, 0, 0.07, -0.30, 0.02, 0.05, 0.06);
    addPart(heli, geo.box, mat.yellow, 0.046, 0.058, 0.00, 0.01, 0.03, 0.08);
    addBrandMark(heli, 0.048, 0.07, 0.04, 0.9, Math.PI / 2);

    addPart(heli, geo.box, mat.steelDark, -0.045, 0.012, 0.02, 0.012, 0.012, 0.22);
    addPart(heli, geo.box, mat.steelDark, 0.045, 0.012, 0.02, 0.012, 0.012, 0.22);
    addPart(heli, geo.cylLow, mat.steelLight, -0.045, 0.03, 0.06, 0.008, 0.04, 0.008);
    addPart(heli, geo.cylLow, mat.steelLight, 0.045, 0.03, 0.06, 0.008, 0.04, 0.008);
    addPart(heli, geo.cylLow, mat.steelLight, -0.045, 0.03, -0.04, 0.008, 0.04, 0.008);
    addPart(heli, geo.cylLow, mat.steelLight, 0.045, 0.03, -0.04, 0.008, 0.04, 0.008);

    addPart(heli, geo.cylLow, mat.steelDark, 0, 0.10, 0.02, 0.012, 0.05, 0.012);
    const mainRotor = new THREE.Group();
    mainRotor.name = "mainRotor";
    mainRotor.position.set(0, 0.128, 0.02);
    addPart(mainRotor, geo.box, mat.suitDark, 0, 0, 0, 0.42, 0.008, 0.03);
    addPart(mainRotor, geo.box, mat.suitDark, 0, 0, 0, 0.03, 0.008, 0.42);
    addPart(mainRotor, geo.cylLow, mat.yellow, 0, 0.006, 0, 0.02, 0.01, 0.02);
    heli.add(mainRotor);

    const tailRotor = new THREE.Group();
    tailRotor.name = "tailRotor";
    tailRotor.position.set(0.03, 0.075, -0.32);
    addPart(tailRotor, geo.box, mat.suitDark, 0, 0, 0, 0.008, 0.09, 0.018);
    addPart(tailRotor, geo.box, mat.suitDark, 0, 0, 0, 0.008, 0.018, 0.09);
    heli.add(tailRotor);

    heli.userData.mainRotor = mainRotor;
    heli.userData.tailRotor = tailRotor;
    return heli;
}

function createHelicopter() {
    if (helicopterRoot) {
        return helicopterRoot;
    }

    const visual = createHelicopterMesh();
    placeYUpByHeight(visual, HELI_HEIGHT);
    const start = HELI_FLIGHT_POINTS.far;
    helicopterRoot = createPlacedGroup(visual, start, getFacingYaw(start, HELI_FLIGHT_POINTS.wait));
    helicopterRoot.name = "helicopter";
    helicopterRoot.userData.parts = visual.userData;
    helicopterRoot.userData.mode = "flying";
    helicopterRoot.userData.modeTimer = 18 + createRng(91)() * 16;
    helicopterRoot.userData.spoolTimer = 0;
    helicopterRoot.userData.patrolIndex = 0;
    helicopterRoot.userData.approachStage = 0;
    helicopterRoot.userData.yaw = helicopterRoot.rotation.z;
    helicopterRoot.userData.rotorSpeed = HELI_ROTOR_FLY;
    helicopterRoot.userData.rotorTarget = HELI_ROTOR_FLY;
    helicopterRoot.userData.rng = createRng(91);
    helicopterRoot.userData.demoReturn = false;
    helicopterRoot.userData.departStarted = false;
    helicopterRoot.userData.departStage = 0;
    markInteractive(
        helicopterRoot,
        "helicopter",
        "Вертолёт",
        "Воздушный транспорт используется для доставки людей и грузов на удалённые производственные площадки."
    );
    return helicopterRoot;
}

function getHeliPoint(key) {
    const point = HELI_FLIGHT_POINTS[key] || HELI_FLIGHT_POINTS.far;
    return new THREE.Vector3(point.x, point.y, point.z);
}

function moveHeliToward(heli, target, speed, delta, yawFollow) {
    const dx = target.x - heli.position.x;
    const dy = target.y - heli.position.y;
    const dz = target.z - heli.position.z;
    const dist = Math.hypot(dx, dy, dz) || 0.0001;
    const step = speed * delta;

    if (dist <= step || dist < 0.01) {
        heli.position.copy(target);
        return true;
    }

    heli.position.x += (dx / dist) * step;
    heli.position.y += (dy / dist) * step;
    heli.position.z += (dz / dist) * step;

    if (yawFollow && Math.hypot(dx, dy) > 0.006) {
        const yaw = getFacingYaw(heli.position, target);
        heli.userData.yaw = lerpAngle(heli.userData.yaw ?? heli.rotation.z, yaw, 2.1 * delta);
        heli.rotation.z = heli.userData.yaw;
    }

    return false;
}

function pickNextPatrolKey(data) {
    const next = Math.floor(data.rng() * HELI_PATROL_KEYS.length);
    if (HELI_PATROL_KEYS[next] === HELI_PATROL_KEYS[data.patrolIndex] && HELI_PATROL_KEYS.length > 1) {
        return (next + 1) % HELI_PATROL_KEYS.length;
    }
    return next;
}

function updateHelicopter(delta) {
    if (!helicopterRoot) {
        return;
    }

    const data = helicopterRoot.userData;
    const visual = helicopterRoot.children[0];
    const mainRotor = visual && visual.userData.mainRotor;
    const tailRotor = visual && visual.userData.tailRotor;

    data.rotorSpeed += (data.rotorTarget - data.rotorSpeed) * Math.min(1, delta * 1.4);
    if (mainRotor) {
        mainRotor.rotation.y += data.rotorSpeed * delta;
    }
    if (tailRotor) {
        tailRotor.rotation.x += data.rotorSpeed * 1.8 * delta;
    }

    if (data.mode === "flying") {
        data.rotorTarget = HELI_ROTOR_FLY;
        const key = HELI_PATROL_KEYS[data.patrolIndex];
        const arrived = moveHeliToward(helicopterRoot, getHeliPoint(key), HELI_FLY_SPEED, delta, true);
        if (arrived) {
            data.patrolIndex = pickNextPatrolKey(data);
        }
        data.modeTimer -= delta;
        if (data.modeTimer <= 0 || data.demoReturn) {
            data.mode = "approach";
            data.approachStage = 0;
            data.modeTimer = 0;
            data.demoReturn = false;
        }
        return;
    }

    if (data.mode === "approach") {
        data.rotorTarget = HELI_ROTOR_FLY;
        const key = HELI_APPROACH_KEYS[Math.min(data.approachStage, HELI_APPROACH_KEYS.length - 1)];
        const arrived = moveHeliToward(helicopterRoot, getHeliPoint(key), HELI_FLY_SPEED, delta, true);
        if (arrived) {
            data.approachStage += 1;
            if (data.approachStage >= HELI_APPROACH_KEYS.length) {
                data.mode = "landing";
                data.rotorTarget = HELI_ROTOR_SLOW;
            }
        }
        return;
    }

    if (data.mode === "landing") {
        data.rotorTarget = HELI_ROTOR_SLOW;
        const landTarget = new THREE.Vector3(HELI_PAD_CENTER.x, HELI_PAD_CENTER.y, HELI_LANDED_Z);
        const landed = moveHeliToward(helicopterRoot, landTarget, HELI_LAND_SPEED, delta, false);
        if (landed) {
            data.mode = "landed";
            data.modeTimer = 12 + data.rng() * 8;
            data.rotorTarget = HELI_ROTOR_LANDED;
        }
        return;
    }

    if (data.mode === "landed") {
        data.rotorTarget = HELI_ROTOR_LANDED;
        data.modeTimer -= delta;
        if (data.modeTimer <= 0) {
            data.mode = "takeoff";
            data.spoolTimer = 1.8;
            data.departStarted = false;
            data.departStage = 0;
            data.rotorTarget = HELI_ROTOR_FLY;
        }
        return;
    }

    if (data.mode === "takeoff") {
        data.rotorTarget = HELI_ROTOR_FLY;
        if (data.spoolTimer > 0) {
            data.spoolTimer -= delta;
            return;
        }

        if (!data.departStarted) {
            const hoverDone = moveHeliToward(helicopterRoot, getHeliPoint("hover"), HELI_LAND_SPEED, delta, false);
            if (hoverDone) {
                data.departStarted = true;
                data.departStage = 0;
            }
            return;
        }

        const key = HELI_DEPART_KEYS[Math.min(data.departStage, HELI_DEPART_KEYS.length - 1)];
        const target = getHeliPoint(key);
        target.z = HELI_CRUISE_Z;
        const departed = moveHeliToward(helicopterRoot, target, HELI_FLY_SPEED, delta, true);
        if (departed) {
            data.departStage += 1;
            if (data.departStage >= HELI_DEPART_KEYS.length) {
                data.mode = "flying";
                data.modeTimer = 22 + data.rng() * 16;
                data.patrolIndex = HELI_PATROL_KEYS.indexOf("west");
            }
        }
    }
}

function createOfficeBuildingMesh() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    visual.name = "officeBuildingMesh";

    addPart(visual, geo.box, mat.concrete, 0, 0.008, 0, 0.24, 0.016, 0.20);
    addPart(visual, geo.box, mat.steelDark, 0, 0.066, 0, 0.22, 0.100, 0.17);
    addPart(visual, geo.box, mat.steel, 0, 0.122, 0, 0.232, 0.014, 0.182);
    addPart(visual, geo.box, mat.yellow, 0, 0.116, 0.086, 0.22, 0.006, 0.004);
    addPart(visual, geo.box, mat.yellow, 0, 0.020, 0.086, 0.22, 0.006, 0.004);
    addPart(visual, geo.box, mat.steelLight, 0, 0.094, 0.100, 0.12, 0.010, 0.048);
    addPart(visual, geo.box, mat.steelDark, -0.058, 0.055, 0.100, 0.010, 0.055, 0.038);
    addPart(visual, geo.box, mat.steelDark, 0.058, 0.055, 0.100, 0.010, 0.055, 0.038);
    addPart(visual, geo.box, mat.concrete, 0, 0.010, 0.098, 0.10, 0.008, 0.042);

    addPart(visual, geo.box, mat.panelScreen, -0.062, 0.072, 0.086, 0.044, 0.032, 0.004);
    addPart(visual, geo.box, mat.panelScreen, 0.062, 0.072, 0.086, 0.044, 0.032, 0.004);
    addPart(visual, geo.box, mat.panelScreen, -0.062, 0.072, -0.086, 0.044, 0.032, 0.004);
    addPart(visual, geo.box, mat.panelScreen, 0.062, 0.072, -0.086, 0.044, 0.032, 0.004);
    addPart(visual, geo.box, mat.reflect, -0.062, 0.072, 0.088, 0.040, 0.005, 0.002);
    addPart(visual, geo.box, mat.reflect, 0.062, 0.072, 0.088, 0.040, 0.005, 0.002);

    addBrandPlaque(visual, 0, 0.104, 0.088, 0, 0, 0, 0.85);
    addBrandMark(visual, -0.086, 0.080, 0.086, 1.0);

    addPart(visual, geo.cylLow, mat.steelLight, 0.072, 0.140, -0.03, 0.014, 0.024, 0.014);
    addPart(visual, geo.box, mat.yellow, -0.08, 0.132, 0.03, 0.032, 0.008, 0.020);
    addPart(visual, geo.box, mat.steelLight, 0.00, 0.136, -0.06, 0.044, 0.012, 0.032);
    addPart(visual, geo.box, mat.steelDark, 0.078, 0.028, 0.100, 0.028, 0.036, 0.028);
    addPart(visual, geo.box, mat.yellow, 0.078, 0.048, 0.100, 0.028, 0.006, 0.028);

    const door = new THREE.Group();
    door.name = "buildingDoor";
    door.position.set(-0.018, 0.046, 0.086);
    addPart(door, geo.box, mat.steel, 0.018, 0, 0, 0.038, 0.078, 0.008);
    addPart(door, geo.box, mat.yellow, 0.018, 0.030, 0.005, 0.038, 0.006, 0.002);
    addPart(door, geo.box, mat.reflect, 0.032, -0.006, 0.005, 0.008, 0.012, 0.002);
    door.userData.targetOpen = 0;
    visual.add(door);
    buildingDoor = door;
    buildingDoorOpen = 0;

    return visual;
}

function createOfficeBuilding() {
    if (buildingRoot) {
        return buildingRoot;
    }

    const visual = createOfficeBuildingMesh();
    placeYUpByFootprint(visual, SCENE_LAYOUT.buildingFootprint);
    buildingRoot = createPlacedGroup(visual, BUILDING_POSITION, SCENE_LAYOUT.buildingYaw);
    buildingRoot.name = "officeBuilding";
    markInteractive(
        buildingRoot,
        "building",
        "Производственный модуль",
        "Служебное здание промысла: здесь сотрудники получают информацию, работают с оборудованием и координируют работу объекта."
    );
    return buildingRoot;
}

function createYardCrate() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    addPart(visual, geo.box, mat.steelDark, 0, 0.018, 0, 0.055, 0.036, 0.04);
    addPart(visual, geo.box, mat.yellow, 0, 0.037, 0, 0.055, 0.004, 0.04);
    addPart(visual, geo.box, mat.steelLight, 0.018, 0.02, 0.022, 0.01, 0.01, 0.004);
    return visual;
}

function createYardGenerator() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    addPart(visual, geo.box, mat.steelDark, 0, 0.022, 0, 0.06, 0.044, 0.038);
    addPart(visual, geo.cylLow, mat.steelLight, 0.018, 0.048, 0, 0.012, 0.016, 0.012);
    addPart(visual, geo.box, mat.yellow, 0, 0.012, 0.021, 0.05, 0.008, 0.004);
    addPart(visual, geo.box, mat.orange, -0.02, 0.04, 0.016, 0.01, 0.01, 0.006);
    return visual;
}

function createYardSpotlight() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    addPart(visual, geo.cylLow, mat.steelDark, 0, 0.04, 0, 0.008, 0.08, 0.008);
    addPart(visual, geo.box, mat.steel, 0, 0.086, 0.012, 0.028, 0.016, 0.02);
    addPart(visual, geo.cone, mat.yellow, 0, 0.082, 0.028, 0.018, 0.012, 0.018, Math.PI / 2, 0, 0);
    return visual;
}

function createSouthYard() {
    const root = new THREE.Group();
    root.name = "southYard";

    SCENE_LAYOUT.southProps.forEach((prop) => {
        let visual;
        if (prop.kind === "generator") {
            visual = createYardGenerator();
            placeYUpByHeight(visual, 0.038);
        } else if (prop.kind === "spotlight") {
            visual = createYardSpotlight();
            placeYUpByHeight(visual, 0.055);
        } else {
            visual = createYardCrate();
            placeYUpByHeight(visual, 0.028);
        }
        root.add(createPlacedGroup(visual, { x: prop.x, y: prop.y, z: 0 }, prop.yaw));
    });

    return root;
}

function updateBuildingDoor(delta) {
    if (!buildingDoor) {
        return;
    }

    const target = buildingDoor.userData.targetOpen || 0;
    buildingDoorOpen += (target - buildingDoorOpen) * Math.min(1, delta * 6.5);
    buildingDoor.rotation.y = -1.15 * buildingDoorOpen;
}

function createServiceRoad() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    addPart(visual, geo.box, mat.steelDark, 0, 0.004, 0, 1.0, 0.008, 0.16);
    addPart(visual, geo.box, mat.yellow, 0, 0.008, 0.07, 1.0, 0.003, 0.012);
    addPart(visual, geo.box, mat.yellow, 0, 0.008, -0.07, 1.0, 0.003, 0.012);
    placeYUpByFootprint(visual, SCENE_LAYOUT.road.length);
    const root = createPlacedGroup(visual, {
        x: SCENE_LAYOUT.road.x,
        y: SCENE_LAYOUT.road.y,
        z: SCENE_LAYOUT.road.z
    }, 0);
    root.name = "serviceRoad";
    return root;
}

function createTechSign(kind) {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    addPart(visual, geo.cylLow, mat.steelDark, 0, 0.03, 0, 0.01, 0.06, 0.01);
    addPart(visual, geo.box, mat.steelDark, 0, 0.08, 0.006, 0.12, 0.05, 0.012);
    addPart(visual, geo.box, mat.yellow, 0, 0.102, 0.01, 0.12, 0.006, 0.004);
    addPart(visual, geo.box, mat.yellow, 0, 0.058, 0.01, 0.12, 0.006, 0.004);
    addBrandMark(visual, -0.038, 0.082, 0.014, 0.7);
    if (kind === "vankor") {
        addPart(visual, geo.box, mat.yellow, 0.018, 0.088, 0.012, 0.046, 0.006, 0.003);
        addPart(visual, geo.box, mat.reflect, 0.016, 0.076, 0.012, 0.04, 0.005, 0.003);
        addPart(visual, geo.box, mat.yellow, 0.014, 0.066, 0.012, 0.034, 0.004, 0.003);
    } else {
        addPart(visual, geo.box, mat.yellow, 0.016, 0.086, 0.012, 0.028, 0.014, 0.003);
        addPart(visual, geo.box, mat.reflect, 0.032, 0.07, 0.012, 0.012, 0.016, 0.003);
    }
    placeYUpByHeight(visual, 0.055);
    return visual;
}

function createSiteSigns() {
    const root = new THREE.Group();
    root.name = "siteSigns";
    SCENE_LAYOUT.signs.forEach((sign) => {
        root.add(createPlacedGroup(createTechSign(sign.kind), { x: sign.x, y: sign.y, z: 0 }, sign.yaw));
    });
    return root;
}

export function createPineTree() {
    const { geo, mat } = getKit();
    const tree = new THREE.Group();
    tree.name = "pineTree";
    addPart(tree, geo.cylLow, mat.bark, 0, 0.035, 0, 0.016, 0.07, 0.016);
    addPart(tree, geo.cone, mat.pineDark, 0, 0.10, 0, 0.055, 0.09, 0.055);
    addPart(tree, geo.cone, mat.pine, 0, 0.16, 0, 0.04, 0.08, 0.04);
    addPart(tree, geo.cone, mat.pineDark, 0, 0.21, 0, 0.026, 0.07, 0.026);
    return tree;
}

export function createSpruceTree() {
    const { geo, mat } = getKit();
    const tree = new THREE.Group();
    tree.name = "spruceTree";
    addPart(tree, geo.cylLow, mat.bark, 0, 0.03, 0, 0.014, 0.06, 0.014);
    addPart(tree, geo.cone, mat.pine, 0, 0.09, 0, 0.048, 0.08, 0.048);
    addPart(tree, geo.cone, mat.pineDark, 0, 0.15, 0, 0.034, 0.09, 0.034);
    addPart(tree, geo.cone, mat.pine, 0, 0.21, 0, 0.022, 0.08, 0.022);
    return tree;
}

function createYoungTree() {
    const { geo, mat } = getKit();
    const tree = new THREE.Group();
    tree.name = "youngTree";
    addPart(tree, geo.cylLow, mat.bark, 0, 0.02, 0, 0.01, 0.04, 0.01);
    addPart(tree, geo.cone, mat.pine, 0, 0.055, 0, 0.03, 0.055, 0.03);
    addPart(tree, geo.cone, mat.pineDark, 0, 0.09, 0, 0.02, 0.05, 0.02);
    return tree;
}

function createBush() {
    const { geo, mat } = getKit();
    const bush = new THREE.Group();
    addPart(bush, geo.sphereLow, mat.bush, 0, 0.025, 0, 0.04, 0.028, 0.036);
    addPart(bush, geo.sphereTiny, mat.pine, 0.018, 0.03, 0.01, 0.022, 0.02, 0.02);
    return bush;
}

function createRock() {
    const { geo, mat } = getKit();
    const rock = new THREE.Group();
    addPart(rock, geo.sphereLow, mat.rock, 0, 0.012, 0, 0.028, 0.016, 0.022);
    return rock;
}

function createStump() {
    const { geo, mat } = getKit();
    const stump = new THREE.Group();
    addPart(stump, geo.cylLow, mat.stump, 0, 0.012, 0, 0.018, 0.024, 0.018);
    addPart(stump, geo.cylLow, mat.bark, 0, 0.024, 0, 0.02, 0.006, 0.02);
    return stump;
}

function createSnowDrift(variant = 0) {
    const { geo, mat } = getKit();
    const drift = new THREE.Group();
    drift.name = "snowDrift";

    if (variant === 1) {
        addPart(drift, geo.sphereLow, mat.snow, 0, 0.012, 0, 0.058, 0.016, 0.026);
        addPart(drift, geo.ico, mat.snowShade, 0.018, 0.01, 0.004, 0.022, 0.012, 0.018);
        addPart(drift, geo.sphereTiny, mat.snow, -0.02, 0.008, -0.004, 0.018, 0.01, 0.016);
    } else if (variant === 2) {
        addPart(drift, geo.sphere, mat.snow, 0, 0.018, 0, 0.08, 0.028, 0.068);
        addPart(drift, geo.ico, mat.snowShade, -0.028, 0.02, 0.01, 0.04, 0.022, 0.034);
        addPart(drift, geo.cone, mat.snow, 0.024, 0.014, -0.012, 0.03, 0.02, 0.03);
        addPart(drift, geo.sphereLow, mat.snowShade, 0.01, 0.012, 0.02, 0.032, 0.014, 0.028);
    } else {
        addPart(drift, geo.sphereLow, mat.snow, 0, 0.012, 0, 0.038, 0.016, 0.032);
        addPart(drift, geo.ico, mat.snowShade, 0.012, 0.01, 0.006, 0.018, 0.01, 0.016);
        addPart(drift, geo.sphereTiny, mat.snow, -0.01, 0.008, -0.008, 0.016, 0.009, 0.014);
    }

    return drift;
}

function isInsideHeliZone(x, y) {
    return x >= HELI_ZONE_BOUNDS.minX
        && x <= HELI_ZONE_BOUNDS.maxX
        && y >= HELI_ZONE_BOUNDS.minY
        && y <= HELI_ZONE_BOUNDS.maxY;
}

function isInsideLayoutKeepout(x, y, extra = 0) {
    return isInsideObstacle(x, y, SCENE_LAYOUT.lakeKeepout, extra);
}

function isSnowSpotFree(x, y) {
    if (isInsideLayoutKeepout(x, y, 0.02)
        || isInsideHeliZone(x, y)
        || isPointInsideSceneObstacle({ x, y }, 0.05)) {
        return false;
    }

    return !WORK_ZONES.some((zone) => isInsideObstacle(x, y, zone, 0.03));
}

function placeNatureItem(factory, position, height, yaw = 0) {
    const visual = factory();
    placeYUpByHeight(visual, height);
    return createPlacedGroup(visual, position, yaw);
}

function isNatureSpotFree(x, y) {
    return !isInsideLayoutKeepout(x, y, 0.02)
        && !isInsideHeliZone(x, y)
        && !isPointInsideSceneObstacle({ x, y }, 0.04);
}

function createProceduralNature() {
    if (natureRoot) {
        return natureRoot;
    }

    natureRoot = new THREE.Group();
    natureRoot.name = "natureRoot";

    const pineSpots = [
        [-0.46, 0.20, 0.10], [-0.42, 0.215, 0.11], [0.42, 0.215, 0.11], [0.46, 0.18, 0.10],
        [-0.47, 0.08, 0.10], [-0.47, -0.08, 0.11], [-0.46, -0.20, 0.10],
        [0.47, 0.08, 0.10], [0.47, -0.04, 0.09],
        [-0.28, -0.21, 0.10], [0.06, -0.21, 0.10], [0.20, -0.21, 0.09]
    ];
    const spruceSpots = [
        [-0.38, 0.215, 0.11], [0.38, 0.215, 0.11],
        [-0.47, 0.00, 0.10], [-0.22, -0.21, 0.10], [0.00, -0.21, 0.09],
        [0.46, -0.10, 0.10], [0.46, 0.14, 0.11],
        [0.14, -0.21, 0.09]
    ];

    pineSpots.forEach(([x, y, height], index) => {
        if (!isNatureSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(createPineTree, { x, y, z: 0 }, height, index * 0.3));
    });

    spruceSpots.forEach(([x, y, height], index) => {
        if (!isNatureSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(createSpruceTree, { x, y, z: 0 }, height, index * 0.21));
    });

    const youngSpots = [
        [-0.46, 0.16, 0.06], [-0.46, -0.14, 0.055], [0.46, 0.04, 0.06],
        [-0.38, 0.215, 0.055], [0.38, 0.215, 0.05], [-0.08, -0.21, 0.055]
    ];
    youngSpots.forEach(([x, y, height], index) => {
        if (!isNatureSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(createYoungTree, { x, y, z: 0 }, height, index * 0.7));
    });

    const bushSpots = [
        [-0.46, 0.18], [-0.47, 0.04], [-0.46, -0.16],
        [0.46, -0.02], [0.20, -0.21],
        [-0.18, -0.21], [0.38, 0.215]
    ];
    bushSpots.forEach(([x, y], index) => {
        if (!isNatureSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(createBush, { x, y, z: 0 }, 0.035, index));
    });

    const rockSpots = [
        [-0.46, 0.14], [0.46, -0.08], [0.18, -0.21], [-0.08, -0.21]
    ];
    rockSpots.forEach(([x, y]) => {
        if (!isNatureSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(createRock, { x, y, z: 0 }, 0.018, x * 4));
    });

    const stumpSpots = [
        [-0.46, 0.10], [0.18, -0.21], [0.46, 0.10]
    ];
    stumpSpots.forEach(([x, y]) => {
        if (!isNatureSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(createStump, { x, y, z: 0 }, 0.022));
    });

    const smallDrifts = [
        [-0.46, 0.18, 0.014, 0.4], [-0.46, 0.06, 0.014, 0.2],
        [-0.46, -0.12, 0.013, 2.4], [-0.40, -0.20, 0.014, 0.8],
        [-0.18, -0.20, 0.013, 0.3], [0.06, -0.20, 0.014, 2.1], [0.18, -0.20, 0.013, 1.3],
        [0.46, 0.10, 0.013, 0.6], [0.46, -0.02, 0.013, 1.5],
        [-0.22, -0.20, 0.013, 0.7], [-0.08, -0.19, 0.013, 1.8]
    ];
    smallDrifts.forEach(([x, y, height, yaw]) => {
        if (!isSnowSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(() => createSnowDrift(0), { x, y, z: 0 }, height, yaw));
    });

    const largeDrifts = [
        [-0.46, 0.20, 0.026, 0.4], [-0.34, -0.20, 0.024, 1.6],
        [0.18, -0.20, 0.026, 2.3], [0.46, 0.16, 0.024, 0.9]
    ];
    largeDrifts.forEach(([x, y, height, yaw]) => {
        if (!isSnowSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(() => createSnowDrift(2), { x, y, z: 0 }, height, yaw));
    });

    const snowRolls = [
        [-0.46, 0.08, 0.012, 1.2], [-0.46, -0.16, 0.012, 1.05],
        [-0.16, -0.20, 0.012, 0.05], [0.06, -0.20, 0.012, 0.1]
    ];
    snowRolls.forEach(([x, y, height, yaw]) => {
        if (!isSnowSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(() => createSnowDrift(1), { x, y, z: 0 }, height, yaw));
    });

    return natureRoot;
}

function createBird() {
    const { geo, mat } = getKit();
    const bird = new THREE.Group();
    addPart(bird, geo.sphereTiny, mat.bird, 0, 0, 0, 0.016, 0.007, 0.006);
    addPart(bird, geo.sphereTiny, mat.bird, 0.012, 0, 0.002, 0.006, 0.005, 0.005);

    const leftWing = new THREE.Group();
    leftWing.position.set(0, 0.005, 0);
    addPart(leftWing, geo.box, mat.birdWing, 0, 0.01, 0, 0.01, 0.018, 0.003);
    const rightWing = new THREE.Group();
    rightWing.position.set(0, -0.005, 0);
    addPart(rightWing, geo.box, mat.birdWing, 0, -0.01, 0, 0.01, 0.018, 0.003);

    bird.add(leftWing, rightWing);
    bird.userData.wings = { left: leftWing, right: rightWing };
    return bird;
}

function getBirdFacingYaw(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}

function getBirdTargetIndex(route, segment, dir) {
    if (route.pingPong) {
        return segment + dir;
    }

    return (segment + 1) % route.points.length;
}

function createProceduralBirds() {
    if (birdInstances.length > 0) {
        return birdInstances[0].parent;
    }

    const root = new THREE.Group();
    root.name = "birdsRoot";

    BIRD_ROUTES.forEach((route, index) => {
        const bird = createBird();
        bird.name = `bird${index + 1}`;
        bird.scale.setScalar(route.scale);
        const jitterX = ((index % 3) - 1) * 0.016;
        const jitterY = (index % 2 === 0 ? 1 : -1) * 0.01;
        const jitterZ = index * 0.004;
        const points = route.points.map((point) => ({
            x: point.x + jitterX,
            y: point.y + jitterY,
            z: point.z + jitterZ
        }));
        const localRoute = { ...route, points };
        const start = points[0];
        const next = points[1] || start;
        bird.position.set(start.x, start.y, Math.max(start.z, BIRD_MIN_Z));
        bird.rotation.z = getBirdFacingYaw(start, next);
        bird.userData.route = localRoute;
        bird.userData.segment = 0;
        bird.userData.dir = 1;
        bird.userData.t = 0;
        bird.userData.yaw = bird.rotation.z;
        bird.userData.wobble = index * 1.37;
        bird.userData.flapRate = 14 + index * 0.9;
        root.add(bird);
        birdInstances.push(bird);
    });

    return root;
}

function updateBirds(delta, elapsedTime) {
    const step = Math.min(delta, 0.05);

    birdInstances.forEach((bird) => {
        const route = bird.userData.route;
        const points = route.points;
        const flap = Math.sin(elapsedTime * (bird.userData.flapRate || 16) + route.delay) * 0.6;
        bird.userData.wings.left.rotation.x = flap;
        bird.userData.wings.right.rotation.x = -flap;

        if (elapsedTime < route.delay) {
            return;
        }

        let segment = bird.userData.segment;
        let dir = bird.userData.dir;
        let toIndex = getBirdTargetIndex(route, segment, dir);

        if (route.pingPong && (toIndex < 0 || toIndex >= points.length)) {
            dir *= -1;
            toIndex = segment + dir;
        }

        const from = points[segment];
        const to = points[toIndex];
        const length = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) || 0.001;
        bird.userData.t += (route.speed * step) / length;

        if (bird.userData.t >= 1) {
            bird.userData.t = 0;
            segment = toIndex;
            if (route.pingPong) {
                const peek = segment + dir;
                if (peek < 0 || peek >= points.length) {
                    dir *= -1;
                }
            }
            toIndex = getBirdTargetIndex(route, segment, dir);
        }

        bird.userData.segment = segment;
        bird.userData.dir = dir;

        const currentFrom = points[segment];
        const currentTo = points[toIndex];
        const t = bird.userData.t;
        bird.position.set(
            THREE.MathUtils.lerp(currentFrom.x, currentTo.x, t),
            THREE.MathUtils.lerp(currentFrom.y, currentTo.y, t),
            Math.max(
                THREE.MathUtils.lerp(currentFrom.z, currentTo.z, t)
                    + Math.sin(elapsedTime * 1.15 + (bird.userData.wobble || 0)) * 0.008,
                BIRD_MIN_Z
            )
        );

        const targetYaw = getBirdFacingYaw(currentFrom, currentTo);
        bird.userData.yaw = lerpAngle(bird.userData.yaw, targetYaw, route.turnSpeed * step);
        bird.rotation.z = bird.userData.yaw;
    });
}

export function createProceduralSite() {
    if (siteRoot) {
        return Promise.resolve(siteRoot);
    }

    siteRoot = new THREE.Group();
    siteRoot.name = "siteRoot";
    const pumpjack = createPumpjack();
    const pumpPanel = createPumpjackControlPanel();
    markInteractive(
        pumpPanel,
        "pumpjack",
        "Насос-качалка",
        "Механизм для механизированной добычи нефти. Рабочий контролирует оборудование и следит за его работой."
    );
    pumpPanel.userData.highlightTarget = pumpjack;

    siteRoot.add(
        pumpjack,
        pumpPanel,
        createTanks(),
        createPipes(),
        createContainers(),
        createFences(),
        createOfficeBuilding(),
        createSouthYard(),
        createServiceRoad(),
        createHeliPad(),
        createHelicopter(),
        createSiteSigns(),
        createProceduralNature(),
        createProceduralBirds()
    );

    return Promise.resolve(siteRoot);
}

export function updateSiteAnimation(elapsedTime, delta = 0.016) {
    if (pumpjackBeam) {
        pumpjackBeam.rotation.z = Math.sin(elapsedTime * 1.15) * 0.38;
    }

    if (rigWarningLight) {
        const on = (elapsedTime % 1) < 0.5;
        rigWarningLight.mat.emissiveIntensity = on ? 1.85 : 0.06;
        rigWarningLight.light.intensity = on ? 0.42 : 0;
    }

    if (heliPadLightMat) {
        heliPadLightMat.emissiveIntensity = (elapsedTime % 1.6) < 0.8 ? 0.95 : 0.18;
    }

    updateBuildingDoor(delta);
    updateHelicopter(delta);
}

export function updateProceduralScene(delta, elapsedTime, flags) {
    if (flags.bears) {
        updateBearMovement(delta);
        updateBearAnimation(delta, elapsedTime);
    }

    if (flags.workers) {
        updateWorkers(delta, elapsedTime);
    }

    if (flags.rig) {
        updateSiteAnimation(elapsedTime, delta);
    }

    updateBirds(delta, elapsedTime);
}
