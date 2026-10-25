import { Screen } from "../../src/ui/screen";
import { BusinessForm } from "../../src/ui/business-form";

function NewBusinessScreenContent() {
  return <BusinessForm />;
}

export default function NewBusinessScreen() {
  return (
    <Screen topInset={true}><NewBusinessScreenContent /></Screen>
  );
}
