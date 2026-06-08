import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";
import { View, Text } from "react-native";

/**
 * Proof-of-concept: native 3D pipeline via expo-gl + expo-three + three (no fiber).
 * Renders a rotating cube to verify the GL pipeline works on Android (Expo SDK 56).
 */
export default function Dev3D() {
  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(w, h);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 1000);
    camera.position.z = 3;

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x5dc9c0, roughness: 0.4 })
    );
    scene.add(cube);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(2, 2, 3);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.013;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    animate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }} testID="dev3d-screen">
      <Text style={{ color: "#5dc9c0", padding: 12, fontSize: 16 }}>
        Pipeline 3D nativo (expo-gl + three)
      </Text>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
    </View>
  );
}
