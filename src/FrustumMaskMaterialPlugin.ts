import * as BABYLON from "@babylonjs/core";

export default class FrustumMaskMaterialPlugin extends BABYLON.MaterialPluginBase {
  _isEnabled: boolean = true;

  _secondaryViewProjection: BABYLON.Matrix = BABYLON.Matrix.Identity();
  _colorTexture: BABYLON.Nullable<BABYLON.Texture> = null;
  _depthTexture: BABYLON.Nullable<BABYLON.Texture> = null;

  constructor(material: BABYLON.Material) {
    super(material, "FrustumMaskMaterialPlugin", 100, {
      FrustumMask: true,
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

  setSecondaryViewProjection(secondaryViewProjection: BABYLON.Matrix) {
    this._secondaryViewProjection = secondaryViewProjection;
  }

  setColorTexture(colorTexture: BABYLON.Texture) {
    this._colorTexture = colorTexture;
  }

  setDepthTexture(depthTexture: BABYLON.Texture) {
    this._depthTexture = depthTexture;
  }

  prepareDefines(
    defines: BABYLON.MaterialDefines,
    scene: BABYLON.Scene,
    mesh: BABYLON.AbstractMesh
  ) {
    defines["FrustumMask"] = this._isEnabled;
  }

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
        {
          name: "secondaryViewProjection",
          size: 16,
          type: "mat4",
        },
      ],
      fragment: `#ifdef FrustumMask
                    uniform mat4 secondaryViewProjection;
                #endif`,
    };
  }

  getSamplers(samplers: string[]) {
    samplers.push("colorTexture", "depthTexture");
  }

  bindForSubMesh(
    uniformBuffer: BABYLON.UniformBuffer,
    scene: BABYLON.Scene,
    engine: BABYLON.AbstractEngine,
    subMesh: BABYLON.SubMesh
  ) {
    if (this._isEnabled) {
      uniformBuffer.updateMatrix(
        "secondaryViewProjection",
        this._secondaryViewProjection
      );
      if (this._colorTexture) {
        uniformBuffer.setTexture("colorTexture", this._colorTexture);
      } else {
        console.warn("Color texture is not set for FrustumMaskMaterialPlugin.");
      }
      if (this._depthTexture) {
        uniformBuffer.setTexture("depthTexture", this._depthTexture);
      } else {
        console.warn("Depth texture is not set for FrustumMaskMaterialPlugin.");
      }
    }
  }

  getClassName() {
    return "FrustumMaskMaterialPlugin";
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
          #ifdef FrustumMask
            varying vec4 secondaryScreenPos;
          #endif
        `,
        CUSTOM_VERTEX_MAIN_BEGIN: `
          #ifdef FrustumMask
            secondaryScreenPos = secondaryViewProjection * world * vec4(position, 1.0);
          #endif
        `,
      };
    } else if (shaderType === "fragment") {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
          #ifdef FrustumMask
            uniform sampler2D colorTexture;
            uniform sampler2D depthTexture;

            varying vec4 secondaryScreenPos;
          #endif
        `,
        CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
          #ifdef FrustumMask
            // Convert from clip space to normalized device coordinates
            vec3 ndcCoords = secondaryScreenPos.xyz / secondaryScreenPos.w;

            // Convert from NDC to texture coordinates
            vec3 textureCoords = ndcCoords * 0.5 + 0.5;  // Transform from [-1, 1] to [0, 1]

            // Read color value from texture
            // color = texture2D(colorTexture, textureCoords.xy);

            // Read depth value from texture
            float depth = texture2D(depthTexture, textureCoords.xy).r;

            if(abs(ndcCoords.x) > 1.0 || abs(ndcCoords.y) > 1.0 || ndcCoords.z < 0.0) {

              // darken the fragment by 90%
              gl_FragColor = vec4(color.rgb * 0.05, 1.0);

              return;
            }

            // Convert depth to correct space
            float currentDepth = (secondaryScreenPos.z / secondaryScreenPos.w) * 0.5 + 0.5;

            // Apply bias
            float bias = 0.0001; // Increase if needed

            if (currentDepth - bias > depth) {
            
              // darken the fragment by 90%
              gl_FragColor = vec4(color.rgb * 0.05, 1.0);

              return;
            }
          #endif
        `,
      };
    }

    return null;
  }
}
