/*
 * VankorAR interaction layer
 * Original author: Данил Каханов
 * Tap/click selection, highlight, and info cards
 * 2026
 */

import * as THREE from "three";
import {
    getInteractiveObjects,
    isBuildingDemoRunning,
    isHeliDemoRunning,
    isPumpjackDemoRunning,
    isRigDemoRunning,
    requestBuildingWorkDemo,
    requestHeliLandingDemo,
    requestPumpjackWorkDemo,
    requestRigWorkDemo
} from "./procedural-scene.js?v=18";

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

let camera = null;
let renderer = null;
let hitLayer = null;
let getTrackingVisible = () => true;
let selectedObject = null;
let highlightPulse = 0;
let lastTapAt = 0;
let bound = false;

const ACTION_IDLE_LABEL = "Показать, как работает";
const ACTION_HELI_LABEL = "Показать посадку";
const ACTION_BUILDING_LABEL = "Показать работу";
const ACTION_BUSY_LABEL = "Демонстрация выполняется…";

const card = {
    root: null,
    title: null,
    description: null,
    action: null,
    badge: null
};

function isUiEventTarget(target) {
    return Boolean(
        target
        && target.closest
        && target.closest("#info-card-panel, #ar-controls, #start-screen, #start-button, #stop-button")
    );
}

function stopUiEvent(event) {
    event.stopPropagation();
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

function syncActionButton() {
    if (!card.action) {
        return;
    }

    const type = selectedObject && selectedObject.userData.interactiveType;
    const busy = type === "rig"
        ? isRigDemoRunning()
        : type === "pumpjack"
            ? isPumpjackDemoRunning()
            : type === "helicopter"
                ? isHeliDemoRunning()
                : type === "building"
                    ? isBuildingDemoRunning()
                    : false;

    const idleLabel = type === "helicopter"
        ? ACTION_HELI_LABEL
        : type === "building"
            ? ACTION_BUILDING_LABEL
            : ACTION_IDLE_LABEL;
    card.action.textContent = busy ? ACTION_BUSY_LABEL : idleLabel;
}

function showCard(object) {
    if (!card.root) {
        return;
    }

    card.title.textContent = object.userData.title || "";
    card.description.textContent = object.userData.description || "";

    const showSiteBadge = object.userData.interactiveType === "rig"
        || object.userData.interactiveType === "pumpjack"
        || object.userData.interactiveType === "building";
    if (card.badge) {
        card.badge.classList.toggle("hidden", !showSiteBadge);
    }

    const showAction = object.userData.interactiveType === "rig"
        || object.userData.interactiveType === "pumpjack"
        || object.userData.interactiveType === "helicopter"
        || object.userData.interactiveType === "building";
    card.action.classList.toggle("hidden", !showAction);
    syncActionButton();
    card.root.classList.remove("hidden");
}

function hideCard() {
    if (card.root) {
        card.root.classList.add("hidden");
    }
}

function selectObject(object) {
    console.log("[interaction] select", object.userData.interactiveType);

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

function getPointerNDC(clientX, clientY) {
    const canvas = renderer && renderer.domElement;
    const rect = canvas
        ? canvas.getBoundingClientRect()
        : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const width = rect.width || 1;
    const height = rect.height || 1;

    pointerNdc.set(
        ((clientX - rect.left) / width) * 2 - 1,
        -((clientY - rect.top) / height) * 2 + 1
    );

    return pointerNdc;
}

function pickInteractive(clientX, clientY) {
    if (!camera || !renderer || !getTrackingVisible()) {
        console.log("[interaction] raycaster", {
            skipped: true,
            trackingVisible: getTrackingVisible()
        });
        return null;
    }

    const ndc = getPointerNDC(clientX, clientY);
    raycaster.setFromCamera(ndc, camera);

    const targets = getInteractiveObjects();
    const hits = raycaster.intersectObjects(targets, true);
    const root = hits.length ? findInteractiveRoot(hits[0].object) : null;

    console.log("[interaction] raycaster", {
        ndc: { x: Number(ndc.x.toFixed(3)), y: Number(ndc.y.toFixed(3)) },
        hitCount: hits.length,
        type: root && root.userData.interactiveType
    });

    return root;
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
    console.log("[interaction] pointerdown", event.pointerType || "unknown");

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
        syncActionButton();
        return;
    }

    if (selectedObject.userData.interactiveType === "pumpjack") {
        requestPumpjackWorkDemo();
        syncActionButton();
        return;
    }

    if (selectedObject.userData.interactiveType === "helicopter") {
        requestHeliLandingDemo();
        syncActionButton();
        return;
    }

    if (selectedObject.userData.interactiveType === "building") {
        requestBuildingWorkDemo();
        syncActionButton();
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
    card.badge = document.querySelector("#info-card-badge");

    const closeButton = document.querySelector("#info-card-close");
    const panel = document.querySelector("#info-card-panel");
    const controls = document.querySelector("#ar-controls");

    if (closeButton) {
        closeButton.addEventListener("pointerdown", stopUiEvent);
        closeButton.addEventListener("touchstart", stopUiEvent, { passive: true });
        closeButton.addEventListener("click", onCloseClick);
    }
    if (card.action) {
        card.action.addEventListener("pointerdown", stopUiEvent);
        card.action.addEventListener("touchstart", stopUiEvent, { passive: true });
        card.action.addEventListener("click", onActionClick);
    }
    if (panel) {
        panel.addEventListener("pointerdown", stopUiEvent);
        panel.addEventListener("touchstart", stopUiEvent, { passive: true });
        panel.addEventListener("click", stopUiEvent);
    }
    if (controls) {
        controls.addEventListener("pointerdown", stopUiEvent);
        controls.addEventListener("touchstart", stopUiEvent, { passive: true });
        controls.addEventListener("click", stopUiEvent);
    }
}

function getHitLayer() {
    if (hitLayer) {
        return hitLayer;
    }

    hitLayer = document.querySelector("#ar-interaction-layer");
    return hitLayer;
}

function setHitLayerActive(active) {
    const layer = getHitLayer();
    if (!layer) {
        return;
    }

    layer.classList.toggle("hidden", !active);
}

export function bindSceneInteraction(options) {
    camera = options.camera;
    renderer = options.renderer;
    getTrackingVisible = options.getTrackingVisible || (() => true);

    if (!card.root) {
        cacheCard();
    }

    const layer = getHitLayer();
    if (bound || !layer) {
        setHitLayerActive(Boolean(layer));
        return;
    }

    layer.addEventListener("pointerdown", onPointerDown);
    layer.addEventListener("touchstart", onTouchStart, { passive: true });
    layer.addEventListener("click", onClick);
    setHitLayerActive(true);
    bound = true;
}

export function unbindSceneInteraction() {
    const layer = getHitLayer();
    if (layer && bound) {
        layer.removeEventListener("pointerdown", onPointerDown);
        layer.removeEventListener("touchstart", onTouchStart);
        layer.removeEventListener("click", onClick);
    }

    setHitLayerActive(false);
    bound = false;
    clearSelection();
}

export function updateSceneInteraction(delta) {
    if (!selectedObject) {
        return;
    }

    syncActionButton();

    const root = getHighlightRoot(selectedObject);
    if (!root.userData._highlightBaseScale) {
        return;
    }

    highlightPulse += delta * 3.2;
    const scale = 1 + Math.sin(highlightPulse) * 0.012;
    root.scale.copy(root.userData._highlightBaseScale).multiplyScalar(scale);
}
