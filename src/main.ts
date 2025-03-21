import * as BABYLON from "@babylonjs/core";

import SquareMaskMaterialPlugin from "./SquareMaskMaterialPlugin";
import { createSquareMaskShaderMaterial } from "./SquareMaskShaderMaterial";

import "./main.css";

const boxesSquareWidthAndHeight = 50;
const squareMaskSquareSize = 5;
const cameraOffset = new BABYLON.Vector3(0, 15, -10);

BABYLON.Effect.ShadersStore["CheckerboardPixelShader"] = `
    precision highp float;
    varying vec2 vUV;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float size;

    void main(void) {
        float x = floor(vUV.x * size);
        float y = floor(vUV.y * size);
        bool isEven = mod(x + y, 2.0) == 0.0;
        gl_FragColor = vec4(isEven ? color1 : color2, 1.0);
    }
`;

BABYLON.RegisterClass(
  "BABYLON.SquareMaskMaterialPlugin",
  SquareMaskMaterialPlugin
);

BABYLON.RegisterMaterialPlugin("SquareMaskMaterialPlugin", (material) => {
  let plugin: SquareMaskMaterialPlugin | null = null;

  if (material instanceof BABYLON.StandardMaterial) {
    plugin = new SquareMaskMaterialPlugin(material);

    plugin._isEnabled = true;

    plugin.setPlayerPosition(new BABYLON.Vector3(0, 0, 0));
    plugin.setSquareSize(squareMaskSquareSize);
  }

  return plugin;
});

type CheckerboardTextureOptions = {
  size?: number;
  color1?: BABYLON.Color3;
  color2?: BABYLON.Color3;
  squares?: number;
};

function createCheckerboardTexture(
  scene: BABYLON.Scene,
  options: CheckerboardTextureOptions = {}
) {
  const _options: Required<CheckerboardTextureOptions> = {
    size: 512,
    color1: new BABYLON.Color3(1, 1, 1),
    color2: new BABYLON.Color3(0, 0, 0),
    squares: 8,
    ...options,
  };

  const checkerboardTexture = new BABYLON.CustomProceduralTexture(
    "checkerboard",
    "Checkerboard",
    _options.size,
    scene
  );

  checkerboardTexture.setColor3("color1", _options.color1); // White
  checkerboardTexture.setColor3("color2", _options.color2); // Black
  checkerboardTexture.setFloat("size", _options.squares); // Number of squares per row/column

  return checkerboardTexture;
}

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

camera.setPosition(cameraOffset);
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true);

const light = new BABYLON.DirectionalLight(
  "light",
  new BABYLON.Vector3(1, -1, 1),
  scene
);

// Standard material
const standardMaterialWithSquareMask = new BABYLON.StandardMaterial(
  "material",
  scene
);

standardMaterialWithSquareMask.diffuseTexture = createCheckerboardTexture(
  scene,
  {
    squares: 256,
  }
);

// Shader material
const squareMaskShaderMaterial = createSquareMaskShaderMaterial(scene);

const ground = BABYLON.MeshBuilder.CreateGround(
  "ground",
  { width: 100, height: 100 },
  scene
);

ground.material = standardMaterialWithSquareMask.clone(
  "groundMaterialWithSquareMask"
);

const capsule = BABYLON.MeshBuilder.CreateCapsule(
  "capsule",
  { height: 2, radius: 0.5, tessellation: 32 },
  scene
);

capsule.position.y = 1;

const capsuleMaterial = standardMaterialWithSquareMask.clone(
  "capsuleMaterialWithSquareMask"
);

capsuleMaterial.diffuseTexture = createCheckerboardTexture(scene, {
  squares: 4,
  color1: new BABYLON.Color3(1, 1, 1),
  color2: new BABYLON.Color3(0, 0, 1),
});

capsule.material = capsuleMaterial;

// create some boxes around the scene
const positions: BABYLON.Vector3[] = [];

const maxTries = 100;

const boxMaterial = standardMaterialWithSquareMask.clone("boxMaterial");

boxMaterial.diffuseTexture = createCheckerboardTexture(scene, {
  squares: 4,
  color1: new BABYLON.Color3(1, 1, 1),
  color2: new BABYLON.Color3(1, 0, 0),
});

for (let i = 0; i < 50; i++) {
  const box = BABYLON.MeshBuilder.CreateBox("box", { size: 1 }, scene);

  // random height
  box.scaling.y = Math.random() * 2 + 1;
  box.position.y = box.scaling.y / 2;

  let position: BABYLON.Vector3;

  let tries = 0;

  do {
    position = new BABYLON.Vector3(
      Math.random() * boxesSquareWidthAndHeight - boxesSquareWidthAndHeight / 2,
      box.position.y,
      Math.random() * boxesSquareWidthAndHeight - boxesSquareWidthAndHeight / 2
    );

    if (tries++ === maxTries) {
      break;
    }
  } while (positions.some((p) => BABYLON.Vector3.Distance(p, position) < 2));

  box.position = position;

  positions.push(position);

  box.material = boxMaterial;
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

scene.registerBeforeRender(() => {
  const playerPosition = capsule.position;

  camera.target = playerPosition;
  camera.position = playerPosition.add(cameraOffset);

  squareMaskShaderMaterial.setVector3("playerPosition", playerPosition);

  (
    (ground.material as BABYLON.StandardMaterial)?.pluginManager?.getPlugin(
      "SquareMaskMaterialPlugin"
    ) as SquareMaskMaterialPlugin
  )?.setPlayerPosition(playerPosition);

  (
    capsuleMaterial.pluginManager?.getPlugin(
      "SquareMaskMaterialPlugin"
    ) as SquareMaskMaterialPlugin
  ).setPlayerPosition(playerPosition);

  (
    boxMaterial.pluginManager?.getPlugin(
      "SquareMaskMaterialPlugin"
    ) as SquareMaskMaterialPlugin
  ).setPlayerPosition(playerPosition);
});

BABYLON.Effect.ShadersStore["customFragmentShader"] = `
    #ifdef GL_ES
        precision highp float;
    #endif

    // Samplers
    varying vec2 vUV;
    uniform sampler2D textureSampler;

    // Parameters
    uniform float levels;
    uniform vec2 screenSize;
    uniform float threshold;

    void main(void)
    {
        vec4 baseColor = texture2D(textureSampler, vUV);

        // posterization
        baseColor = vec4(floor(baseColor.rgb * levels) / levels, 1.0);

        // threshold
        float gray = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));

        if (gray > threshold) {
            gl_FragColor = baseColor;
        } else {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    }
    `;

var postProcess = new BABYLON.PostProcess(
  "ThresholdPostProcess",
  "custom",
  ["levels", "screenSize", "threshold"],
  null,
  0.25,
  camera
);

postProcess.onApply = function (effect) {
  effect.setFloat("levels", 8);
  effect.setFloat2("screenSize", postProcess.width, postProcess.height);
  effect.setFloat("threshold", 0);
};

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
