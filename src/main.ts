import * as BABYLON from "@babylonjs/core";
import "@babylonjs/inspector";

import { createCheckerboardTexture } from "./material/createCheckerboardTexture";

import FrustumMaskMaterialPlugin from "./FrustumMaskMaterialPlugin";

import "./main.css";

// BABYLON.RegisterMaterialPlugin("FrustumMask", (material) => {
//   const plugin = new FrustumMaskMaterialPlugin(material);

//   return plugin;
// });

const canvas = document.createElement("canvas");

document.body.appendChild(canvas);

const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

const camera = new BABYLON.ArcRotateCamera(
  "camera",
  0,
  0,
  5,
  BABYLON.Vector3.Zero(),
  scene
);

camera.setPosition(new BABYLON.Vector3(20, 20, 20));
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true);

const secondaryCamera = new BABYLON.FreeCamera(
  "secondaryCamera",
  new BABYLON.Vector3(-20, 5, 0),
  scene
);

// disable controls for the secondary camera
secondaryCamera.inputs.clear();

secondaryCamera.setTarget(new BABYLON.Vector3(0, 0, 0));

// secondaryCamera.fov = 0.5;
secondaryCamera.minZ = 1;
secondaryCamera.maxZ = 100;

const light = new BABYLON.DirectionalLight(
  "light",
  new BABYLON.Vector3(1, -1, 1),
  scene
);

const hemisphericLight = new BABYLON.HemisphericLight(
  "hemisphericLight",
  new BABYLON.Vector3(0, 1, 0),
  scene
);
hemisphericLight.intensity = 0.5;

// Standard material
const standardMaterial = new BABYLON.StandardMaterial("material", scene);

standardMaterial.diffuseTexture = createCheckerboardTexture(scene, {
  canvasWidth: 2048,
  squares: 16,
  color1: "#0000ff",
  color2: "#ffffff",
});

const standardMaterialWithoutPlugin = standardMaterial.clone(
  "materialWithoutPlugin"
);

standardMaterialWithoutPlugin.diffuseTexture = createCheckerboardTexture(
  scene,
  {
    canvasWidth: 2048,
    squares: 16,
    color1: "#ff0000",
    color2: "#ffffff",
  }
);

const plugin = new FrustumMaskMaterialPlugin(standardMaterial);

plugin.isEnabled = true;

const ground = BABYLON.MeshBuilder.CreateGround(
  "ground",
  { width: 100, height: 100 },
  scene
);

ground.material = standardMaterial;

const capsule = BABYLON.MeshBuilder.CreateCapsule(
  "capsule",
  { height: 2, radius: 0.5, tessellation: 32 },
  scene
);

capsule.position = new BABYLON.Vector3(0, 1, 0);

const capsuleMaterial = standardMaterial;

capsule.material = capsuleMaterial;

const positions: BABYLON.Vector3[] = [];

const boxes: BABYLON.Mesh[] = [];

const numBoxes = 20;
const maxTries = 100;
const minBoxWidth = 5;
const maxBoxWidth = 10;
const minBoxHeight = 1;
const maxBoxHeight = 50;
const minBoxDepth = 5;
const maxBoxDepth = 10;

for (let i = 0; i < numBoxes; i++) {
  const width = Math.random() * (maxBoxWidth - minBoxWidth) + minBoxWidth;
  const height = Math.random() * (maxBoxHeight - minBoxHeight) + minBoxHeight;
  const depth = Math.random() * (maxBoxDepth - minBoxDepth) + minBoxDepth;

  const box = BABYLON.MeshBuilder.CreateBox(
    "box",
    { width, height, depth },
    scene
  );

  let position: BABYLON.Vector3;

  let tries = 0;

  do {
    position = new BABYLON.Vector3(
      Math.random() * 50 - 50 / 2,
      box.position.y,
      Math.random() * 50 - 50 / 2
    );

    if (tries++ === maxTries) {
      break;
    }
  } while (positions.some((p) => BABYLON.Vector3.Distance(p, position) < 2));

  box.position = position;

  positions.push(position);

  box.material = standardMaterial;

  box.convertToFlatShadedMesh();

  boxes.push(box);
}

type InputMap = {
  [key: string]: boolean;
};

const inputMap: InputMap = {};

scene.actionManager = new BABYLON.ActionManager(scene);

scene.actionManager.registerAction(
  new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnKeyDownTrigger,
    (evt) => {
      inputMap[evt.sourceEvent.key] = true;
    }
  )
);

scene.actionManager.registerAction(
  new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, (evt) => {
    inputMap[evt.sourceEvent.key] = false;
  })
);

const speed = 0.1; // Movement speed
const forwardVector = new BABYLON.Vector3(0, 0, 1); // Local forward direction
const rightVector = new BABYLON.Vector3(1, 0, 0); // Local right direction

scene.onBeforeRenderObservable.add(() => {
  let moveDirection = BABYLON.Vector3.Zero();

  if (inputMap["w"] || inputMap["ArrowUp"]) {
    moveDirection.addInPlace(forwardVector);
  }
  if (inputMap["s"] || inputMap["ArrowDown"]) {
    moveDirection.subtractInPlace(forwardVector);
  }
  if (inputMap["a"] || inputMap["ArrowLeft"]) {
    moveDirection.subtractInPlace(rightVector);
  }
  if (inputMap["d"] || inputMap["ArrowRight"]) {
    moveDirection.addInPlace(rightVector);
  }

  // Normalize direction to prevent faster diagonal movement
  moveDirection.normalize();

  // Move the capsule with collisions
  capsule.moveWithCollisions(moveDirection.scale(speed));
});

const renderTarget = new BABYLON.RenderTargetTexture(
  "SecondaryCameraRTT",
  {
    width: engine.getRenderWidth(),
    height: engine.getRenderHeight(),
  },
  scene
);

renderTarget.activeCamera = secondaryCamera;

renderTarget.renderList!.push(...scene.meshes);

renderTarget.createDepthStencilTexture();

scene.customRenderTargets.push(renderTarget);

// let depthTexture;
// if (renderTarget.depthStencilTexture) {
//   depthTexture = new BABYLON.Texture(null, scene);
//   depthTexture._texture = renderTarget.depthStencilTexture; // Assign the internal texture
// }

plugin.setColorTexture(renderTarget);

// if (depthTexture) {
//   plugin.setDepthTexture(depthTexture);
// }

const depthRenderer = scene.enableDepthRenderer(secondaryCamera, true, true);
plugin.setDepthTexture(depthRenderer.getDepthMap());

scene.meshes.forEach((mesh) => {
  mesh.setMaterialForRenderPass(
    renderTarget.renderPassId,
    standardMaterialWithoutPlugin
  );
  mesh.setMaterialForRenderPass(camera.renderPassId, standardMaterial);
});

const cameraSpeed = 0.1;

scene.registerBeforeRender(() => {
  secondaryCamera.position.x =
    Math.cos((performance.now() / 1000) * cameraSpeed) * 10;
  secondaryCamera.position.z =
    Math.sin((performance.now() / 1000) * cameraSpeed) * 10;

  secondaryCamera.setTarget(
    new BABYLON.Vector3(
      Math.cos((performance.now() / 1000) * cameraSpeed + 1) * 10,
      0,
      Math.sin((performance.now() / 1000) * cameraSpeed + 1) * 10
    )
  );

  plugin.setSecondaryViewProjection(
    secondaryCamera
      .getViewMatrix()
      .multiply(secondaryCamera.getProjectionMatrix())
  );
});

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});

window.addEventListener("keydown", (ev) => {
  if (ev.key === "I" || ev.key === "i") {
    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show();
    }
  }
});
