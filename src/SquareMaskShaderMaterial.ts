import * as BABYLON from "@babylonjs/core";

export function createSquareMaskShaderMaterial(scene: BABYLON.Scene) {
  BABYLON.Effect.ShadersStore["customVertexShader"] = `
precision highp float;

// Attributes
attribute vec3 position;

// Uniforms
uniform mat4 worldViewProjection;

// Varying
varying vec3 vPosition;

void main(void) {
    vPosition = position; // Pass vertex position to fragment shader
    gl_Position = worldViewProjection * vec4(position, 1.0); // Transform vertex position
}
`;

  BABYLON.Effect.ShadersStore["customFragmentShader"] = `
precision highp float;

// Uniforms
uniform vec3 playerPosition; // Player's position in world space
uniform float squareSize;    // Half size of the square mask

// Varying
varying vec3 vPosition;

void main(void) {
    // Calculate distance in XZ plane
    vec2 distanceXZ = vPosition.xz - playerPosition.xz;

    // Check if the fragment is within the square mask
    if (abs(distanceXZ.x) <= squareSize && abs(distanceXZ.y) <= squareSize) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // Inside mask: white color
    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Outside mask: black color
    }
}
`;

  const shaderMaterial = new BABYLON.ShaderMaterial(
    "squareMaskShader",
    scene,
    {
      vertex: "custom", // Reference to customVertexShader in Shader Store
      fragment: "custom", // Reference to customFragmentShader in Shader Store
    },
    {
      attributes: ["position"],
      uniforms: ["worldViewProjection", "playerPosition", "squareSize"],
    }
  );

  // Set uniform values
  shaderMaterial.setVector3("playerPosition", new BABYLON.Vector3(0, 0, 0)); // Player's initial position
  shaderMaterial.setFloat("squareSize", 10); // Half size of the square area

  return shaderMaterial;
}
