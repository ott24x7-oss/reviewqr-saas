import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Camera, Plus, UtensilsCrossed } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { CoachTour } from "../../src/guide/coach";
import { HelpButton } from "../../src/guide/help-sheet";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { hasModule, useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { BottomSheet, Card, Chip, EmptyState, Skeleton } from "../../src/ui/bits";
import { PrimaryButton } from "../../src/ui/buttons";
import { Field } from "../../src/ui/controls";
import { LockedModuleCard } from "../../src/ui/locked-module";
import { useTheme } from "../../src/ui/theme";

type Product = { id: string; name: string; pricePaise: number; photoUrl?: string | null };

export default function MenuTab() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const entitlement = useEntitlement();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [grid, setGrid] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const id = business?.id;
  const modules = entitlement.data?.modules;
  const locked = !!(modules && !hasModule(modules, "MENU"));
  const items = useQuery({
    queryKey: accountKey(user?.id ?? "", "menu", id),
    enabled: !!user && !!id && !locked,
    queryFn: () => apiData<{ items: Product[] }>(`/api/v1/businesses/${id}/menu?limit=50`)
  });

  async function add(another: boolean) {
    if (!id) return;
    const priceRupees = Number(price);
    if (!name.trim() || !Number.isFinite(priceRupees)) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/menu`, {
        method: "POST",
        body: JSON.stringify({ action: "item", name: name.trim(), priceRupees })
      });
      setName("");
      setPrice("");
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "menu", id) });
      if (!another) setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function fromPhoto(source: "camera" | "library") {
    if (!id) return;
    setError(null);
    const shot =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4, mediaTypes: ["images"] })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.4, mediaTypes: ["images"] });
    if (shot.canceled || !shot.assets[0]?.base64) return;
    setSuggesting(true);
    try {
      const data = await apiData<{ item: { name?: string; priceRupees?: number } }>(`/api/v1/businesses/${id}/menu/snap`, {
        method: "POST",
        body: JSON.stringify({ image: `data:image/jpeg;base64,${shot.assets[0].base64}` })
      });
      if (data.item.name) setName(data.item.name);
      if (data.item.priceRupees) setPrice(String(data.item.priceRupees));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Type the name and price");
    } finally {
      setSuggesting(false);
    }
  }

  const rows = items.data?.items ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper }]}>
      <FlashList
        data={locked ? [] : rows}
        key={grid ? "grid" : "list"}
        numColumns={grid ? 2 : 1}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.pad}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.menuTab}</Text>
              <HelpButton title={t.coachMenuAdd} body={t.coachMenuAddBody} />
            </View>
            <View style={styles.row}>
              <Chip label={t.gridView} selected={grid} onPress={() => setGrid(true)} />
              <Chip label={t.listView} selected={!grid} onPress={() => setGrid(false)} />
            </View>
            {locked ? <LockedModuleCard moduleId="MENU" /> : null}
            {items.isLoading ? <Skeleton height={120} /> : null}
          </View>
        }
        ListEmptyComponent={
          locked || items.isLoading ? null : (
            <EmptyState
              icon={UtensilsCrossed}
              title={t.emptyMenuTitle}
              body={t.emptyMenuBody}
              action={t.quickAdd}
              onAction={() => setOpen(true)}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.cell, grid && styles.cellGrid]}>
            <Card>
              <Text style={[styles.item, { color: palette.ink }]}>{item.name}</Text>
              <Text style={[styles.note, { color: palette.muted }]}>₹{Math.round(item.pricePaise / 100)}</Text>
            </Card>
          </View>
        )}
      />
      {!locked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.quickAdd}
          onPress={() => setOpen(true)}
          style={[styles.fab, { backgroundColor: palette.deep }]}
        >
          <Plus color="#FFFFFF" size={24} strokeWidth={1.75} />
        </Pressable>
      ) : null}
      <BottomSheet visible={open} title={t.quickAdd} onClose={() => setOpen(false)}>
        <View style={styles.stack}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.photo} onPress={() => fromPhoto("camera")} style={[styles.camera, { borderColor: palette.line, backgroundColor: palette.paper }]}>
            <Camera color={palette.deep} size={28} strokeWidth={1.75} />
            <Text style={[styles.note, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.photo}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t.gallery} onPress={() => fromPhoto("library")} style={styles.hit}>
            <Text style={[styles.note, { color: palette.deep }]}>{t.gallery}</Text>
          </Pressable>
          {suggesting ? <Skeleton height={18} /> : null}
          <Field label={t.name} tone="paper" value={name} onChangeText={setName} />
          <Field label={t.price} tone="paper" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
          <PrimaryButton label={t.saveAnother} onPress={() => add(true)} disabled={!name.trim() || !price.trim()} />
        </View>
      </BottomSheet>
      <CoachTour screen="menu" steps={[{ title: t.coachMenuAdd, body: t.coachMenuAddBody, top: 96 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { padding: 16, paddingBottom: 96 },
  header: { gap: 12, marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.display, fontSize: 28 },
  row: { flexDirection: "row", gap: 8 },
  stack: { gap: 12 },
  cell: { padding: 6, width: "100%" },
  cellGrid: { width: "50%" },
  item: { fontFamily: fonts.title, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 15 },
  hindi: { fontFamily: fonts.hindi },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  camera: { minHeight: 96, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  hit: { minHeight: 48, justifyContent: "center" }
});
