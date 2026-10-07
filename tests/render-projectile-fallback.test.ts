import { expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { World } from '../src/game/world';
import { ProjectileSprites } from '../src/render/projectile-sprites';

function renderer() {
  const missing = new Set<string>();
  const images: { visible: boolean; destroy: ReturnType<typeof vi.fn> }[] = [];
  const scene = {
    textures: { exists: (key: string) => !missing.has(key) },
    add: {
      image: () => {
        const image = {
          visible: true,
          setVisible(value: boolean) {
            this.visible = value;
            return this;
          },
          setOrigin() { return this; },
          setDepth() { return this; },
          setTexture() { return this; },
          setPosition() { return this; },
          setRotation() { return this; },
          setScale() { return this; },
          setTint() { return this; },
          setAlpha() { return this; },
          destroy: vi.fn(),
        };
        images.push(image);
        return image;
      },
    },
  };
  return {
    missing,
    images,
    sprites: new ProjectileSprites(scene as unknown as Phaser.Scene),
  };
}

it('falls back for the complete projectile pass when a friendly texture disappears, and reuses the pool after recovery', () => {
  const { sprites, images, missing } = renderer();
  const world = new World();
  world.projectiles.acquire()!;
  world.projectiles.acquire()!.enemy = true;
  expect(sprites.update(world)).toBe(true);
  expect(images).toHaveLength(3);
  expect(images.every((image) => image.visible)).toBe(true);

  missing.add('friendly-bolt-core-v21');
  expect(sprites.update(world)).toBe(false);
  expect(images.every((image) => !image.visible)).toBe(true);

  missing.clear();
  expect(sprites.update(world)).toBe(true);
  expect(images).toHaveLength(3);
  expect(images.every((image) => image.visible)).toBe(true);
});

it('hides old projectile sprites if the hostile texture is missing and releases them exactly once', () => {
  const { sprites, images, missing } = renderer();
  const world = new World();
  world.projectiles.acquire()!.enemy = true;
  expect(sprites.update(world)).toBe(true);
  missing.add('hostile-projectile-v3');
  expect(sprites.update(world)).toBe(false);
  expect(images.every((image) => !image.visible)).toBe(true);
  sprites.dispose();
  sprites.dispose();
  expect(sprites.count).toBe(0);
  for (const image of images) expect(image.destroy).toHaveBeenCalledTimes(1);
});
