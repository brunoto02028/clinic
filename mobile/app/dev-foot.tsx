import { View, Text } from "react-native";
import { FootViewer } from "@/components/foot-viewer";

// Public dev route to validate the native foot 3D render on the emulator,
// using the SAME FootViewer component as the real detail screen (mock data).
export default function DevFoot() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", paddingTop: 40 }} testID="dev-foot">
      <Text style={{ color: "#5dc9c0", padding: 12, fontSize: 16 }}>
        Foot scan 3D (mock) — arraste para girar
      </Text>
      <FootViewer
        measurements={{
          leftFootLength: 260,
          rightFootLength: 262,
          leftFootWidth: 98,
          rightFootWidth: 99,
          leftArchHeight: 25,
          rightArchHeight: 23,
        }}
      />
    </View>
  );
}
