import { Screen } from "../../src/ui/screen";
import { ActivityIndicator, View } from "react-native";
import { useBusiness } from "../../src/state/business";
import { BusinessForm } from "../../src/ui/business-form";
import { usePalette } from "../../src/ui/theme";

function EditBusinessScreenContent() {
  const palette = usePalette();
  const { business, loading } = useBusiness();
  if (loading || !business) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={palette.ink} />
      </View>
    );
  }
  return <BusinessForm key={business.id} initial={business} businessId={business.id} />;
}

export default function EditBusinessScreen() {
  return (
    <Screen topInset={true}><EditBusinessScreenContent /></Screen>
  );
}
