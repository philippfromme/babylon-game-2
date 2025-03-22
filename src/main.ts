import * as BABYLON from "@babylonjs/core";
import "@babylonjs/inspector";

import { createCheckerboardTexture } from "./material/createCheckerboardTexture";

import "./main.css";

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

// Standard material
const standartMaterial = new BABYLON.StandardMaterial("material", scene);

standartMaterial.diffuseTexture = createCheckerboardTexture(scene, {
  canvasWidth: 2048,
  squares: 256,
});

const ground = BABYLON.MeshBuilder.CreateGround(
  "ground",
  { width: 100, height: 100 },
  scene
);

ground.material = standartMaterial.clone("groundMaterial");

// const ground2 = BABYLON.MeshBuilder.CreateGround(
//   "ground2",
//   { width: 50, height: 50 },
//   scene
// );

// ground2.position.y = 1;
// ground2.position.x = 25;
// ground2.position.z = 25;
// ground2.material = standartMaterial.clone("ground2Material");

const capsule = BABYLON.MeshBuilder.CreateCapsule(
  "capsule",
  { height: 2, radius: 0.5, tessellation: 32 },
  scene
);

capsule.position = new BABYLON.Vector3(0, 1, 0);

const capsuleMaterial = standartMaterial.clone("capsuleMaterial");

capsuleMaterial.diffuseTexture = createCheckerboardTexture(scene, {
  canvasWidth: 256,
  squares: 16,
});

capsule.material = capsuleMaterial;

const positions: BABYLON.Vector3[] = [];

const boxes: BABYLON.Mesh[] = [];

const maxTries = 100;

const boxMaterial = standartMaterial.clone("boxMaterial");

boxMaterial.diffuseTexture = createCheckerboardTexture(scene, {
  canvasWidth: 256,
  squares: 10,
});

for (let i = 0; i < 50; i++) {
  const width = Math.random() * 2 + 0.5;
  const height = Math.random() * 10 + 1;
  const depth = Math.random() * 2 + 0.5;

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

  box.material = boxMaterial;

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

const depthRenderer = scene.enableDepthRenderer(secondaryCamera, true, true);
const depthMap = depthRenderer.getDepthMap();

const visibilityShaderMaterial = new BABYLON.ShaderMaterial(
  "visibilityShader",
  scene,
  {
    vertex: "custom",
    fragment: "custom",
  },
  {
    attributes: ["position", "uv"],
    uniforms: [
      "depthTexture",
      "secondaryViewProjection",
      "world",
      "worldViewProjection",
    ],
  }
);

visibilityShaderMaterial.setTexture("depthTexture", depthMap);
visibilityShaderMaterial.setMatrix(
  "secondaryViewProjection",
  secondaryCamera
    .getViewMatrix()
    .multiply(secondaryCamera.getProjectionMatrix())
);

BABYLON.Effect.ShadersStore.customVertexShader = `
precision highp float;

attribute vec3 position;

uniform mat4 world;
uniform mat4 worldViewProjection;
uniform mat4 secondaryViewProjection;

varying vec4 secondaryScreenPos;

void main() {
  secondaryScreenPos = secondaryViewProjection * world * vec4(position, 1.0);
  
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

BABYLON.Effect.ShadersStore.customFragmentShader = `
precision highp float;

uniform sampler2D depthTexture;

varying vec4 secondaryScreenPos;

void main() {
  // Convert light-space coordinates to texture coordinates
  vec3 projCoords = secondaryScreenPos.xyz / secondaryScreenPos.w;

  if(abs(projCoords.x) > 1.0 || abs(projCoords.y) > 1.0 || projCoords.z < 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  projCoords = projCoords * 0.5 + 0.5;  // Transform from [-1, 1] to [0, 1]

  // Read depth value from texture
  float closestDepth = texture2D(depthTexture, projCoords.xy).r;

  // Convert depth to correct space
  float currentDepth = (secondaryScreenPos.z / secondaryScreenPos.w) * 0.5 + 0.5;

  // Apply bias
  float bias = 0.001; // Increase if needed
  float visibility = (currentDepth - bias > closestDepth) ? 0.0 : 1.0;

  gl_FragColor = vec4(visibility * vec3(1.0, 0.0, 1.0), 1.0);
}
`;

scene.meshes.forEach((mesh) => {
  mesh.setMaterialForRenderPass(secondaryCamera.renderPassId, standartMaterial);

  const meshMaterial = visibilityShaderMaterial.clone(
    "visibilityShaderMaterial_" + mesh.name
  );

  // should do the same as setMeterialForRenderpass
  // depthRenderer.getDepthMap().setMaterialForRendering(mesh, standartMaterial);

  meshMaterial.setTexture("depthTexture", depthRenderer.getDepthMap());

  mesh.setMaterialForRenderPass(camera.renderPassId, meshMaterial);
});

scene.onBeforeRenderObservable.add(() => {});

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

  scene.meshes.forEach((mesh) => {
    const meshMaterial = mesh.getMaterialForRenderPass(
      camera.renderPassId
    ) as BABYLON.ShaderMaterial;

    if (meshMaterial.name.startsWith("visibilityShaderMaterial_")) {
      // meshMaterial.setTexture("depthTexture", depthRenderer.getDepthMap());
      meshMaterial.setMatrix(
        "secondaryViewProjection",
        secondaryCamera
          .getViewMatrix()
          .multiply(secondaryCamera.getProjectionMatrix())
      );
    }
  });
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
