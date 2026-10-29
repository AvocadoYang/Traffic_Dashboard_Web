import { FC, ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import styled from "styled-components";

/**
 * 跟著 3D 位置走的 DOM (例如區域名稱)。drei 的 Html 是另一個 React root, 拿不到外面的
 * react-query、jotai、antd 這些 context; 要用到它們的標籤放在畫布外面的一層 DOM,
 * 每一幀由畫布裡的 AnchorProjector 把 3D 位置換成螢幕位置, 直接改 transform (不經過 React)。
 */

type Target = { el: HTMLElement; world: THREE.Vector3 };

export class ScreenAnchors {
  private items = new Map<string, Target>();
  private worlds = new Map<string, THREE.Vector3>();
  private callbacks = new Map<string, (el: HTMLElement | null) => void>();
  private v = new THREE.Vector3();
  /** 畫布裡的投影器設的: 標籤剛掛上、位置變了時要求畫一幀, 才會馬上擺到位置 */
  invalidate: (() => void) | null = null;

  /**
   * 給 DOM 的 ref: 世界座標 (x, 高度, z)。同一個 key 每次給同一個函式,
   * 外面重新 render 時 React 不會把標籤拆掉再掛回來 (會閃一下)
   */
  ref(key: string, x: number, y: number, z: number) {
    let world = this.worlds.get(key);
    if (!world) {
      world = new THREE.Vector3(x, y, z);
      this.worlds.set(key, world);
    } else if (world.x !== x || world.y !== y || world.z !== z) {
      world.set(x, y, z);
      this.invalidate?.();
    }
    let cb = this.callbacks.get(key);
    if (!cb) {
      const w = world;
      cb = (el) => {
        if (!el) {
          this.items.delete(key);
          return;
        }
        el.style.visibility = "hidden";
        this.items.set(key, { el, world: w });
        this.invalidate?.();
      };
      this.callbacks.set(key, cb);
    }
    return cb;
  }

  project(camera: THREE.Camera, width: number, height: number) {
    for (const { el, world } of this.items.values()) {
      const p = this.v.copy(world).project(camera);
      const shown = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
      el.style.visibility = shown ? "visible" : "hidden";
      if (shown) el.style.transform = `translate(${((p.x + 1) / 2) * width}px, ${((1 - p.y) / 2) * height}px)`;
    }
  }
}

/** 放在畫布裡: 每一幀更新所有標籤的位置 */
export const AnchorProjector: FC<{ anchors: ScreenAnchors }> = ({ anchors }) => {
  const invalidate = useThree((s) => s.invalidate);
  anchors.invalidate = invalidate;
  useFrame(({ camera, size }) => anchors.project(camera, size.width, size.height));
  return null;
};

/** 畫布外面、蓋在畫布上的那一層 (本身不擋滑鼠, 標籤自己可以點) */
export const AnchorLayer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
`;

/** 一個標籤: 左上角對準 3D 位置, offset 再往哪邊挪 (CSS transform, 例如 "translate(0, -100%)") */
export const Anchored: FC<{ anchorRef: (el: HTMLElement | null) => void; offset?: string; children: ReactNode }> = ({
  anchorRef,
  offset,
  children,
}) => (
  <div ref={anchorRef} style={{ position: "absolute", left: 0, top: 0, willChange: "transform", visibility: "hidden" }}>
    <div style={{ transform: offset, pointerEvents: "auto" }}>{children}</div>
  </div>
);
