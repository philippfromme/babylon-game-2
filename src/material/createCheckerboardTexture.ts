import * as BABYLON from "@babylonjs/core";

import { canvasToRawTexture } from "./canvasToRawTexture";

export type CheckerboardTextureConfig = {
  canvasWidth?: number;
  squares?: number;
  color1?: string;
  color2?: string;
  borderColor?: string;
};

const DEFAULT_CONFIG = {
  canvasWidth: 256,
  squares: 32,
  color1: "#0000ff",
  color2: "#2222ff",
  borderColor: "#ffffff",
};

export function createCheckerboardTexture(
  scene: BABYLON.Scene,
  config: CheckerboardTextureConfig = {}
) {
  config = {
    ...DEFAULT_CONFIG,
    ...config,
  } as Required<CheckerboardTextureConfig>;

  const canvas = document.createElement("canvas");

  canvas.width = config.canvasWidth!;
  canvas.height = config.canvasWidth!;

  const ctx = canvas.getContext("2d")!;

  const size = canvas.width / config.squares!;

  for (let y = 0; y < config.squares!; y++) {
    for (let x = 0; x < config.squares!; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? config.color1! : config.color2!;
      ctx.fillRect(x * size, y * size, size, size);
    }
  }

  const fontSize = canvas.width / 16;

  ctx.fillStyle = config.color1!;
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.strokeStyle = config.borderColor!;

  const lineWidth = Math.floor(fontSize / 4);

  ctx.lineWidth = lineWidth;
  ctx.strokeRect(
    lineWidth / 2,
    lineWidth / 2,
    canvas.width - lineWidth,
    canvas.height - lineWidth
  );

  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  ctx.fillStyle = config.borderColor!;
  ctx.fillText("PROTOTYPE", fontSize / 2, fontSize / 2);
  ctx.fillText("1 x 1 meter", fontSize / 2, fontSize / 2 + fontSize);
  ctx.fillText(
    `${canvas.width} x ${canvas.height}`,
    fontSize / 2,
    fontSize / 2 + fontSize * 2
  );

  return canvasToRawTexture(canvas, scene, {
    name: "Checkerboard texture",
  });
}
