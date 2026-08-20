import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";
import {
    createProceduralBears,
    createProceduralOilRig,
    createProceduralSite,
    createProceduralWorkers,
    updateProceduralScene
} from "./procedural-scene.js";

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

            updateProceduralScene(delta, elapsedTime, {
                bears: USE_PROCEDURAL_BEAR,
                workers: USE_PROCEDURAL_WORKER,
                rig: USE_PROCEDURAL_RIG
            });

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
    isRunning = false;
    showStartScreen();
}

startButton.addEventListener("click", () => {
    startAR();
});

stopButton.addEventListener("click", () => {
    stopAR();
});
