import { useEffect, useRef, useState } from "react";
import { View, Image, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Screen, Text, Button, Spinner, Card } from "@/components/ui";
import { createFootScan, uploadFootPhoto } from "@/api/footscan-capture";

type Foot = "left" | "right";
const STEPS: { foot: Foot; angle: string; label: string }[] = [
  { foot: "left", angle: "plantar", label: "Pé esquerdo — sola (plantar)" },
  { foot: "left", angle: "medial", label: "Pé esquerdo — lado interno" },
  { foot: "left", angle: "lateral", label: "Pé esquerdo — lado externo" },
  { foot: "right", angle: "plantar", label: "Pé direito — sola (plantar)" },
  { foot: "right", angle: "medial", label: "Pé direito — lado interno" },
  { foot: "right", angle: "lateral", label: "Pé direito — lado externo" },
];

export default function CaptureFootScan() {
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [initErr, setInitErr] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Create the scan once we have permission.
  useEffect(() => {
    if (permission?.granted && !scanId && !initErr) {
      createFootScan()
        .then((s) => setScanId(s.id))
        .catch((e) => setInitErr((e as Error).message || "Falha ao iniciar o scan."));
    }
  }, [permission?.granted, scanId, initErr]);

  if (!permission) {
    return (
      <Screen testID="capture-screen"><Stack.Screen options={{ title: "Captura" }} /><Spinner center /></Screen>
    );
  }
  if (!permission.granted) {
    return (
      <Screen testID="capture-screen">
        <Stack.Screen options={{ headerShown: true, title: "Captura" }} />
        <View style={{ gap: 16, flex: 1, justifyContent: "center" }}>
          <Text variant="subtitle">Precisamos da câmera</Text>
          <Text muted>Permita o acesso à câmera para fotografar seus pés.</Text>
          <Button title="Permitir câmera" onPress={requestPermission} testID="grant-camera" />
        </View>
      </Screen>
    );
  }

  const current = STEPS[step];

  const capture = async () => {
    setErr(null);
    const photo = await camRef.current?.takePictureAsync({ quality: 0.6 });
    if (photo?.uri) setShot(photo.uri);
  };

  const confirm = async () => {
    if (!shot || !scanId) return;
    setBusy(true);
    setErr(null);
    try {
      await uploadFootPhoto(scanId, current.foot, current.angle, shot);
      setShot(null);
      if (step + 1 >= STEPS.length) {
        router.replace(`/foot-scan/${scanId}`); // done → detail (status + 3D)
      } else {
        setStep(step + 1);
      }
    } catch (e) {
      setErr((e as Error).message || "Falha no envio. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen testID="capture-screen" padded={false}>
      <Stack.Screen options={{ headerShown: true, title: `Foto ${step + 1}/${STEPS.length}` }} />
      <View style={{ padding: 12, gap: 4 }}>
        <Text variant="subtitle">{current.label}</Text>
        <Text variant="caption" muted>Enquadre o pé e toque em capturar.</Text>
        {initErr ? <Text variant="caption" color="#dc2626">{initErr}</Text> : null}
        {err ? <Text variant="caption" color="#dc2626" testID="capture-error">{err}</Text> : null}
      </View>

      <View style={{ flex: 1 }}>
        {shot ? (
          <Image source={{ uri: shot }} style={{ flex: 1 }} resizeMode="cover" />
        ) : (
          <CameraView ref={camRef} style={{ flex: 1 }} facing="back" testID="camera-view" />
        )}
      </View>

      <View style={{ padding: 16, gap: 10 }}>
        {shot ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Refazer" variant="ghost" onPress={() => setShot(null)} disabled={busy} testID="retake" />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Usar foto" onPress={confirm} loading={busy} testID="use-photo" />
            </View>
          </View>
        ) : (
          <Button title="Capturar" onPress={capture} disabled={!scanId} testID="capture-btn" />
        )}
      </View>
    </Screen>
  );
}
