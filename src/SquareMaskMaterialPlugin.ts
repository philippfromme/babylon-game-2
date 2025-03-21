import * as BABYLON from "@babylonjs/core";

export default class SquareMaskMaterialPlugin extends BABYLON.MaterialPluginBase {
  _isEnabled: boolean = true;

  _playerPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero(); // Player's position in world space
  _squareSize: number = 10; // Half size of the square mask

  constructor(material: BABYLON.Material) {
    super(material, "SquareMaskMaterialPlugin", 100, {
      SquareMask: true,
    });

    this._enable(true);
  }

  get isEnabled() {
    return this._isEnabled;
  }

  set isEnabled(enabled) {
    if (this._isEnabled === enabled) {
      return;
    }
    this._isEnabled = enabled;
    this.markAllDefinesAsDirty();
    this._enable(this._isEnabled);
  }

  setPlayerPosition(position: BABYLON.Vector3) {
    this._playerPosition = position;
  }

  setSquareSize(squareSize: number) {
    this._squareSize = squareSize;
  }

  // Also, you should always associate a define with your plugin because the list of defines (and their values)
  // is what triggers a recompilation of the shader: a shader is recompiled only if a value of a define changes.
  prepareDefines(
    defines: BABYLON.MaterialDefines,
    scene: BABYLON.Scene,
    mesh: BABYLON.AbstractMesh
  ) {
    defines["SquareMask"] = this._isEnabled;
  }

  // here we can define any uniforms to be passed to the shader code.
  getUniforms(shaderLanguage?: BABYLON.ShaderLanguage): {
    ubo?: Array<{
      name: string;
      size?: number;
      type?: string;
      arraySize?: number;
    }>;
    vertex?: string;
    fragment?: string;
  } {
    return {
      ubo: [
        { name: "playerPosition", size: 3, type: "vec3" },
        { name: "squareSize", size: 1, type: "float" },
      ],
      fragment: `#ifdef SquareMask
                    uniform vec3 playerPosition;
                    uniform float squareSize;
                #endif`,
    };
  }

  // whenever a material is bound to a mesh, we need to update the uniforms.
  // so bind our uniform variable to the actual color we have in the instance.
  bindForSubMesh(
    uniformBuffer: BABYLON.UniformBuffer,
    scene: BABYLON.Scene,
    engine: BABYLON.AbstractEngine,
    subMesh: BABYLON.SubMesh
  ) {
    if (this._isEnabled) {
      uniformBuffer.updateVector3("playerPosition", this._playerPosition);
      uniformBuffer.updateFloat("squareSize", this._squareSize);
    }
  }

  getClassName() {
    return "SquareMaskMaterialPlugin";
  }

  isCompatible(shaderLanguage: BABYLON.ShaderLanguage): boolean {
    switch (shaderLanguage) {
      case BABYLON.ShaderLanguage.GLSL:
      case BABYLON.ShaderLanguage.WGSL:
        return true;
      default:
        return false;
    }
  }

  getCustomCode(
    shaderType: string,
    shaderLanguage?: BABYLON.ShaderLanguage
  ): BABYLON.Nullable<{
    [pointName: string]: string;
  }> {
    if (shaderType === "vertex") {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `
          #ifdef SquareMask
            varying vec3 vPosition;
          #endif
        `,
        CUSTOM_VERTEX_MAIN_BEGIN: `
          #ifdef SquareMask
            vec4 worldPosition = world * vec4(position, 1.0);
  
            vPosition = worldPosition.xyz;
          #endif
        `,
      };
    } else if (shaderType === "fragment") {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
          #ifdef SquareMask
            varying vec3 vPosition;
          #endif
        `,
        CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
          #ifdef SquareMask
              // Calculate distance in XZ plane
              vec2 distanceXZ = vPosition.xz - playerPosition.xz;

              // Check if the fragment is within the square mask
              if (abs(distanceXZ.x) <= squareSize && abs(distanceXZ.y) <= squareSize) {
                  
                  // Inside mask: don't change the color
              } else {
                  color = vec4(0.0, 0.0, 0.0, 1.0); // Outside mask: black color
              }
          #endif
        `,
      };
    }

    return null;
  }
}
