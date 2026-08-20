import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";

const IMAGE_TARGET_SRC = "./assets/vankor-land.mind";
const OIL_RIG_SRC = "./assets/models/oil-rig-optimized.glb";
const BEAR_SRC = "./assets/models/bear.glb";
const NEFTANIK_SRC = "./assets/models/neftanik.glb";
const OIL_RIG_FOOTPRINT = 0.6;
const BEAR_HEIGHT = 0.065;
const NEFTANIK_HEIGHT = 0.08;
const BEAR_POSITION = { x: -0.34, y: -0.30, z: 0 };
const NEFTANIK_POSITION = { x: 0.32, y: 0.14, z: 0 };
const NEFTANIK_YAW = -Math.PI / 2;
const USE_PROCEDURAL_BEAR = true;
const BEAR_MOVE_SPEED = 0.07;
const BEAR_TURN_SPEED = 2.4;
const BEAR_WAYPOINT_EPSILON = 0.03;
const BEAR_WALK_FREQUENCY = 7;

const bearWaypoints = [
    new THREE.Vector3(-0.34, -0.30, 0),
    new THREE.Vector3(-0.34, 0.26, 0),
    new THREE.Vector3(0.20, 0.28, 0),
    new THREE.Vector3(0.30, -0.26, 0)
];

const startScreen = document.querySelector("#start-screen");
const startButton = document.querySelector("#start-button");
const stopButton = document.querySelector("#stop-button");
const arControls = document.querySelector("#ar-controls");
const errorMessage = document.querySelector("#error-message");
const arErrorMessage = document.querySelector("#ar-error-message");

let mindarThree = null;
let arAnchor = null;
let gltfLoader = null;
let oilRigModel = null;
let oilRigLoadPromise = null;
let bearModel = null;
let bearLoadPromise = null;
let bearGroup = null;
let bearBody = null;
let bearHead = null;
let bearFrontLegs = { left: null, right: null };
let bearBackLegs = { left: null, right: null };
let bearTail = null;
let bearWaypointIndex = 0;
let bearWalkAmount = 0;
let bearWalkDisplay = 0;
let animationClock = null;
let neftanikModel = null;
let neftanikLoadPromise = null;
let isStarting = false;
let isRunning = false;

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;

    if (arErrorMessage) {
        arErrorMessage.textContent = message;
        arErrorMessage.hidden = false;
    }
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;

    if (arErrorMessage) {
        arErrorMessage.textContent = "";
        arErrorMessage.hidden = true;
    }
}

function setBusy(isBusy) {
    startButton.disabled = isBusy;
    stopButton.disabled = isBusy;
}

function showStartScreen() {
    startScreen.classList.remove("hidden");
    arControls.classList.add("hidden");
}

function showArControls() {
    startScreen.classList.add("hidden");
    arControls.classList.remove("hidden");
}

function getCameraErrorMessage(error) {
    const errorName = error && error.name;

    if (!window.isSecureContext) {
        return "Камера недоступна: откройте страницу по HTTPS или через localhost. На iPhone обычный http://IP не работает.";
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return "Этот браузер не даёт доступ к камере. Откройте страницу в Safari на iPhone.";
    }

    if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        return "Нет доступа к камере. Разрешите камеру для этого сайта в настройках Safari и нажмите «Запустить AR» снова.";
    }

    if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        return "Камера не найдена. Проверьте, что на устройстве есть камера и она не занята другим приложением.";
    }

    if (errorName === "NotReadableError" || errorName === "TrackStartError") {
        return "Камера занята другим приложением. Закройте другие приложения с камерой и попробуйте снова.";
    }

    if (errorName === "OverconstrainedError" || errorName === "ConstraintNotSatisfiedError") {
        return "Не удалось включить заднюю камеру. Попробуйте перезагрузить страницу.";
    }

    if (errorName === "SecurityError") {
        return "Браузер заблокировал камеру по соображениям безопасности. Используйте HTTPS или localhost.";
    }

    return "Не удалось получить доступ к камере. Разрешите камеру в Safari и откройте страницу по HTTPS.";
}

function createScene() {
    if (mindarThree) {
        return mindarThree;
    }

    const container = document.querySelector("#ar-container");

    mindarThree = new MindARThree({
        container,
        imageTargetSrc: IMAGE_TARGET_SRC,
        uiLoading: "yes",
        uiScanning: "yes",
        uiError: "yes"
    });

    arAnchor = mindarThree.addAnchor(0);

    const { scene } = mindarThree;
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4b4b4b, 1));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(0.5, 1, 1);
    scene.add(directionalLight);

    return mindarThree;
}

function placeModelOnImageTarget(model) {
    model.rotation.x = Math.PI / 2;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const footprint = Math.max(size.x, size.y);

    if (footprint > 0) {
        model.scale.setScalar(OIL_RIG_FOOTPRINT / footprint);
        model.updateMatrixWorld(true);
        box.setFromObject(model);
    }

    model.position.set(
        -(box.min.x + box.max.x) / 2,
        -(box.min.y + box.max.y) / 2,
        -box.min.z
    );
}

function getGltfLoader() {
    if (!gltfLoader) {
        gltfLoader = new GLTFLoader();
    }

    return gltfLoader;
}

function getAnimationClipNames(gltf) {
    return (gltf.animations || []).map((clip) => clip.name || "(unnamed)");
}

function removeHelperMeshByName(model, meshName) {
    const toRemove = [];

    model.traverse((child) => {
        if (child.isMesh && child.name === meshName) {
            toRemove.push(child);
        }
    });

    toRemove.forEach((child) => {
        child.removeFromParent();
    });
}

function placeCharacterOnTarget(model, targetHeight) {
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

function createPlacedModelGroup(visual, position, yaw = 0) {
    const group = new THREE.Group();
    group.add(visual);
    group.position.set(position.x, position.y, position.z);
    group.rotation.z = yaw;
    return group;
}

function addModelToAnchor(model) {
    if (isRunning && arAnchor && model.parent !== arAnchor.group) {
        arAnchor.group.add(model);
    }
}

function loadOilRigModel() {
    if (oilRigModel) {
        return Promise.resolve(oilRigModel);
    }

    if (!oilRigLoadPromise) {
        oilRigLoadPromise = getGltfLoader().loadAsync(OIL_RIG_SRC).then((gltf) => {
            oilRigModel = gltf.scene;
            placeModelOnImageTarget(oilRigModel);
            return oilRigModel;
        }).catch((error) => {
            oilRigLoadPromise = null;
            throw error;
        });
    }

    return oilRigLoadPromise;
}

function loadBearModel() {
    if (bearModel) {
        return Promise.resolve(bearModel);
    }

    if (!bearLoadPromise) {
        bearLoadPromise = getGltfLoader().loadAsync(BEAR_SRC).then((gltf) => {
            const clipNames = getAnimationClipNames(gltf);
            console.info("bear.glb animation clips:", clipNames);

            const visual = gltf.scene;
            removeHelperMeshByName(visual, "Cube");
            placeCharacterOnTarget(visual, BEAR_HEIGHT);

            bearModel = createPlacedModelGroup(visual, BEAR_POSITION);
            bearModel.name = "bearModel";
            bearModel.userData.animationClips = clipNames;
            return bearModel;
        }).catch((error) => {
            bearLoadPromise = null;
            throw error;
        });
    }

    return bearLoadPromise;
}

function createBearMaterials() {
    return {
        fur: new THREE.MeshStandardMaterial({
            color: 0x5a341c,
            roughness: 0.9,
            metalness: 0
        }),
        furDark: new THREE.MeshStandardMaterial({
            color: 0x3f2416,
            roughness: 0.92,
            metalness: 0
        }),
        muzzle: new THREE.MeshStandardMaterial({
            color: 0xd2b48c,
            roughness: 0.78,
            metalness: 0
        }),
        nose: new THREE.MeshStandardMaterial({
            color: 0x1a120c,
            roughness: 0.55,
            metalness: 0
        }),
        eye: new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 0.35,
            metalness: 0.05
        }),
        earInner: new THREE.MeshStandardMaterial({
            color: 0x8d5344,
            roughness: 0.85,
            metalness: 0
        })
    };
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

function createBearLeg(materials, x, z, isFront) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.30, z);
    leg.userData.restRotationX = 0;

    const thigh = createBearMesh(
        new THREE.CapsuleGeometry(isFront ? 0.07 : 0.078, 0.14, 2, 6),
        materials.furDark,
        new THREE.Vector3(0, -0.12, 0)
    );

    const foot = createBearMesh(
        new THREE.SphereGeometry(1, 6, 4),
        materials.furDark,
        new THREE.Vector3(0, -0.28, 0.035),
        new THREE.Vector3(isFront ? 0.10 : 0.115, 0.045, 0.14)
    );

    leg.add(thigh, foot);
    return leg;
}

function createLowPolyBear() {
    const materials = createBearMaterials();
    const group = new THREE.Group();
    group.name = "bearGroup";

    const bodyPivot = new THREE.Group();
    bodyPivot.name = "bearBody";
    bodyPivot.position.set(0, 0.40, 0);
    bodyPivot.userData.restY = 0.40;

    const body = createBearMesh(
        new THREE.SphereGeometry(1, 8, 6),
        materials.fur,
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.36, 0.30, 0.50)
    );

    const hump = createBearMesh(
        new THREE.SphereGeometry(1, 7, 5),
        materials.furDark,
        new THREE.Vector3(0, 0.18, -0.12),
        new THREE.Vector3(0.22, 0.14, 0.24)
    );

    const tailPivot = new THREE.Group();
    tailPivot.name = "bearTail";
    tailPivot.position.set(0, -0.04, -0.48);

    const tail = createBearMesh(
        new THREE.SphereGeometry(1, 6, 4),
        materials.furDark,
        new THREE.Vector3(0, 0, -0.04),
        new THREE.Vector3(0.07, 0.065, 0.09)
    );
    tailPivot.add(tail);

    bodyPivot.add(body, hump, tailPivot);

    const headPivot = new THREE.Group();
    headPivot.name = "bearHead";
    headPivot.position.set(0, 0.14, 0.40);
    headPivot.userData.restX = 0;
    headPivot.userData.restY = 0;

    const head = createBearMesh(
        new THREE.SphereGeometry(1, 8, 6),
        materials.fur,
        new THREE.Vector3(0, 0.08, 0.08),
        new THREE.Vector3(0.22, 0.20, 0.20)
    );

    const muzzle = createBearMesh(
        new THREE.SphereGeometry(1, 7, 5),
        materials.muzzle,
        new THREE.Vector3(0, 0.03, 0.26),
        new THREE.Vector3(0.10, 0.08, 0.14)
    );

    const nose = createBearMesh(
        new THREE.SphereGeometry(1, 6, 4),
        materials.nose,
        new THREE.Vector3(0, 0.045, 0.39),
        new THREE.Vector3(0.035, 0.03, 0.03)
    );

    const leftEar = createBearMesh(
        new THREE.SphereGeometry(1, 6, 4),
        materials.fur,
        new THREE.Vector3(-0.14, 0.24, 0.02),
        new THREE.Vector3(0.08, 0.09, 0.06)
    );
    const rightEar = createBearMesh(
        new THREE.SphereGeometry(1, 6, 4),
        materials.fur,
        new THREE.Vector3(0.14, 0.24, 0.02),
        new THREE.Vector3(0.08, 0.09, 0.06)
    );

    const leftEarInner = createBearMesh(
        new THREE.SphereGeometry(1, 5, 4),
        materials.earInner,
        new THREE.Vector3(-0.14, 0.24, 0.055),
        new THREE.Vector3(0.045, 0.05, 0.02)
    );
    const rightEarInner = createBearMesh(
        new THREE.SphereGeometry(1, 5, 4),
        materials.earInner,
        new THREE.Vector3(0.14, 0.24, 0.055),
        new THREE.Vector3(0.045, 0.05, 0.02)
    );

    const leftEye = createBearMesh(
        new THREE.SphereGeometry(1, 5, 4),
        materials.eye,
        new THREE.Vector3(-0.08, 0.12, 0.24),
        new THREE.Vector3(0.028, 0.032, 0.028)
    );
    const rightEye = createBearMesh(
        new THREE.SphereGeometry(1, 5, 4),
        materials.eye,
        new THREE.Vector3(0.08, 0.12, 0.24),
        new THREE.Vector3(0.028, 0.032, 0.028)
    );

    headPivot.add(
        head,
        muzzle,
        nose,
        leftEar,
        rightEar,
        leftEarInner,
        rightEarInner,
        leftEye,
        rightEye
    );
    bodyPivot.add(headPivot);

    const frontLeftLeg = createBearLeg(materials, -0.18, 0.24, true);
    const frontRightLeg = createBearLeg(materials, 0.18, 0.24, true);
    const backLeftLeg = createBearLeg(materials, -0.20, -0.28, false);
    const backRightLeg = createBearLeg(materials, 0.20, -0.28, false);

    frontLeftLeg.name = "bearFrontLeftLeg";
    frontRightLeg.name = "bearFrontRightLeg";
    backLeftLeg.name = "bearBackLeftLeg";
    backRightLeg.name = "bearBackRightLeg";

    group.add(bodyPivot, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg);

    bearGroup = group;
    bearBody = bodyPivot;
    bearHead = headPivot;
    bearFrontLegs = { left: frontLeftLeg, right: frontRightLeg };
    bearBackLegs = { left: backLeftLeg, right: backRightLeg };
    bearTail = tailPivot;

    group.userData.parts = {
        body: bodyPivot,
        head: headPivot,
        frontLegs: bearFrontLegs,
        backLegs: bearBackLegs,
        tail: tailPivot
    };

    return group;
}

function getBearFacingYaw(from, to) {
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

function createProceduralBear() {
    if (bearModel) {
        return Promise.resolve(bearModel);
    }

    const visual = createLowPolyBear();
    placeCharacterOnTarget(visual, BEAR_HEIGHT);

    const start = bearWaypoints[0];
    const next = bearWaypoints[1];
    const yaw = getBearFacingYaw(start, next);

    bearModel = createPlacedModelGroup(visual, start, yaw);
    bearModel.name = "bearModel";
    bearModel.userData.isProcedural = true;
    bearWaypointIndex = 0;
    bearWalkAmount = 0;

    return Promise.resolve(bearModel);
}

function updateBearAnimation(delta, elapsedTime) {
    if (!bearBody || !bearHead || !bearTail) {
        return;
    }

    bearWalkDisplay = THREE.MathUtils.damp(bearWalkDisplay, bearWalkAmount, 8, delta);

    const amount = bearWalkDisplay;
    const t = elapsedTime * BEAR_WALK_FREQUENCY;
    const swing = Math.sin(t) * 0.42 * amount;
    const idle = 1 - amount;

    if (bearFrontLegs.left) {
        bearFrontLegs.left.rotation.x = swing;
    }

    if (bearBackLegs.right) {
        bearBackLegs.right.rotation.x = swing;
    }

    if (bearFrontLegs.right) {
        bearFrontLegs.right.rotation.x = -swing;
    }

    if (bearBackLegs.left) {
        bearBackLegs.left.rotation.x = -swing;
    }

    bearBody.position.y = bearBody.userData.restY + Math.abs(Math.sin(t * 2)) * 0.018 * amount;
    bearBody.rotation.z = Math.sin(t) * 0.07 * amount;
    bearBody.rotation.x = Math.sin(t * 2) * 0.045 * amount + Math.sin(elapsedTime * 1.4) * 0.02 * idle;

    bearHead.rotation.x = Math.sin(t * 2) * 0.08 * amount + Math.sin(elapsedTime * 1.1) * 0.03 * idle;
    bearHead.rotation.y = Math.sin(t * 0.5) * 0.10 * amount;

    bearTail.rotation.z = Math.sin(t * 2.2) * 0.35 * amount + Math.sin(elapsedTime * 2) * 0.12 * idle;
}

function updateBearMovement(delta) {
    if (!bearModel || !bearModel.userData.isProcedural) {
        bearWalkAmount = 0;
        return;
    }

    const target = bearWaypoints[bearWaypointIndex];
    const position = bearModel.position;
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= BEAR_WAYPOINT_EPSILON) {
        bearWaypointIndex = (bearWaypointIndex + 1) % bearWaypoints.length;
        return;
    }

    const desiredYaw = getBearFacingYaw(position, target);
    bearModel.rotation.z = lerpAngle(
        bearModel.rotation.z,
        desiredYaw,
        BEAR_TURN_SPEED * delta
    );

    const step = Math.min(BEAR_MOVE_SPEED * delta, distance);
    position.x += (dx / distance) * step;
    position.y += (dy / distance) * step;
    position.z = 0;

    bearWalkAmount = 1;
}

function loadNeftanikModel() {
    if (neftanikModel) {
        return Promise.resolve(neftanikModel);
    }

    if (!neftanikLoadPromise) {
        neftanikLoadPromise = getGltfLoader().loadAsync(NEFTANIK_SRC).then((gltf) => {
            const clipNames = getAnimationClipNames(gltf);
            console.info("neftanik.glb animation clips:", clipNames);

            const visual = gltf.scene;
            placeCharacterOnTarget(visual, NEFTANIK_HEIGHT);

            neftanikModel = createPlacedModelGroup(visual, NEFTANIK_POSITION, NEFTANIK_YAW);
            neftanikModel.name = "neftanikModel";
            neftanikModel.userData.animationClips = clipNames;
            return neftanikModel;
        }).catch((error) => {
            neftanikLoadPromise = null;
            throw error;
        });
    }

    return neftanikLoadPromise;
}

function stopRenderer() {
    if (mindarThree) {
        mindarThree.renderer.setAnimationLoop(null);
    }
}

function stopMindAR() {
    stopRenderer();

    if (!mindarThree) {
        return;
    }

    try {
        if (mindarThree.controller) {
            mindarThree.controller.stopProcessVideo();
        }
    } catch (error) {
        console.warn("Не удалось остановить обработку видео MindAR", error);
    }

    try {
        if (mindarThree.video && mindarThree.video.srcObject) {
            mindarThree.video.srcObject.getTracks().forEach((track) => {
                track.stop();
            });
        }
    } catch (error) {
        console.warn("Не удалось остановить поток камеры", error);
    }

    try {
        if (mindarThree.video) {
            mindarThree.video.remove();
            mindarThree.video = null;
        }
    } catch (error) {
        console.warn("Не удалось удалить video-элемент", error);
    }

    try {
        if (mindarThree.ui) {
            mindarThree.ui.hideLoading();
            mindarThree.ui.hideScanning();
            mindarThree.ui.hideCompatibility();
        }
    } catch (error) {
        console.warn("Не удалось скрыть UI MindAR", error);
    }
}

function wrapGetUserMedia() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
            restore() {},
            getError() {
                return null;
            }
        };
    }

    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    let cameraError = null;

    navigator.mediaDevices.getUserMedia = async function (constraints) {
        try {
            return await originalGetUserMedia.call(navigator.mediaDevices, constraints);
        } catch (error) {
            cameraError = error;
            throw error;
        }
    };

    return {
        restore() {
            navigator.mediaDevices.getUserMedia = originalGetUserMedia;
        },
        getError() {
            return cameraError;
        }
    };
}

async function startAR() {
    if (isStarting || isRunning) {
        return;
    }

    isStarting = true;
    setBusy(true);
    clearError();

    const cameraGuard = wrapGetUserMedia();

    try {
        const session = createScene();
        const { renderer, scene, camera } = session;

        await session.start();

        if (!animationClock) {
            animationClock = new THREE.Clock();
        } else {
            animationClock.start();
        }

        renderer.setAnimationLoop(() => {
            const delta = Math.min(animationClock.getDelta(), 0.05);
            const elapsedTime = animationClock.getElapsedTime();

            if (USE_PROCEDURAL_BEAR && bearModel) {
                updateBearMovement(delta);
                updateBearAnimation(delta, elapsedTime);
            }

            renderer.render(scene, camera);
        });

        isRunning = true;
        showArControls();
    } catch (error) {
        const cameraError = cameraGuard.getError() || error;
        console.error("Ошибка запуска AR", cameraError);
        stopMindAR();
        isRunning = false;
        showStartScreen();
        showError(getCameraErrorMessage(cameraError));
    } finally {
        cameraGuard.restore();
        isStarting = false;
        setBusy(false);
    }

    if (!isRunning) {
        return;
    }

    const modelErrors = [];

    const modelJobs = [
        {
            load: loadOilRigModel,
            message: "Не удалось загрузить 3D-модель нефтяной буровой установки. Проверьте файл assets/models/oil-rig-optimized.glb и попробуйте снова."
        },
        {
            load: USE_PROCEDURAL_BEAR ? createProceduralBear : loadBearModel,
            message: USE_PROCEDURAL_BEAR
                ? "Не удалось создать процедурную модель медведя."
                : "Не удалось загрузить 3D-модель медведя. Проверьте файл assets/models/bear.glb и попробуйте снова."
        },
        {
            load: loadNeftanikModel,
            message: "Не удалось загрузить 3D-модель нефтяника. Проверьте файл assets/models/neftanik.glb и попробуйте снова."
        }
    ];

    await Promise.all(modelJobs.map(async (job) => {
        try {
            const model = await job.load();
            addModelToAnchor(model);
        } catch (modelError) {
            console.error(job.message, modelError);
            modelErrors.push(job.message);
        }
    }));

    if (modelErrors.length > 0) {
        showError(modelErrors.join(" "));
    }
}

function stopAR() {
    if (isStarting) {
        return;
    }

    stopMindAR();
    isRunning = false;
    showStartScreen();
}

startButton.addEventListener("click", () => {
    startAR();
});

stopButton.addEventListener("click", () => {
    stopAR();
});
