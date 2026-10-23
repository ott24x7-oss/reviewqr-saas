import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarOff, Palette as PaletteIcon, Wallet } from "lucide-react-native";
import { ScrollView, StyleSheet, Text } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { hasModule, useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";
import { LockedModuleCard } from "../../src/ui/locked-module";
import { Group, GroupRow, SectionHeader } from "../../src/ui/rows";

type StoreSettings = { holiday?: boolean; upiId?: string; design?: string };

export default function StoreScreen() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const entitlement = useEntitlement();
  const modules = entitlement.data?.modules;
  const open = !!business && (!modules || hasModule(modules, "STORE"));
  const settings = useQuery({
    queryKey: accountKey(user?.id ?? "", "store", business?.id),
    enabled: !!user && open,
    queryFn: () => apiData<StoreSettings>(`/api/v1/businesses/${business?.id}/store`)
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.storeSettings}</Text>
      {modules && !hasModule(modules, "STORE") ? <LockedModuleCard moduleId="STORE" /> : null}
      {open ? (
        <>
          <SectionHeader label={t.sectionCounter} />
          <Group>
            <GroupRow icon={PaletteIcon} tint="pink" title={t.hintDesign} hint={settings.data?.design || t.storeSettings} />
            <GroupRow icon={Wallet} tint="amber" title={t.hintUpi} hint={settings.data?.upiId || t.hintStoreRow} />
            <GroupRow
              icon={CalendarOff}
              tint={settings.data?.holiday ? "ink" : "green"}
              title={settings.data?.holiday ? t.cancel : t.available}
              hint={settings.data?.holiday ? t.hintClosed : t.hintOpen}
            />
          </Group>
        </>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  hindi: { fontFamily: fonts.hindi }
});
}
