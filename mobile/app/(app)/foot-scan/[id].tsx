import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchFootScan } from "@/api/footscans";
import { FootViewer } from "@/components/foot-viewer";

function Measure({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined) return null;
  return (
    <Text variant="label">
      {label}: <Text muted>{String(value)}</Text>
    </Text>
  );
}

export default function FootScanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["foot-scan", id],
    queryFn: () => fetchFootScan(id),
    enabled: !!id,
  });

  return (
    <Screen scroll testID="foot-scan-detail">
      <Stack.Screen options={{ headerShown: true, title: "Scan 3D" }} />
      {isLoading ? (
        <Spinner center />
      ) : isError || !data ? (
        <Text color="#dc2626">Não foi possível carregar o scan.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          <Text variant="title">{data.scanNumber}</Text>
          <FootViewer measurements={data} />
          <Text variant="caption" muted>Arraste para girar o modelo.</Text>
          <Card>
            <Text variant="subtitle">Medidas</Text>
            <Measure label="Comprimento (E/D)" value={
              data.leftFootLength && data.rightFootLength
                ? `${data.leftFootLength} / ${data.rightFootLength} mm` : null} />
            <Measure label="Largura (E/D)" value={
              data.leftFootWidth && data.rightFootWidth
                ? `${data.leftFootWidth} / ${data.rightFootWidth} mm` : null} />
            <Measure label="Altura do arco (E/D)" value={
              data.leftArchHeight && data.rightArchHeight
                ? `${data.leftArchHeight} / ${data.rightArchHeight} mm` : null} />
            <Measure label="Tipo de arco" value={data.archType} />
            <Measure label="Pronação" value={data.pronation} />
            <Measure label="Hálux valgo" value={data.halluxValgusAngle ? `${data.halluxValgusAngle}°` : null} />
          </Card>
        </View>
      )}
    </Screen>
  );
}
