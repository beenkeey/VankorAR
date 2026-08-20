import * as THREE from "three";
import {
    getInteractiveObjects,
    requestPumpjackWorkDemo,
    requestRigWorkDemo
} from "./procedural-scene.js?v=7";

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

let camera = null;
let renderer = null;
let getTrackingVisible = () => true;
let selectedObject = null;
let highlightPulse = 0;
let lastTapAt = 0;
let bound = false;

const card = {
    root: null,
    title: null,
    description: null,
    action: null
};

function isUiEventTarget(target) {
    return Boolean(
        target
        && target.closest
        && target.closest("#info-card-panel, #ar-controls, #start-screen, #start-button, #stop-button")
    );
}

function findInteractiveRoot(object) {
    let current = object;

    while (current) {
        if (current.userData && current.userData.interactive) {
            return current;
        }
        current = current.parent;
    }

    return null;
}

function getHighlightRoot(object) {
    return object.userData.highlightTarget || object;
}

function restoreHighlight(root) {
    if (!root || !root.userData._highlighted) {
        return;
    }

    root.traverse((child) => {
        if (!child.isMesh || !child.userData._highlightOriginalMat) {
            return;
        }

        const cloned = child.material;
        child.material = child.userData._highlightOriginalMat;
        child.userData._highlightOriginalMat = null;
        if (cloned && cloned !== child.material) {
            cloned.dispose();
        }
    });

    if (root.userData._highlightBaseScale) {
        root.scale.copy(root.userData._highlightBaseScale);
        root.userData._highlightBaseScale = null;
    }

    root.userData._highlighted = false;
}

function applyHighlight(root) {
    if (!root || root.userData._highlighted) {
        return;
    }

    root.userData._highlightBaseScale = root.scale.clone();
    root.traverse((child) => {
        if (!child.isMesh || !child.material) {
            return;
        }

        const original = child.material;
        if ((original.emissiveIntensity || 0) > 1) {
            return;
        }

        const cloned = original.clone();
        if (cloned.emissive) {
            cloned.emissive.setHex(0x2f3d28);
            cloned.emissiveIntensity = Math.min((cloned.emissiveIntensity || 0) + 0.35, 0.7);
        }
        child.userData._highlightOriginalMat = original;
        child.material = cloned;
    });

    root.userData._highlighted = true;
}

function clearSelection() {
    if (selectedObject) {
        restoreHighlight(getHighlightRoot(selectedObject));
    }

    selectedObject = null;
    highlightPulse = 0;
    hideCard();
}

function showCard(object) {
    if (!card.root) {
        return;
    }

    card.title.textContent = object.userData.title || "";
    card.description.textContent = object.userData.description || "";

    const showAction = object.userData.interactiveType === "rig"
        || object.userData.interactiveType === "pumpjack";
    card.action.classList.toggle("hidden", !showAction);
    card.root.classList.remove("hidden");
}

function hideCard() {
    if (card.root) {
        card.root.classList.add("hidden");
    }
}

function selectObject(object) {
    if (selectedObject) {
        restoreHighlight(getHighlightRoot(selectedObject));
    }

    selectedObject = object;
    highlightPulse = 0;
    applyHighlight(getHighlightRoot(object));
    showCard(object);

    if (object.userData.interactiveType === "bear") {
        object.userData.interactHold = 2.4 + Math.random() * 0.6;
    }

    if (object.userData.interactiveType === "worker") {
        object.userData.interactHold = 1.2 + Math.random() * 0.8;
    }
}

function eventToNdc(clientX, clientY) {
    const element = renderer.domElement;
    const rect = element.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;

    pointerNdc.set(
        ((clientX - rect.left) / width) * 2 - 1,
        -((clientY - rect.top) / height) * 2 + 1
    );
}

function pickInteractive(clientX, clientY) {
    if (!camera || !renderer || !getTrackingVisible()) {
        return null;
    }

    eventToNdc(clientX, clientY);
    raycaster.setFromCamera(pointerNdc, camera);

    const hits = raycaster.intersectObjects(getInteractiveObjects(), true);
    if (!hits.length) {
        return null;
    }

    return findInteractiveRoot(hits[0].object);
}

function handleTap(clientX, clientY) {
    const picked = pickInteractive(clientX, clientY);

    if (!picked) {
        if (selectedObject) {
            clearSelection();
        }
        return;
    }

    if (
        selectedObject
        && getHighlightRoot(selectedObject) === getHighlightRoot(picked)
        && selectedObject.userData.interactiveType === picked.userData.interactiveType
    ) {
        clearSelection();
        return;
    }

    selectObject(picked);
}

function rememberTap() {
    lastTapAt = performance.now();
}

function shouldIgnoreDuplicate() {
    return performance.now() - lastTapAt < 450;
}

function onPointerDown(event) {
    if (event.isPrimary === false) {
        return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
        return;
    }

    if (isUiEventTarget(event.target)) {
        return;
    }

    rememberTap();
    handleTap(event.clientX, event.clientY);
}

function onTouchStart(event) {
    if (isUiEventTarget(event.target) || event.touches.length !== 1) {
        return;
    }

    if (shouldIgnoreDuplicate()) {
        return;
    }

    const touch = event.touches[0];
    rememberTap();
    handleTap(touch.clientX, touch.clientY);
}

function onClick(event) {
    if (isUiEventTarget(event.target) || shouldIgnoreDuplicate()) {
        return;
    }

    rememberTap();
    handleTap(event.clientX, event.clientY);
}

function onActionClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!selectedObject) {
        return;
    }

    if (selectedObject.userData.interactiveType === "rig") {
        requestRigWorkDemo();
        return;
    }

    if (selectedObject.userData.interactiveType === "pumpjack") {
        requestPumpjackWorkDemo();
    }
}

function onCloseClick(event) {
    event.preventDefault();
    event.stopPropagation();
    clearSelection();
}

function cacheCard() {
    card.root = document.querySelector("#info-card");
    card.title = document.querySelector("#info-card-title");
    card.description = document.querySelector("#info-card-description");
    card.action = document.querySelector("#info-card-action");

    const closeButton = document.querySelector("#info-card-close");
    if (closeButton) {
        closeButton.addEventListener("click", onCloseClick);
    }
    if (card.action) {
        card.action.addEventListener("click", onActionClick);
    }
}

export function bindSceneInteraction(options) {
    camera = options.camera;
    renderer = options.renderer;
    getTrackingVisible = options.getTrackingVisible || (() => true);

    if (!card.root) {
        cacheCard();
    }

    if (bound || !renderer) {
        return;
    }

    const element = renderer.domElement;
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("click", onClick);
    bound = true;
}

export function unbindSceneInteraction() {
    if (renderer && bound) {
        const element = renderer.domElement;
        element.removeEventListener("pointerdown", onPointerDown);
        element.removeEventListener("touchstart", onTouchStart);
        element.removeEventListener("click", onClick);
    }

    bound = false;
    clearSelection();
}

export function updateSceneInteraction(delta) {
    if (!selectedObject) {
        return;
    }

    const root = getHighlightRoot(selectedObject);
    if (!root.userData._highlightBaseScale) {
        return;
    }

    highlightPulse += delta * 3.2;
    const scale = 1 + Math.sin(highlightPulse) * 0.012;
    root.scale.copy(root.userData._highlightBaseScale).multiplyScalar(scale);
}
