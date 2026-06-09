import { useRef, useState } from "react";
import { View, Image, Switch } from "react-native";
import { Stack, router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Screen, Text, Button, Input, Card, Spinner } from "@/components/ui";
import { createFootScan, updateScanMeta, uploadFootPhoto } from "@/api/footscan-capture";
import { useTheme } from "@/theme/useTheme";

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
  const t = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const [phase, setPhase] = useState<"intro" | "capturing">("intro");
  const [shoeSize, setShoeSize] = useState("");
  const [useA4, setUseA4] = useState(true);
  const [scanId, setScanId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [step, setStep] = useState(0);
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Permission gate
  if (!permission) {
    return <Screen testID="capture-screen"><Stack.Screen options={{ title: "Captura" }} /><Spinner center /></Screen>;
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

  // Intro: shoe size + A4 reference
  if (phase === "intro") {
    const start = async () => {
      setErr(null);
      setStarting(true);
      try {
        const s = await createFootScan();
        await updateScanMeta(s.id, {
          shoeSize: shoeSize.trim() || undefined,
          scaleReference: useA4 ? "A4" : undefined,
        });
        setScanId(s.id);
        setPhase("capturing");
      } catch (e) {
        setErr((e as Error).message || "Falha ao iniciar o scan.");
      } finally {
        setStarting(false);
      }
    };
    return (
      <Screen scroll testID="capture-screen">
        <Stack.Screen options={{ headerShown: true, title: "Novo scan 3D" }} />
        <View style={{ gap: 16 }}>
          <Text variant="title">Antes de começar</Text>
          <Card>
            <Input
              label="Tamanho do calçado (opcional)"
              placeholder="ex.: BR 40 / EU 41"
              value={shoeSize}
              onChangeText={setShoeSize}
              testID="shoe-size"
            />
            <Text variant="caption" muted>
              Ajuda a IA a estimar a escala das medidas.
            </Text>
          </Card>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text variant="subtitle">Usar folha A4 como referência</Text>
              <Switch value={useA4} onValueChange={setUseA4} trackColor={{ true: t.colors.primary }} testID="use-a4" />
            </View>
            <Text variant="caption" muted>
              Nas fotos da sola, posicione o pé sobre uma folha A4 (210×297 mm). É a
              referência de escala mais precisa para a análise.
            </Text>
          </Card>
          {err ? <Text variant="caption" color="#dc2626">{err}</Text> : null}
          <Button title="Começar captura" onPress={start} loading={starting} testID="start-capture" />
        </View>
      </Screen>
    );
  }

  // Capturing
  const current = STEPS[step];
  const instruction =
    current.angle === "plantar" && useA4 ? `${current.label} — sobre a folha A4` : current.label;

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
      if (step + 1 >= STEPS.length) router.replace(`/foot-scan/${scanId}`);
      else setStep(step + 1);
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
        <Text variant="subtitle">{instruction}</Text>
        <Text variant="caption" muted>Enquadre o pé e toque em capturar.</Text>
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
          <Button title="Capturar" onPress={capture} testID="capture-btn" />
        )}
      </View>
    </Screen>
  );
}
