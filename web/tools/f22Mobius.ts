import fs from "node:fs";
import { Matrix4, Quaternion, Vector2, Vector3, ShapeUtils } from "three";
import { PNG } from "pngjs";
import type { ConvertedMesh, MeshGroup, Rgb } from "../src/assets/types";
import { drawMobiusBadge } from "./mobiusBadge";

/** Bake the supplied Blockbench glTF into the port's flat-shaded triangle format. */
export function createF22MobiusMesh(sourcePath: string): ConvertedMesh {
  const gltf = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const buffers: Buffer[] = gltf.buffers.map((b: { uri: string }) => Buffer.from(b.uri.split(",")[1], "base64"));
  const textures: PNG[] = gltf.images.map((image: { uri: string }) => PNG.sync.read(Buffer.from(image.uri.split(",")[1], "base64")));
  function accessor(index: number): number[][] {
    const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
    const buffer = buffers[view.buffer];
    const width = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[a.type];
    const size = ({ 5121: 1, 5123: 2, 5125: 4, 5126: 4 } as Record<number, number>)[a.componentType];
    if (!width || !size || a.sparse) throw new Error("Unsupported F-22 accessor");
    return Array.from({ length: a.count }, (_, i) => Array.from({ length: width }, (_, j) => {
      const offset = (view.byteOffset || 0) + (a.byteOffset || 0) + i * (view.byteStride || size * width) + j * size;
      return a.componentType === 5126 ? buffer.readFloatLE(offset) : size === 1 ? buffer.readUInt8(offset) : size === 2 ? buffer.readUInt16LE(offset) : buffer.readUInt32LE(offset);
    }));
  }
  // Landing clip ends with gear stowed; weapons clip starts with bays closed.
  for (const animation of gltf.animations || []) for (const channel of animation.channels) {
    const values = accessor(animation.samplers[channel.sampler].output);
    gltf.nodes[channel.target.node][channel.target.path] = animation.name === "F22 lndg" ? values.at(-1) : values[0];
  }
  const groups = new Map<string, MeshGroup>();
  function triangle(color: Rgb, points: Vector3[]): void {
    const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    // The source contains collapsed faces; omit them instead of emitting zero normals.
    if (normal.lengthSq() < 1e-16) return;
    normal.normalize();
    const key = `${color.r},${color.g},${color.b}`;
    let group = groups.get(key);
    if (!group) { group = { colorId: groups.size + 1, color, bright: false, positions: [], normals: [] }; groups.set(key, group); }
    for (const p of points) { group.positions.push(p.x, p.y, p.z); group.normals.push(normal.x, normal.y, normal.z); }
  }
  // Source points aft along +Z. Rotate to the port's +Z nose and scale to 18.9 m.
  const scale = 18.9 / (3.96875 + 0.96875);
  const port = new Matrix4().makeScale(-scale, scale, -scale);
  port.setPosition(0, -0.25 * scale, 1.5 * scale);
  const badgeColors: Record<string, Rgb> = {
    black: { r: 2, g: 3, b: 6 }, white: { r: 240, g: 244, b: 248 },
    badgeBlue: { r: 7, g: 106, b: 189 }, badgeSky: { r: 53, g: 171, b: 230 },
    badgeGray: { r: 150, g: 153, b: 158 }, badgeDark: { r: 39, g: 41, b: 46 },
  };
  const linearByte = (v: number) => Math.round(255 * (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  function visit(index: number, parent: Matrix4): void {
    const node = gltf.nodes[index];
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3().fromArray(node.translation || [0, 0, 0]), new Quaternion().fromArray(node.rotation || [0, 0, 0, 1]), new Vector3().fromArray(node.scale || [1, 1, 1]));
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined) for (const primitive of gltf.meshes[node.mesh].primitives) {
      if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error("F-22 requires triangle primitives");
      const positions = accessor(primitive.attributes.POSITION).map(p => new Vector3().fromArray(p).applyMatrix4(world));
      const uv = accessor(primitive.attributes.TEXCOORD_0);
      const indices = primitive.indices === undefined ? positions.map((_, i) => i) : accessor(primitive.indices).flat();
      const material = gltf.materials[primitive.material];
      const texture = textures[gltf.textures[material.pbrMetallicRoughness.baseColorTexture.index].source];
      for (let i = 0; i < indices.length; i += 3) {
        const ids = indices.slice(i, i + 3);
        const u = ids.reduce((sum, id) => sum + uv[id][0], 0) / 3, v = ids.reduce((sum, id) => sum + uv[id][1], 0) / 3;
        const pixel = 4 * (Math.min(texture.height - 1, Math.max(0, Math.floor(v * texture.height))) * texture.width + Math.min(texture.width - 1, Math.max(0, Math.floor(u * texture.width))));
        if (texture.data[pixel + 3] < 13) continue;
        triangle({ r: linearByte(texture.data[pixel]), g: linearByte(texture.data[pixel + 1]), b: linearByte(texture.data[pixel + 2]) }, ids.map(id => positions[id]));
      }
    }
    // Main fin panels (before the rudders). Decals follow each fin's actual local
    // plane and cant, with small layer offsets to prevent coplanar flicker.
    if (index === 28 || index === 29) for (const side of [-1, 1]) {
      drawMobiusBadge((material, coords, layer) => {
        const flat = coords.map(([u, v]) => new Vector2(u, v));
        const points = coords.map(([u, v]) => new Vector3(side < 0 ? -0.014 - layer * 0.0005 : 0.008 + layer * 0.0005, 0.29 + v * 0.155, -0.075 + u * 0.155).applyMatrix4(world));
        for (const ids of ShapeUtils.triangulateShape(flat, [])) triangle(badgeColors[material], ids.map(i => points[i]));
      });
    }
    for (const child of node.children || []) visit(child, world);
  }
  for (const root of gltf.scenes[gltf.scene || 0].nodes) visit(root, port);
  const exhausts = [-1, 1].map(side => {
    // Centers of the two rectangular nozzle exits in the supplied glTF.
    const p = new Vector3(side * 0.145, 0.35, 3.275).applyMatrix4(port);
    return { x: p.x, y: p.y, z: p.z, width: 0.72, height: 0.3, length: 2.8 };
  });
  return { sourceName: "F-22 Raptor — Mobius Squadron (supplied low-poly glTF)", groups: [...groups.values()], exhausts };
}
