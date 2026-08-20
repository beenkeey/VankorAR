import * as THREE from "three";

const BEAR_HEIGHT = 0.065;
const WORKER_HEIGHT = 0.072;
const PROCEDURAL_RIG_FOOTPRINT = 0.23;
const RIG_POSITION = { x: 0.22, y: 0.24, z: 0 };
const PUMPJACK_POSITION = { x: 0.32, y: -0.06, z: 0 };
const TANKS_POSITION = { x: -0.22, y: -0.26, z: 0 };
const CONTAINERS_POSITION = { x: -0.36, y: -0.08, z: 0 };
const BEAR_TURN_SPEED = 2.4;
const BEAR_WALK_FREQUENCY = 7;
const BEAR_REACH_EPSILON = 0.028;
const CHARACTER_RADIUS = 0.02;
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();

export const BEAR_WANDER_BOUNDS = {
    minX: -0.40,
    maxX: 0.40,
    minY: -0.36,
    maxY: 0.36
};

export const SCENE_OBSTACLES = [
    { name: "rig", x: 0.22, y: 0.24, radiusX: 0.135, radiusY: 0.135 },
    { name: "pumpjack", x: 0.32, y: -0.06, radiusX: 0.09, radiusY: 0.08 },
    { name: "tanks", x: -0.22, y: -0.26, radiusX: 0.13, radiusY: 0.10 },
    { name: "containers", x: -0.36, y: -0.08, radiusX: 0.09, radiusY: 0.08 },
    { name: "pipesEastWest", x: 0.05, y: -0.26, radiusX: 0.17, radiusY: 0.045 },
    { name: "pipesNorthSouth", x: 0.20, y: -0.08, radiusX: 0.045, radiusY: 0.16 }
];

export const WORK_ZONES = [
    { name: "rig", x: 0.07, y: 0.16, radiusX: 0.06, radiusY: 0.06 },
    { name: "tanks", x: -0.22, y: -0.12, radiusX: 0.07, radiusY: 0.05 },
    { name: "pipes", x: 0.06, y: -0.16, radiusX: 0.07, radiusY: 0.05 },
    { name: "yard", x: -0.08, y: 0.06, radiusX: 0.12, radiusY: 0.10 }
];

const BEAR_SPAWNS = [
    {
        name: "bearForest",
        position: { x: -0.32, y: 0.26, z: 0 },
        speed: 0.042,
        turnSpeed: 1.55,
        phase: 0.35,
        seed: 11,
        pause: 1.1,
        pauseMin: 0.9,
        pauseMax: 2.6,
        zone: { x: -0.30, y: 0.26, radiusX: 0.11, radiusY: 0.09 },
        zoneBias: 0.8
    },
    {
        name: "bearRoad",
        position: { x: -0.28, y: -0.02, z: 0 },
        speed: 0.062,
        turnSpeed: 1.85,
        phase: 1.7,
        seed: 27,
        pause: 0.5,
        pauseMin: 0.35,
        pauseMax: 1.4,
        zone: { x: -0.28, y: -0.02, radiusX: 0.10, radiusY: 0.12 },
        zoneBias: 0.74
    },
    {
        name: "bearCenter",
        position: { x: -0.04, y: 0.02, z: 0 },
        speed: 0.054,
        turnSpeed: 1.7,
        phase: 2.9,
        seed: 43,
        pause: 0.7,
        pauseMin: 0.5,
        pauseMax: 1.9,
        zone: { x: -0.04, y: 0.04, radiusX: 0.14, radiusY: 0.12 },
        zoneBias: 0.72
    }
];

const WORKER_SPAWNS = [
    {
        name: "workerRig",
        role: "rigWork",
        workZone: "rig",
        stationed: true,
        position: { x: 0.07, y: 0.16, z: 0 },
        yaw: -0.6,
        speed: 0,
        phase: 1.1,
        scale: 1.03,
        workDuration: 4.8,
        idleDuration: 1.4,
        waypoints: []
    },
    {
        name: "workerPatrol",
        role: "patrol",
        workZone: "yard",
        stationed: false,
        position: { x: -0.08, y: 0.06, z: 0 },
        speed: 0.04,
        phase: 0.2,
        scale: 0.98,
        waypoints: [
            new THREE.Vector3(-0.08, 0.06, 0),
            new THREE.Vector3(-0.22, -0.12, 0),
            new THREE.Vector3(0.07, 0.16, 0),
            new THREE.Vector3(0.06, -0.16, 0)
        ]
    },
    {
        name: "workerTanks",
        role: "tankWork",
        workZone: "tanks",
        stationed: true,
        position: { x: -0.22, y: -0.12, z: 0 },
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
        position: { x: 0.06, y: -0.16, z: 0 },
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
        position: { x: -0.32, y: 0.18, z: 0 },
        speed: 0.036,
        phase: 2.8,
        scale: 1.05,
        waypoints: [
            new THREE.Vector3(-0.32, 0.18, 0),
            new THREE.Vector3(-0.18, 0.28, 0),
            new THREE.Vector3(-0.28, 0.02, 0)
        ]
    },
    {
        name: "workerPumpjack",
        role: "pumpWork",
        workZone: "yard",
        stationed: true,
        position: { x: 0.18, y: -0.02, z: 0 },
        yaw: -0.3,
        speed: 0,
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
        position: { x: 0.02, y: 0.28, z: 0 },
        speed: 0.033,
        phase: 0.55,
        scale: 0.96,
        waypoints: [
            new THREE.Vector3(0.02, 0.28, 0),
            new THREE.Vector3(-0.12, 0.22, 0),
            new THREE.Vector3(0.08, 0.12, 0)
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
            capsule: new THREE.CapsuleGeometry(0.075, 0.14, 2, 6),
            cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
            cylLow: new THREE.CylinderGeometry(1, 1, 1, 6),
            cone: new THREE.ConeGeometry(1, 1, 6),
            torus: new THREE.TorusGeometry(1, 0.22, 6, 10)
        },
        mat: {
            fur: standard(0x5a341c, 0.9),
            furDark: standard(0x3f2416, 0.92),
            muzzle: standard(0xd2b48c, 0.78),
            nose: standard(0x1a120c, 0.55),
            eye: standard(0x0a0a0a, 0.35),
            earInner: standard(0x8d5344, 0.85),
            steel: lambert(0x4d5359),
            steelDark: lambert(0x2c3236),
            steelLight: lambert(0x6a7278),
            yellow: lambert(0xe6b325),
            orange: lambert(0xd35400),
            tank: lambert(0xc5ccd1),
            tankDark: lambert(0x7d868c),
            concrete: lambert(0x7a7d80),
            rust: lambert(0x6b3e2e),
            suit: lambert(0xc45c12),
            suitDark: lambert(0x3a3d44),
            helmet: lambert(0xf0c419),
            skin: lambert(0xc6865a),
            boot: lambert(0x1c1c1c),
            glove: lambert(0x2a2a2a),
            containerBlue: lambert(0x2e6aa6),
            containerRed: lambert(0xa33b2b),
            bark: lambert(0x5a3b24),
            pine: lambert(0x2f5c32),
            pineDark: lambert(0x234728),
            bush: lambert(0x3d6b34),
            rock: lambert(0x7a776f),
            stump: lambert(0x6a4a32),
            bird: lambert(0x2c2c2c),
            birdWing: lambert(0x3a3a3a)
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

    const thigh = new THREE.Mesh(geo.capsule, mat.furDark);
    thigh.position.y = -0.12;
    if (isFront) {
        thigh.scale.set(0.93, 1, 0.93);
    }

    const foot = createBearMesh(
        geo.sphereLow,
        mat.furDark,
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
        mat.furDark,
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
}

function updateBearInstanceMovement(bear, delta) {
    const data = bear.userData;
    const position = bear.position;

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
    const backpack = addPart(body, geo.box, mat.suitDark, 0, 0.05, -0.09, 0.14, 0.16, 0.06);

    const head = new THREE.Group();
    head.name = "head";
    head.position.set(0, 0.24, 0);
    addPart(head, geo.sphere, mat.skin, 0, 0, 0.01, 0.08, 0.09, 0.08);
    const helmet = new THREE.Group();
    helmet.name = "helmet";
    addPart(helmet, geo.cylLow, mat.helmet, 0, 0.06, 0, 0.09, 0.06, 0.09);
    addPart(helmet, geo.cylLow, mat.helmet, 0, 0.035, 0.04, 0.10, 0.015, 0.11);
    head.add(helmet);
    body.add(head);

    const leftArm = createLimb(shared, true);
    leftArm.name = "leftArm";
    leftArm.position.set(-0.14, 0.12, 0);
    const rightArm = createLimb(shared, true);
    rightArm.name = "rightArm";
    rightArm.position.set(0.14, 0.12, 0);
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
        parts.body.position.y = parts.body.userData.restY + idle * 0.004;
        parts.head.rotation.y = Math.sin(elapsedTime * 0.7 + worker.userData.phase) * 0.12;
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

function updateWorkerMovement(worker, delta) {
    const data = worker.userData;

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

export function createProceduralOilRig() {
    if (rigRoot) {
        return Promise.resolve(rigRoot);
    }

    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    visual.name = "oilRig";

    const height = 1.42;
    const bottom = 0.18;
    const top = 0.07;
    const levels = [0.10, 0.36, 0.62, 0.88, 1.12, 1.32];
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
    addPart(visual, geo.box, mat.steelDark, -0.08, 0.16, 0.08, 0.16, 0.12, 0.14);

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

    const platformY = 1.12;
    const ps = spreadAt(platformY) * 2 + 0.04;
    addPart(visual, geo.box, mat.steel, 0, platformY, 0, ps, 0.025, ps);
    addPart(visual, geo.box, mat.yellow, 0, platformY + 0.04, ps / 2, ps, 0.02, 0.016);
    addPart(visual, geo.box, mat.yellow, 0, platformY + 0.04, -ps / 2, ps, 0.02, 0.016);
    addPart(visual, geo.box, mat.yellow, ps / 2, platformY + 0.04, 0, 0.016, 0.02, ps);
    addPart(visual, geo.box, mat.yellow, -ps / 2, platformY + 0.04, 0, 0.016, 0.02, ps);

    addPart(visual, geo.box, mat.steelDark, 0, 1.34, 0, 0.16, 0.04, 0.16);
    addPart(visual, geo.torus, mat.steelLight, 0, 1.40, 0, 0.05, 0.05, 0.05, Math.PI / 2, 0, 0);
    addPart(visual, geo.cone, mat.orange, 0, 1.46, 0, 0.04, 0.08, 0.04);
    addPart(visual, geo.cylLow, mat.steelDark, 0, 0.70, 0, 0.02, 1.16, 0.02);

    const ladderX = 0;
    for (let i = 0; i < 9; i += 1) {
        const y = 0.14 + i * 0.12;
        const s = spreadAt(y);
        addPart(visual, geo.box, mat.yellow, ladderX, y, s + 0.01, 0.08, 0.01, 0.012);
    }
    addStrut(visual, geo.cylLow, mat.yellow, -0.04, 0.12, bottom + 0.01, -0.02, 1.12, spreadAt(1.12) + 0.01, 0.008);
    addStrut(visual, geo.cylLow, mat.yellow, 0.04, 0.12, bottom + 0.01, 0.02, 1.12, spreadAt(1.12) + 0.01, 0.008);

    addPart(visual, geo.cylLow, mat.rust, 0.12, 0.22, 0.18, 0.025, 0.28, 0.025, 0, 0, Math.PI / 5);
    addPart(visual, geo.cylLow, mat.rust, 0.16, 0.18, 0.10, 0.02, 0.22, 0.02, 0, 0, Math.PI / 2);

    placeYUpByFootprint(visual, PROCEDURAL_RIG_FOOTPRINT);
    rigRoot = createPlacedGroup(visual, RIG_POSITION);
    rigRoot.name = "proceduralOilRig";

    return Promise.resolve(rigRoot);
}

function createPumpjack() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();

    addPart(visual, geo.box, mat.steelDark, 0, 0.03, 0, 0.36, 0.06, 0.16);
    addPart(visual, geo.box, mat.yellow, 0, 0.07, 0.07, 0.36, 0.02, 0.02);
    addPart(visual, geo.box, mat.steel, -0.04, 0.22, 0.04, 0.04, 0.36, 0.04);
    addPart(visual, geo.box, mat.steel, -0.04, 0.22, -0.04, 0.04, 0.36, 0.04);
    addPart(visual, geo.box, mat.steel, -0.04, 0.38, 0, 0.05, 0.05, 0.12);

    const beam = new THREE.Group();
    beam.position.set(-0.04, 0.40, 0);
    addPart(beam, geo.box, mat.steelLight, 0.06, 0, 0, 0.46, 0.045, 0.05);
    addPart(beam, geo.box, mat.orange, 0.28, -0.04, 0, 0.10, 0.12, 0.06);
    addPart(beam, geo.box, mat.steelDark, -0.18, 0.03, 0, 0.10, 0.08, 0.08);
    addPart(beam, geo.cylLow, mat.steelDark, 0.30, -0.16, 0, 0.012, 0.22, 0.012);
    visual.add(beam);

    addPart(visual, geo.cylLow, mat.steel, 0.22, 0.08, 0, 0.03, 0.12, 0.03);
    addPart(visual, geo.cone, mat.rust, 0.22, 0.16, 0, 0.04, 0.06, 0.04);

    placeYUpByFootprint(visual, 0.13);
    const root = createPlacedGroup(visual, PUMPJACK_POSITION, 0);
    root.name = "pumpjack";
    root.userData.beam = beam;
    pumpjackBeam = beam;
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
    });

    addPart(visual, geo.box, mat.concrete, 0, 0.015, 0, 0.42, 0.03, 0.22);

    placeYUpByFootprint(visual, 0.18);
    const root = createPlacedGroup(visual, TANKS_POSITION, 0);
    root.name = "tanks";
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
    const count = Math.max(2, Math.round(length / spacing));

    for (let i = 0; i <= count; i += 1) {
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
    }
}

function createPipes() {
    const { geo, mat } = getKit();
    const visual = new THREE.Group();
    visual.name = "pipes";

    const pipeRadius = 0.013;
    const supportTopY = 0.034;
    const pipeCenterY = supportTopY + pipeRadius;
    const route = [
        { x: -0.10, y: -0.26 },
        { x: 0.20, y: -0.26 },
        { x: 0.20, y: 0.10 }
    ];

    const riserStart = mapToLocal(route[0].x, route[0].y, pipeCenterY * 0.5);
    addPart(visual, geo.cylLow, mat.rust, riserStart.x, riserStart.y, riserStart.z, pipeRadius, pipeCenterY, pipeRadius);
    addPipeSupport(visual, geo, mat.steelDark, route[0].x, route[0].y, supportTopY, pipeRadius);

    for (let i = 0; i < route.length - 1; i += 1) {
        const from = route[i];
        const to = route[i + 1];
        addPipeSegment(visual, geo.cylLow, mat.rust, from.x, from.y, to.x, to.y, pipeCenterY, pipeRadius);
        addPipeSupports(visual, geo, mat.steelDark, from.x, from.y, to.x, to.y, supportTopY, pipeRadius, 0.06);
        addPipeElbow(visual, geo.sphereLow, mat.steelLight, from.x, from.y, pipeCenterY, pipeRadius);
    }

    const last = route[route.length - 1];
    addPipeElbow(visual, geo.sphereLow, mat.steelLight, last.x, last.y, pipeCenterY, pipeRadius);
    addPipeSupport(visual, geo, mat.steelDark, last.x, last.y, supportTopY, pipeRadius);

    const riserEnd = mapToLocal(last.x, last.y, pipeCenterY + 0.018);
    addPart(visual, geo.cylLow, mat.rust, riserEnd.x, pipeCenterY + 0.01, riserEnd.z, pipeRadius, 0.028, pipeRadius);
    addPart(visual, geo.box, mat.yellow, riserEnd.x, pipeCenterY + 0.026, riserEnd.z, 0.028, 0.014, 0.028);

    const valve = mapToLocal(0.06, -0.26, pipeCenterY);
    addPart(visual, geo.box, mat.yellow, valve.x, valve.y + 0.012, valve.z, 0.02, 0.016, 0.028);
    addPart(visual, geo.cylLow, mat.steelDark, valve.x, valve.y + 0.022, valve.z, 0.007, 0.014, 0.007);

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

    placeYUpByFootprint(visual, 0.16);
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

    placeYUpByFootprint(visual, 0.20);
    const root = createPlacedGroup(visual, TANKS_POSITION);
    root.name = "fences";
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

function placeNatureItem(factory, position, height, yaw = 0) {
    const visual = factory();
    placeYUpByHeight(visual, height);
    return createPlacedGroup(visual, position, yaw);
}

function isNatureSpotFree(x, y) {
    return !isPointInsideSceneObstacle({ x, y }, 0.04);
}

function createProceduralNature() {
    if (natureRoot) {
        return natureRoot;
    }

    natureRoot = new THREE.Group();
    natureRoot.name = "natureRoot";

    const pineSpots = [
        [-0.38, 0.32, 0.12], [-0.34, 0.34, 0.11], [-0.38, 0.26, 0.13], [-0.30, 0.34, 0.10],
        [-0.39, 0.14, 0.12], [-0.38, 0.04, 0.11], [-0.39, -0.18, 0.12],
        [-0.38, -0.32, 0.10], [-0.08, -0.34, 0.11], [0.14, -0.34, 0.12],
        [0.36, -0.32, 0.11], [0.38, 0.06, 0.12]
    ];
    const spruceSpots = [
        [-0.24, 0.34, 0.13], [-0.16, 0.34, 0.11], [-0.04, 0.35, 0.12], [0.06, 0.34, 0.10],
        [-0.37, -0.08, 0.12], [-0.32, -0.34, 0.11], [0.04, -0.35, 0.10],
        [0.38, -0.24, 0.12], [0.38, -0.16, 0.11], [0.38, 0.16, 0.13],
        [-0.39, -0.26, 0.11], [0.38, -0.08, 0.10]
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

    const bushSpots = [
        [-0.34, 0.28], [-0.36, 0.18], [-0.35, 0.08], [-0.34, -0.30],
        [-0.14, 0.32], [0.00, 0.33], [0.12, -0.33], [0.34, -0.28],
        [0.36, -0.12], [-0.26, 0.30]
    ];
    bushSpots.forEach(([x, y], index) => {
        if (!isNatureSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(createBush, { x, y, z: 0 }, 0.035, index));
    });

    const rockSpots = [
        [-0.36, 0.22], [-0.30, 0.32], [0.10, -0.33], [0.34, -0.20], [-0.20, 0.33], [0.36, 0.02]
    ];
    rockSpots.forEach(([x, y]) => {
        if (!isNatureSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(createRock, { x, y, z: 0 }, 0.018, x * 4));
    });

    const stumpSpots = [
        [-0.33, 0.20], [-0.22, 0.32], [0.08, -0.33], [0.34, -0.14]
    ];
    stumpSpots.forEach(([x, y]) => {
        if (!isNatureSpotFree(x, y)) {
            return;
        }
        natureRoot.add(placeNatureItem(createStump, { x, y, z: 0 }, 0.022));
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

function createProceduralBirds() {
    if (birdInstances.length > 0) {
        return birdInstances[0].parent;
    }

    const root = new THREE.Group();
    root.name = "birdsRoot";

    const flights = [
        { cx: -0.08, cy: 0.10, rx: 0.18, ry: 0.10, height: 0.16, speed: 0.55, phase: 0.2 },
        { cx: 0.04, cy: -0.04, rx: 0.16, ry: 0.12, height: 0.14, speed: 0.72, phase: 1.4 },
        { cx: -0.18, cy: 0.20, rx: 0.12, ry: 0.08, height: 0.18, speed: 0.48, phase: 2.1 },
        { cx: 0.12, cy: 0.06, rx: 0.14, ry: 0.09, height: 0.15, speed: -0.63, phase: 0.8 },
        { cx: -0.04, cy: -0.16, rx: 0.15, ry: 0.07, height: 0.17, speed: 0.40, phase: 2.7 },
        { cx: 0.08, cy: 0.18, rx: 0.10, ry: 0.11, height: 0.13, speed: -0.52, phase: 1.1 }
    ];

    flights.forEach((flight, index) => {
        const bird = createBird();
        bird.name = `bird${index + 1}`;
        bird.userData.flight = flight;
        root.add(bird);
        birdInstances.push(bird);
    });

    return root;
}

function updateBirds(elapsedTime) {
    birdInstances.forEach((bird) => {
        const flight = bird.userData.flight;
        const t = elapsedTime * flight.speed + flight.phase;
        const x = flight.cx + Math.cos(t) * flight.rx;
        const y = flight.cy + Math.sin(t) * flight.ry;
        const z = flight.height + Math.sin(t * 2.2) * 0.012;

        bird.position.set(x, y, z);
        const vx = -Math.sin(t) * flight.rx * flight.speed;
        const vy = Math.cos(t) * flight.ry * flight.speed;
        bird.rotation.z = Math.atan2(vx, -vy);

        const flap = Math.sin(elapsedTime * 16 + flight.phase) * 0.6;
        bird.userData.wings.left.rotation.x = flap;
        bird.userData.wings.right.rotation.x = -flap;
    });
}

export function createProceduralSite() {
    if (siteRoot) {
        return Promise.resolve(siteRoot);
    }

    siteRoot = new THREE.Group();
    siteRoot.name = "siteRoot";
    siteRoot.add(
        createPumpjack(),
        createTanks(),
        createPipes(),
        createContainers(),
        createFences(),
        createProceduralNature(),
        createProceduralBirds()
    );

    return Promise.resolve(siteRoot);
}

export function updateSiteAnimation(elapsedTime) {
    if (pumpjackBeam) {
        pumpjackBeam.rotation.z = Math.sin(elapsedTime * 1.15) * 0.38;
    }
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
        updateSiteAnimation(elapsedTime);
    }

    updateBirds(elapsedTime);
}
