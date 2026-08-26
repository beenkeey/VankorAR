/*
 * VankorAR
 * Original author: Данил Каханов
 * WebAR visualization project
 * MindAR + Three.js
 * 2026
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";
import {
    createProceduralBears,
    createProceduralOilRig,
    createProceduralSite,
    createProceduralWorkers,
    updateProceduralScene
} from "./procedural-scene.js?v=18";
import {
    bindSceneInteraction,
    unbindSceneInteraction,
    updateSceneInteraction
} from "./interaction.js?v=18";

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
const USE_PROCEDURAL_WORKER = true;
const USE_PROCEDURAL_RIG = true;

const AR_STABILIZATION_DEBUG = false;
const AR_STABILIZATION_TEST_MODE = false;
const USE_MINDAR_ONE_EURO = false;
const USE_ROOT_SMOOTHING = true;

const AR_POSITION_SMOOTHING = 5;
const AR_POSITION_SMOOTHING_FAST = 16;
const AR_ROTATION_SMOOTHING = 4;
const AR_ROTATION_SMOOTHING_FAST = 12;
const AR_SCALE_SMOOTHING = 2.5;
const AR_SCALE_SMOOTHING_FAST = 8;

const AR_POSITION_DEADBAND = 0.0035;
const AR_ROTATION_DEADBAND = 0.004;
const AR_SCALE_DEADBAND = 0.006;

const AR_POSITION_FAST_THRESHOLD = 0.12;
const AR_ROTATION_FAST_THRESHOLD = 0.35;
const AR_SCALE_FAST_THRESHOLD = 0.08;

const AR_MOTION_CONSISTENCY = 0.45;
const AR_TARGET_HOLD_MS = 320;
const AR_FOUND_FRAMES = 3;
const AR_DEBUG_LOG_INTERVAL = 20;
const AR_RECOVER_SNAP_POS = 0.22;
const AR_RECOVER_SNAP_ROT = 0.55;

const startScreen = document.querySelector("#start-screen");
const startButton = document.querySelector("#start-button");
const stopButton = document.querySelector("#stop-button");
const arControls = document.querySelector("#ar-controls");
const errorMessage = document.querySelector("#error-message");
const arErrorMessage = document.querySelector("#ar-error-message");

let mindarThree = null;
let arAnchor = null;
let arDisplayRoot = null;
let gltfLoader = null;
let oilRigModel = null;
let oilRigLoadPromise = null;
let bearModel = null;
let bearLoadPromise = null;
let animationClock = null;
let neftanikModel = null;
let neftanikLoadPromise = null;
let isStarting = false;
let isRunning = false;
let arStabHasPose = false;
let arStabLastSeenMs = 0;
let arStabDebugFrame = 0;
let arStabTrackState = "LOST";
let arStabVisibleStreak = 0;
let arStabHiddenStreak = 0;
let arStabHasLastRaw = false;
let arStabPosSpeed = 0;
let arStabRotSpeed = 0;
let arStabScaleSpeed = 0;
let arStabConsistency = 0;
let arStabScaleSign = 0;
let arStabScaleStreak = 0;
let arStabClass = "TARGET_LOST";
let arStabPosAlpha = 0;
let arStabRotAlpha = 0;
let arStabScaleAlpha = 0;

const _arRawPos = new THREE.Vector3();
const _arRawQuat = new THREE.Quaternion();
const _arRawScale = new THREE.Vector3();
const _arWorkQuat = new THREE.Quaternion();
const _arLastRawPos = new THREE.Vector3();
const _arLastRawQuat = new THREE.Quaternion();
const _arLastRawScale = new THREE.Vector3();
const _arRawVel = new THREE.Vector3();
const _arPrevVel = new THREE.Vector3();

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
        uiError: "yes",
        filterMinCF: USE_MINDAR_ONE_EURO ? 0.001 : 1,
        filterBeta: USE_MINDAR_ONE_EURO ? 0.001 : 0
    });

    arAnchor = mindarThree.addAnchor(0);

    arDisplayRoot = new THREE.Group();
    arDisplayRoot.name = "arDisplayRoot";
    arDisplayRoot.visible = false;
    mindarThree.scene.add(arDisplayRoot);

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

function smoothingAlpha(speed, delta) {
    return 1 - Math.exp(-speed * delta);
}

function alignQuaternion(_from, to) {
    if (_from.dot(to) < 0) {
        to.x = -to.x;
        to.y = -to.y;
        to.z = -to.z;
        to.w = -to.w;
    }
    return to;
}

function ensureStabTestBadge() {
    let badge = document.querySelector("#stab-test-badge");

    if (!AR_STABILIZATION_TEST_MODE) {
        if (badge) {
            badge.hidden = true;
        }
        return;
    }

    if (!badge) {
        badge = document.createElement("div");
        badge.id = "stab-test-badge";
        document.body.appendChild(badge);
    }

    badge.hidden = false;
    return badge;
}

function updateStabTestOverlay() {
    if (!AR_STABILIZATION_TEST_MODE || !arDisplayRoot) {
        return;
    }

    const badge = ensureStabTestBadge();
    if (!badge) {
        return;
    }

    const raw = `${_arRawPos.x.toFixed(3)}, ${_arRawPos.y.toFixed(3)}, ${_arRawPos.z.toFixed(3)}`;
    const displayed = `${arDisplayRoot.position.x.toFixed(3)}, ${arDisplayRoot.position.y.toFixed(3)}, ${arDisplayRoot.position.z.toFixed(3)}`;
    const posError = arDisplayRoot.position.distanceTo(_arRawPos);
    const rotError = arDisplayRoot.quaternion.angleTo(_arRawQuat);

    badge.textContent = [
        `RAW ${raw}`,
        `FILTERED ${USE_MINDAR_ONE_EURO ? "MindAR 1€" : "off"}`,
        `DISPLAYED ${displayed}`,
        `pos ${posError.toFixed(4)} rot ${rotError.toFixed(4)}`,
        `vel ${arStabPosSpeed.toFixed(3)} ${arStabClass}`,
        arStabTrackState
    ].join("\n");
}

function resetArStabilization() {
    arStabHasPose = false;
    arStabLastSeenMs = 0;
    arStabDebugFrame = 0;
    arStabTrackState = "LOST";
    arStabVisibleStreak = 0;
    arStabHiddenStreak = 0;
    arStabHasLastRaw = false;
    arStabPosSpeed = 0;
    arStabRotSpeed = 0;
    arStabScaleSpeed = 0;
    arStabConsistency = 0;
    arStabScaleSign = 0;
    arStabScaleStreak = 0;
    arStabClass = "TARGET_LOST";
    arStabPosAlpha = 0;
    arStabRotAlpha = 0;
    arStabScaleAlpha = 0;
    _arPrevVel.set(0, 0, 0);

    if (arDisplayRoot) {
        arDisplayRoot.visible = false;
        arDisplayRoot.position.set(0, 0, 0);
        arDisplayRoot.quaternion.identity();
        arDisplayRoot.scale.set(1, 1, 1);
    }
}

function logArStabilization(posError, rotError, visible) {
    console.log("[AR stab]", {
        class: arStabClass,
        trackState: arStabTrackState,
        rawPosition: {
            x: Number(_arRawPos.x.toFixed(5)),
            y: Number(_arRawPos.y.toFixed(5)),
            z: Number(_arRawPos.z.toFixed(5))
        },
        filteredPosition: USE_MINDAR_ONE_EURO ? "mindar-one-euro" : "passthrough",
        displayedPosition: {
            x: Number(arDisplayRoot.position.x.toFixed(5)),
            y: Number(arDisplayRoot.position.y.toFixed(5)),
            z: Number(arDisplayRoot.position.z.toFixed(5))
        },
        rawRotation: {
            x: Number(_arRawQuat.x.toFixed(5)),
            y: Number(_arRawQuat.y.toFixed(5)),
            z: Number(_arRawQuat.z.toFixed(5)),
            w: Number(_arRawQuat.w.toFixed(5))
        },
        displayedRotation: {
            x: Number(arDisplayRoot.quaternion.x.toFixed(5)),
            y: Number(arDisplayRoot.quaternion.y.toFixed(5)),
            z: Number(arDisplayRoot.quaternion.z.toFixed(5)),
            w: Number(arDisplayRoot.quaternion.w.toFixed(5))
        },
        positionDelta: Number(posError.toFixed(6)),
        rotationDelta: Number(rotError.toFixed(6)),
        velocity: Number(arStabPosSpeed.toFixed(5)),
        rotVelocity: Number(arStabRotSpeed.toFixed(5)),
        scaleVelocity: Number(arStabScaleSpeed.toFixed(5)),
        consistency: Number(arStabConsistency.toFixed(3)),
        smoothingAlpha: {
            position: Number(arStabPosAlpha.toFixed(4)),
            rotation: Number(arStabRotAlpha.toFixed(4)),
            scale: Number(arStabScaleAlpha.toFixed(4))
        },
        targetVisibility: visible,
        mindarOneEuro: USE_MINDAR_ONE_EURO,
        rootSmoothing: USE_ROOT_SMOOTHING
    });
}

function snapDisplayToRaw() {
    arDisplayRoot.position.copy(_arRawPos);
    arDisplayRoot.quaternion.copy(_arRawQuat);
    arDisplayRoot.scale.copy(_arRawScale);
    arStabHasPose = true;
    arStabPosAlpha = 1;
    arStabRotAlpha = 1;
    arStabScaleAlpha = 1;
}

function updateRawMotion(delta) {
    const safeDelta = Math.max(delta, 1 / 120);

    if (!arStabHasLastRaw) {
        _arLastRawPos.copy(_arRawPos);
        _arLastRawQuat.copy(_arRawQuat);
        _arLastRawScale.copy(_arRawScale);
        arStabHasLastRaw = true;
        return;
    }

    alignQuaternion(_arLastRawQuat, _arRawQuat);

    _arRawVel.subVectors(_arRawPos, _arLastRawPos).divideScalar(safeDelta);
    const instantPosSpeed = _arRawVel.length();
    const instantRotSpeed = _arLastRawQuat.angleTo(_arRawQuat) / safeDelta;
    const instantScaleSpeed = Math.abs(_arRawScale.x - _arLastRawScale.x) / safeDelta;
    const velBlend = smoothingAlpha(10, safeDelta);

    arStabPosSpeed += (instantPosSpeed - arStabPosSpeed) * velBlend;
    arStabRotSpeed += (instantRotSpeed - arStabRotSpeed) * velBlend;
    arStabScaleSpeed += (instantScaleSpeed - arStabScaleSpeed) * velBlend;

    const prevSpeed = _arPrevVel.length();
    if (prevSpeed > 1e-5 && instantPosSpeed > 1e-5) {
        arStabConsistency = _arRawVel.dot(_arPrevVel) / (instantPosSpeed * prevSpeed);
    } else {
        arStabConsistency = 0;
    }

    const scaleSign = Math.sign(_arRawScale.x - _arLastRawScale.x);
    if (scaleSign !== 0 && scaleSign === arStabScaleSign) {
        arStabScaleStreak += 1;
    } else {
        arStabScaleStreak = scaleSign === 0 ? 0 : 1;
        arStabScaleSign = scaleSign;
    }

    _arPrevVel.copy(_arRawVel);
    _arLastRawPos.copy(_arRawPos);
    _arLastRawQuat.copy(_arRawQuat);
    _arLastRawScale.copy(_arRawScale);
}

function classifyArMotion() {
    const realPosition = arStabPosSpeed > AR_POSITION_FAST_THRESHOLD
        && arStabConsistency > AR_MOTION_CONSISTENCY;
    const realRotation = arStabRotSpeed > AR_ROTATION_FAST_THRESHOLD
        && arStabConsistency > 0.2;
    const realScale = arStabScaleSpeed > AR_SCALE_FAST_THRESHOLD && arStabScaleStreak >= 4;

    if (realPosition || realRotation || realScale) {
        return "REAL_MOTION";
    }

    return "TRACKING_NOISE";
}

function applyRootSmoothing(delta, motionClass) {
    const posError = arDisplayRoot.position.distanceTo(_arRawPos);
    _arWorkQuat.copy(_arRawQuat);
    alignQuaternion(arDisplayRoot.quaternion, _arWorkQuat);
    const rotError = arDisplayRoot.quaternion.angleTo(_arWorkQuat);
    const scaleError = Math.abs(arDisplayRoot.scale.x - _arRawScale.x);
    const isReal = motionClass === "REAL_MOTION";

    arStabPosAlpha = 0;
    arStabRotAlpha = 0;
    arStabScaleAlpha = 0;

    if (!USE_ROOT_SMOOTHING) {
        snapDisplayToRaw();
        return { posError, rotError };
    }

    const followPos = isReal || posError > AR_POSITION_DEADBAND * 2.4;
    const followRot = isReal || rotError > AR_ROTATION_DEADBAND * 2.4;
    const followScale = isReal || scaleError > AR_SCALE_DEADBAND * 2.2;

    if (followPos && (isReal || posError > AR_POSITION_DEADBAND)) {
        arStabPosAlpha = smoothingAlpha(
            isReal ? AR_POSITION_SMOOTHING_FAST : AR_POSITION_SMOOTHING,
            delta
        );
        arDisplayRoot.position.lerp(_arRawPos, arStabPosAlpha);
    }

    if (followRot && (isReal || rotError > AR_ROTATION_DEADBAND)) {
        arStabRotAlpha = smoothingAlpha(
            isReal ? AR_ROTATION_SMOOTHING_FAST : AR_ROTATION_SMOOTHING,
            delta
        );
        arDisplayRoot.quaternion.slerp(_arWorkQuat, arStabRotAlpha);
    }

    if (followScale && (isReal || scaleError > AR_SCALE_DEADBAND)) {
        arStabScaleAlpha = smoothingAlpha(
            isReal ? AR_SCALE_SMOOTHING_FAST : AR_SCALE_SMOOTHING,
            delta
        );
        arDisplayRoot.scale.lerp(_arRawScale, arStabScaleAlpha);
    }

    return { posError, rotError };
}

function updateArStabilization(delta) {
    if (!arAnchor || !arDisplayRoot) {
        return;
    }

    const now = performance.now();
    const targetVisible = Boolean(arAnchor.visible);
    const debugEnabled = AR_STABILIZATION_DEBUG || AR_STABILIZATION_TEST_MODE;

    if (targetVisible) {
        arStabLastSeenMs = now;
        arStabHiddenStreak = 0;
        arStabVisibleStreak += 1;
        arAnchor.group.matrix.decompose(_arRawPos, _arRawQuat, _arRawScale);
        updateRawMotion(delta);
        arStabClass = classifyArMotion();

        if (arStabTrackState === "LOST") {
            arStabTrackState = "FOUND_PENDING";
        }

        if (arStabTrackState === "LOST_PENDING") {
            arStabTrackState = "TRACKING";
            arStabClass = "TARGET_RECOVERED";
        }

        if (arStabTrackState === "FOUND_PENDING" && arStabVisibleStreak >= AR_FOUND_FRAMES) {
            arStabTrackState = "TRACKING";
            arStabClass = "TARGET_RECOVERED";
            if (!arStabHasPose
                || arDisplayRoot.position.distanceTo(_arRawPos) > AR_RECOVER_SNAP_POS
                || arDisplayRoot.quaternion.angleTo(_arRawQuat) > AR_RECOVER_SNAP_ROT) {
                snapDisplayToRaw();
            }
        }

        if (arStabTrackState === "TRACKING") {
            if (!arStabHasPose) {
                snapDisplayToRaw();
            } else {
                applyRootSmoothing(delta, arStabClass === "TARGET_RECOVERED" ? "REAL_MOTION" : arStabClass);
            }
            arDisplayRoot.visible = true;
        }

        if (debugEnabled) {
            arStabDebugFrame += 1;
            if (arStabDebugFrame % AR_DEBUG_LOG_INTERVAL === 0) {
                logArStabilization(
                    arDisplayRoot.position.distanceTo(_arRawPos),
                    arDisplayRoot.quaternion.angleTo(_arRawQuat),
                    targetVisible
                );
                updateStabTestOverlay();
            }
        }
        return;
    }

    arStabVisibleStreak = 0;
    arStabHiddenStreak += 1;
    arStabClass = "TARGET_LOST";

    if (arStabTrackState === "TRACKING" || arStabTrackState === "FOUND_PENDING") {
        arStabTrackState = "LOST_PENDING";
    }

    if (arStabTrackState === "LOST_PENDING") {
        if (now - arStabLastSeenMs < AR_TARGET_HOLD_MS) {
            arDisplayRoot.visible = arStabHasPose;
            return;
        }
        arStabTrackState = "LOST";
    }

    arDisplayRoot.visible = false;
}

function addModelToAnchor(model) {
    if (isRunning && arDisplayRoot && model.parent !== arDisplayRoot) {
        arDisplayRoot.add(model);
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
        resetArStabilization();

        if (!animationClock) {
            animationClock = new THREE.Clock();
        } else {
            animationClock.start();
        }

        renderer.setAnimationLoop(() => {
            const delta = Math.min(animationClock.getDelta(), 0.05);
            const elapsedTime = animationClock.getElapsedTime();

            updateArStabilization(delta);

            updateProceduralScene(delta, elapsedTime, {
                bears: USE_PROCEDURAL_BEAR,
                workers: USE_PROCEDURAL_WORKER,
                rig: USE_PROCEDURAL_RIG
            });
            updateSceneInteraction(delta);

            renderer.render(scene, camera);
        });

        isRunning = true;
        showArControls();
        ensureStabTestBadge();
        bindSceneInteraction({
            camera,
            renderer,
            getTrackingVisible: () => Boolean(arDisplayRoot && arDisplayRoot.visible)
        });
    } catch (error) {
        const cameraError = cameraGuard.getError() || error;
        console.error("Ошибка запуска AR", cameraError);
        stopMindAR();
        unbindSceneInteraction();
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

    const modelJobs = [];

    if (USE_PROCEDURAL_RIG) {
        modelJobs.push(
            {
                load: createProceduralOilRig,
                message: "Не удалось создать процедурную нефтяную вышку."
            },
            {
                load: createProceduralSite,
                message: "Не удалось создать инфраструктуру нефтяной площадки."
            }
        );
    } else {
        modelJobs.push({
            load: loadOilRigModel,
            message: "Не удалось загрузить 3D-модель нефтяной буровой установки. Проверьте файл assets/models/oil-rig-optimized.glb и попробуйте снова."
        });
    }

    if (USE_PROCEDURAL_BEAR) {
        modelJobs.push({
            load: createProceduralBears,
            message: "Не удалось создать процедурных медведей."
        });
    } else {
        modelJobs.push({
            load: loadBearModel,
            message: "Не удалось загрузить 3D-модель медведя. Проверьте файл assets/models/bear.glb и попробуйте снова."
        });
    }

    if (USE_PROCEDURAL_WORKER) {
        modelJobs.push({
            load: createProceduralWorkers,
            message: "Не удалось создать процедурных нефтяников."
        });
    } else {
        modelJobs.push({
            load: loadNeftanikModel,
            message: "Не удалось загрузить 3D-модель нефтяника. Проверьте файл assets/models/neftanik.glb и попробуйте снова."
        });
    }

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
    resetArStabilization();
    unbindSceneInteraction();
    const badge = document.querySelector("#stab-test-badge");
    if (badge) {
        badge.hidden = true;
    }
    isRunning = false;
    showStartScreen();
}

startButton.addEventListener("click", () => {
    startAR();
});

stopButton.addEventListener("click", () => {
    stopAR();
});
