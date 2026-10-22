import { ActivityIndicator, View } from "react-native";
import { useBusiness } from "../../src/state/business";
import { colors } from "../../src/theme";
import { BusinessForm } from "../../src/ui/business-form";

export default function EditBusinessScreen() {
  const { business, loading } = useBusiness();
  if (loading || !business) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  return <BusinessForm key={business.id} initial={business} businessId={business.id} />;
}
