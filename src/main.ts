import * as BABYLON from "@babylonjs/core";

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

camera.setPosition(new BABYLON.Vector3(5, 5, 5));
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true);

const light = new BABYLON.HemisphericLight(
  "light",
  new BABYLON.Vector3(0, 1, 0),
  scene
);

light.intensity = 0.7;
light.diffuse = new BABYLON.Color3(1, 1, 1);

const box = BABYLON.MeshBuilder.CreateBox("box", {}, scene);

const material = new BABYLON.StandardMaterial("material", scene);
material.diffuseColor = new BABYLON.Color3(0, 0, 1);
material.specularColor = new BABYLON.Color3(1, 1, 1);
material.specularPower = 32;

box.material = material;

const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {}, scene);

sphere.material = material.clone("material");

scene.registerBeforeRender(() => {
  box.rotation.y += 0.01;
  box.rotation.x += 0.01;

  sphere.position.x = Math.sin(box.rotation.y) * 2;
  sphere.position.z = Math.cos(box.rotation.y) * 2;
});

const skybox = BABYLON.MeshBuilder.CreateSphere(
  "sphere",
  { diameter: 20 },
  scene
);

skybox.material = material.clone("material");
skybox.material.backFaceCulling = false;

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
        vec2 texelSize = vec2(1.0 / screenSize.x, 1.0 / screenSize.y);
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
  effect.setFloat("levels", 4);
  effect.setFloat2("screenSize", postProcess.width, postProcess.height);
  effect.setFloat("threshold", 0.025);
};

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
