import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";

const IMAGE_TARGET_SRC = "./assets/card.mind";
const OIL_RIG_SRC = "./assets/models/oil-rig-optimized.glb";
const OIL_RIG_FOOTPRINT = 0.6;

const startScreen = document.querySelector("#start-screen");
const startButton = document.querySelector("#start-button");
const stopButton = document.querySelector("#stop-button");
const arControls = document.querySelector("#ar-controls");
const errorMessage = document.querySelector("#error-message");
const arErrorMessage = document.querySelector("#ar-error-message");

let mindarThree = null;
let arAnchor = null;
let oilRigModel = null;
let oilRigLoadPromise = null;
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

function loadOilRigModel() {
    if (oilRigModel) {
        return Promise.resolve(oilRigModel);
    }

    if (!oilRigLoadPromise) {
        const loader = new GLTFLoader();

        oilRigLoadPromise = loader.loadAsync(OIL_RIG_SRC).then((gltf) => {
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

        renderer.setAnimationLoop(() => {
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

    try {
        const model = await loadOilRigModel();

        if (isRunning && arAnchor && model.parent !== arAnchor.group) {
            arAnchor.group.add(model);
        }
    } catch (modelError) {
        console.error("Ошибка загрузки GLB", modelError);
        showError("Не удалось загрузить 3D-модель нефтяной буровой установки. Проверьте файл assets/models/oil-rig-optimized.glb и попробуйте снова.");
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
