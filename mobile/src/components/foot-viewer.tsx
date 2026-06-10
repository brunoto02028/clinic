import { useRef } from "react";
import { View, PanResponder } from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";
import { buildFeetGroup, type FootMeasurements } from "@/lib/foot-geometry";

/**
 * Native 3D viewer for a foot scan: renders both feet from measurements via
 * expo-gl + expo-three, rotatable by drag (PanResponder). Same pipeline proven
 * in the T-1 proof-of-concept.
 */
export function FootViewer({ measurements }: { measurements: FootMeasurements }) {
  const rot = useRef({ x: 0.4, y: 0 });
  const base = useRef({ x: 0.4, y: 0 });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        base.current = { ...rot.current };
      },
      onPanResponderMove: (_e, g) => {
        rot.current.y = base.current.y + g.dx * 0.01;
        rot.current.x = base.current.x + g.dy * 0.01;
      },
    })
  ).current;

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(w, h);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0.6, 3.6);
    camera.lookAt(0, 0, 0);

    const feet = buildFeetGroup(measurements);
    scene.add(feet);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(2, 3, 2);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const animate = () => {
      requestAnimationFrame(animate);
      feet.rotation.x = rot.current.x;
      feet.rotation.y = rot.current.y;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    animate();
  };

  return (
    <View style={{ height: 320, borderRadius: 14, overflow: "hidden" }} {...pan.panHandlers}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} testID="foot-gl" />
    </View>
  );
}
