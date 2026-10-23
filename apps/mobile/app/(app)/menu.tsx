import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, Plus, UtensilsCrossed } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { apiBaseUrl } from "../../src/api/instance";
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

type Product = {
  id: string;
  name: string;
  pricePaise: number;
  photo?: string | null;
  photos?: string[];
  available?: boolean;
};

function photoUri(photo?: string | null) {
  if (!photo) return null;
  if (photo.startsWith("http") || photo.startsWith("data:")) return photo;
  if (photo.startsWith("/")) {
    const base = apiBaseUrl();
    return base ? `${base}${photo}` : null;
  }
  return null;
}

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
  const [savingId, setSavingId] = useState<string | null>(null);
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

  async function toggleAvailable(item: Product) {
    if (!id || savingId) return;
    setSavingId(item.id);
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/menu`, {
        method: "POST",
        body: JSON.stringify({ action: "update", id: item.id, available: item.available === false })
      });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "menu", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setSavingId(null);
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
            {!locked && !items.isLoading && rows.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title={t.emptyMenuTitle}
                body={t.emptyMenuBody}
                action={t.quickAdd}
                onAction={() => setOpen(true)}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={null}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductCard
              item={item}
              grid={grid}
              lang={lang}
              rupee={t.rupee}
              onLabel={t.available}
              offLabel={t.soldOut}
              busy={savingId === item.id}
              onToggle={() => toggleAvailable(item)}
            />
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
          <PrimaryButton
            label={t.saveAnother}
            onPress={() => add(true)}
            disabled={!name.trim() || !price.trim()}
            hint={t.hintNamePrice}
          />
        </View>
      </BottomSheet>
      <CoachTour screen="menu" steps={[{ title: t.coachMenuAdd, body: t.coachMenuAddBody, top: 96 }]} />
    </View>
  );
}

function FoodPlaceholder() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 120">
      <Rect width="160" height="120" fill="#F4EFE6" />
      <Circle cx="80" cy="64" r="36" fill="#FFFFFF" stroke="#E7E0D4" strokeWidth="2" />
      <Circle cx="80" cy="64" r="20" fill="#DCFCE7" />
      <Circle cx="72" cy="58" r="5" fill="#16A34A" />
      <Circle cx="90" cy="68" r="4" fill="#92400E" />
      <Circle cx="78" cy="74" r="3" fill="#D69E2E" />
    </Svg>
  );
}

function ProductPhoto({ uri, tall }: { uri: string | null; tall: boolean }) {
  return (
    <View style={[styles.photo, tall ? styles.photoTall : styles.photoThumb]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : (
        <FoodPlaceholder />
      )}
    </View>
  );
}

function ProductCard({
  item,
  grid,
  lang,
  rupee,
  onLabel,
  offLabel,
  busy,
  onToggle
}: {
  item: Product;
  grid: boolean;
  lang: string;
  rupee: string;
  onLabel: string;
  offLabel: string;
  busy: boolean;
  onToggle: () => void;
}) {
  const { palette } = useTheme();
  const on = item.available !== false;
  const uri = photoUri(item.photo || item.photos?.[0]);
  const price = `${rupee}${Math.round(item.pricePaise / 100)}`;
  const toggle = (
    <Switch
      accessibilityLabel={on ? onLabel : offLabel}
      value={on}
      disabled={busy}
      onValueChange={onToggle}
      trackColor={{ false: palette.line, true: palette.primary }}
      thumbColor="#FFFFFF"
    />
  );
  if (!grid) {
    return (
      <Card style={styles.listCard}>
        <ProductPhoto uri={uri} tall={false} />
        <View style={styles.listCopy}>
          <Text style={[styles.item, { color: palette.ink }, lang === "hi" && styles.hindi]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.note, { color: palette.muted }]}>{price}</Text>
        </View>
        {toggle}
      </Card>
    );
  }
  return (
    <Card style={styles.gridCard}>
      <ProductPhoto uri={uri} tall />
      <Text style={[styles.item, { color: palette.ink }, lang === "hi" && styles.hindi]} numberOfLines={2}>{item.name}</Text>
      <View style={styles.gridFoot}>
        <Text style={[styles.note, { color: palette.ink }]}>{price}</Text>
        {toggle}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { padding: 16, paddingBottom: 120 },
  header: { gap: 12, marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.display, fontSize: 28 },
  row: { flexDirection: "row", gap: 8 },
  stack: { gap: 12 },
  cell: { flex: 1, padding: 6 },
  gridCard: { padding: 10, gap: 8, overflow: "hidden" },
  listCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  listCopy: { flex: 1, gap: 2 },
  gridFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  photo: { borderRadius: 14, overflow: "hidden", backgroundColor: "#F4EFE6" },
  photoTall: { height: 112, width: "100%" },
  photoThumb: { width: 56, height: 56 },
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
