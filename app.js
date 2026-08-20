import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";
import {
    createProceduralBears,
    createProceduralOilRig,
    createProceduralSite,
    createProceduralWorkers,
    updateProceduralScene
} from "./procedural-scene.js?v=7";
import {
    bindSceneInteraction,
    unbindSceneInteraction,
    updateSceneInteraction
} from "./interaction.js?v=9";

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

const AR_STABILIZATION_DEBUG = true;
const AR_STABILIZATION_TEST_MODE = false;
const DEBUG_DISABLE_MINDAR_FILTER = false;
const DEBUG_DISABLE_ROOT_SMOOTHING = false;
const AR_SMOOTHING_SPEED_SLOW = 16;
const AR_SMOOTHING_SPEED_FAST = 30;
const AR_POSITION_DEADBAND = 0.0005;
const AR_ROTATION_DEADBAND = 0.0012;
const AR_POSITION_FAST_THRESHOLD = 0.01;
const AR_ROTATION_FAST_THRESHOLD = 0.035;
const AR_TARGET_HOLD_MS = 200;

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

const _arRawPos = new THREE.Vector3();
const _arRawQuat = new THREE.Quaternion();
const _arRawScale = new THREE.Vector3();
const _arDisplayScale = new THREE.Vector3(1, 1, 1);
const _arLastRawPos = new THREE.Vector3();
const _arLastRawQuat = new THREE.Quaternion();
let arStabHasLastRaw = false;

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
        filterMinCF: DEBUG_DISABLE_MINDAR_FILTER ? 1 : 0.00007,
        filterBeta: DEBUG_DISABLE_MINDAR_FILTER ? 0 : 2000
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
        badge.textContent = "STABILIZATION TEST";
        document.body.appendChild(badge);
    }

    badge.hidden = false;
}

function resetArStabilization() {
    arStabHasPose = false;
    arStabLastSeenMs = 0;
    arStabDebugFrame = 0;
    arStabHasLastRaw = false;
    _arDisplayScale.set(1, 1, 1);

    if (arDisplayRoot) {
        arDisplayRoot.visible = false;
        arDisplayRoot.position.set(0, 0, 0);
        arDisplayRoot.quaternion.identity();
        arDisplayRoot.scale.set(1, 1, 1);
    }
}

function logArStabilization(posError, rotError, alpha, rawDelta, visible) {
    console.log("[AR stab]", {
        rawPosition: {
            x: Number(_arRawPos.x.toFixed(5)),
            y: Number(_arRawPos.y.toFixed(5)),
            z: Number(_arRawPos.z.toFixed(5))
        },
        smoothedPosition: {
            x: Number(arDisplayRoot.position.x.toFixed(5)),
            y: Number(arDisplayRoot.position.y.toFixed(5)),
            z: Number(arDisplayRoot.position.z.toFixed(5))
        },
        positionError: Number(posError.toFixed(6)),
        rawDelta: Number(rawDelta.toFixed(6)),
        rawQuaternion: {
            x: Number(_arRawQuat.x.toFixed(5)),
            y: Number(_arRawQuat.y.toFixed(5)),
            z: Number(_arRawQuat.z.toFixed(5)),
            w: Number(_arRawQuat.w.toFixed(5))
        },
        smoothedQuaternion: {
            x: Number(arDisplayRoot.quaternion.x.toFixed(5)),
            y: Number(arDisplayRoot.quaternion.y.toFixed(5)),
            z: Number(arDisplayRoot.quaternion.z.toFixed(5)),
            w: Number(arDisplayRoot.quaternion.w.toFixed(5))
        },
        rotationError: Number(rotError.toFixed(6)),
        alpha: Number(alpha.toFixed(4)),
        arAnchorVisible: visible,
        mindarFilterDisabled: DEBUG_DISABLE_MINDAR_FILTER,
        rootSmoothingDisabled: DEBUG_DISABLE_ROOT_SMOOTHING
    });
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
        arAnchor.group.matrix.decompose(_arRawPos, _arRawQuat, _arRawScale);

        const rawDelta = arStabHasLastRaw ? _arRawPos.distanceTo(_arLastRawPos) : 0;

        if (!arStabHasPose || DEBUG_DISABLE_ROOT_SMOOTHING) {
            arDisplayRoot.position.copy(_arRawPos);
            arDisplayRoot.quaternion.copy(_arRawQuat);
            arDisplayRoot.scale.copy(_arRawScale);
            _arDisplayScale.copy(_arRawScale);
            arStabHasPose = true;
            arDisplayRoot.visible = true;
            _arLastRawPos.copy(_arRawPos);
            _arLastRawQuat.copy(_arRawQuat);
            arStabHasLastRaw = true;

            if (debugEnabled) {
                arStabDebugFrame += 1;
                if (arStabDebugFrame % 15 === 0) {
                    logArStabilization(0, 0, 1, rawDelta, targetVisible);
                }
            }
            return;
        }

        if (_arRawScale.distanceToSquared(_arDisplayScale) > 1e-8) {
            _arDisplayScale.copy(_arRawScale);
            arDisplayRoot.scale.copy(_arRawScale);
        }

        const posError = arDisplayRoot.position.distanceTo(_arRawPos);
        const rotError = arDisplayRoot.quaternion.angleTo(_arRawQuat);
        let alpha = 0;

        if (posError > AR_POSITION_DEADBAND || rotError > AR_ROTATION_DEADBAND) {
            const speed = posError > AR_POSITION_FAST_THRESHOLD || rotError > AR_ROTATION_FAST_THRESHOLD
                ? AR_SMOOTHING_SPEED_FAST
                : AR_SMOOTHING_SPEED_SLOW;
            alpha = 1 - Math.exp(-speed * delta);
            arDisplayRoot.position.lerp(_arRawPos, alpha);
            arDisplayRoot.quaternion.slerp(_arRawQuat, alpha);
        }

        arDisplayRoot.visible = true;

        if (debugEnabled) {
            arStabDebugFrame += 1;
            if (arStabDebugFrame % 15 === 0) {
                logArStabilization(posError, rotError, alpha, rawDelta, targetVisible);
            }
        }

        _arLastRawPos.copy(_arRawPos);
        _arLastRawQuat.copy(_arRawQuat);
        arStabHasLastRaw = true;
        return;
    }

    if (arStabHasPose && now - arStabLastSeenMs < AR_TARGET_HOLD_MS) {
        arDisplayRoot.visible = true;
        return;
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
