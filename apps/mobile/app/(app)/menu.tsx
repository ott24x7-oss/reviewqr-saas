import { Screen } from "../../src/ui/screen";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, Plus, UtensilsCrossed } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
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
import { Field, PillButton } from "../../src/ui/controls";
import { LockedModuleCard } from "../../src/ui/locked-module";
import { useTheme } from "../../src/ui/theme";

type Category = { id: string; name: string };
type Variant = { id: string; label: string; pricePaise: number };
type AddOn = { id: string; name: string; pricePaise: number };
type Product = {
  id: string;
  name: string;
  pricePaise: number;
  mrpPaise?: number | null;
  photo?: string | null;
  photos?: string[];
  available?: boolean;
  bestseller?: boolean;
  veg?: string;
  categoryId?: string | null;
  variants?: Variant[];
  addOns?: AddOn[];
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

function MenuTabContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const entitlement = useEntitlement();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [search, setSearch] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [variantName, setVariantName] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState("");
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
    queryFn: () => apiData<{ items: Product[]; categories: Category[] }>(`/api/v1/businesses/${id}/menu?limit=50`)
  });

  async function add(another: boolean) {
    if (!id) return;
    const priceRupees = Number(price);
    if (!name.trim() || !Number.isFinite(priceRupees)) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/menu`, {
        method: "POST",
        body: JSON.stringify({
          action: "item",
          name: name.trim(),
          priceRupees,
          ...(mrp.trim() ? { mrpRupees: Number(mrp) } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(categoryName.trim() && !categoryId ? { category: categoryName.trim() } : {})
        })
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

  async function menuPost(body: Record<string, unknown>) {
    if (!id) return;
    setError(null);
    await apiData(`/api/v1/businesses/${id}/menu`, { method: "POST", body: JSON.stringify(body) });
    await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "menu", id) });
  }

  const categories = items.data?.categories ?? [];
  const rows = (items.data?.items ?? []).filter((item) => {
    const matchesName = item.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = !categoryId || item.categoryId === categoryId;
    return matchesName && matchesCategory;
  });

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
            {!locked ? (
              <KeyboardAwareScrollView style={styles.searchScroll} contentContainerStyle={styles.searchContent} keyboardShouldPersistTaps="handled" bottomOffset={12}>
                <Field label={t.search} tone="paper" value={search} onChangeText={setSearch} />
              </KeyboardAwareScrollView>
            ) : null}
            {!locked ? (
              <View style={styles.row}>
                <Chip label={t.dateAll} selected={!categoryId} onPress={() => setCategoryId(null)} />
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    selected={categoryId === category.id}
                    onPress={() => setCategoryId(category.id)}
                  />
                ))}
              </View>
            ) : null}
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
              onOpen={() => setEditing(item)}
            />
          </View>
        )}
      />
      {!locked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.quickAdd}
          onPress={() => setOpen(true)}
          style={[styles.fab, { backgroundColor: palette.primary }]}
        >
          <Plus color={palette.onPrimary} size={24} strokeWidth={1.75} />
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
          <Field label={t.mrp} tone="paper" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" />
          <Field label={t.categoryName} tone="paper" value={categoryName} onChangeText={setCategoryName} />
          <PillButton
            label={t.addCategory}
            tone="outline"
            onPress={() => {
              if (!categoryName.trim()) return;
              menuPost({ action: "category", name: categoryName.trim() }).then(() => setCategoryName("")).catch((err) => {
                setError(err instanceof ApiError ? err.message : "Could not save");
              });
            }}
          />
          {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
          <PrimaryButton
            label={t.saveAnother}
            onPress={() => add(true)}
            disabled={!name.trim() || !price.trim()}
            hint={t.hintNamePrice}
          />
        </View>
      </BottomSheet>
      <BottomSheet visible={!!editing} title={editing?.name || t.saveItem} onClose={() => setEditing(null)}>
        {editing ? (
          <View style={styles.stack}>
            <Field label={t.name} tone="paper" value={editing.name} onChangeText={(value) => setEditing({ ...editing, name: value })} />
            <Field
              label={t.price}
              tone="paper"
              value={String(Math.round(editing.pricePaise / 100))}
              keyboardType="decimal-pad"
              onChangeText={(value) => setEditing({ ...editing, pricePaise: Math.round(Number(value || 0) * 100) })}
            />
            <View style={styles.row}>
              <Chip label={t.veg} selected={editing.veg === "VEG"} onPress={() => setEditing({ ...editing, veg: "VEG" })} />
              <Chip label={t.nonVeg} selected={editing.veg === "NON_VEG"} onPress={() => setEditing({ ...editing, veg: "NON_VEG" })} />
              <Chip label={t.bestseller} selected={!!editing.bestseller} onPress={() => setEditing({ ...editing, bestseller: !editing.bestseller })} />
            </View>
            <PillButton
              label={t.saveItem}
              onPress={() => {
                menuPost({
                  action: "update",
                  id: editing.id,
                  name: editing.name,
                  priceRupees: editing.pricePaise / 100,
                  mrpRupees: mrp.trim() ? Number(mrp) : null,
                  veg: editing.veg || "NONE",
                  bestseller: !!editing.bestseller,
                  categoryId: categoryId
                }).then(() => setEditing(null)).catch((err) => setError(err instanceof ApiError ? err.message : "Could not save"));
              }}
            />
            <Field label={t.variant} tone="paper" value={variantName} onChangeText={setVariantName} />
            <Field label={t.price} tone="paper" value={variantPrice} onChangeText={setVariantPrice} keyboardType="decimal-pad" />
            <PillButton
              label={t.variant}
              tone="outline"
              onPress={() => {
                if (!variantName.trim()) return;
                menuPost({ action: "variant", id: editing.id, name: variantName.trim(), priceRupees: Number(variantPrice || 0) })
                  .then(() => { setVariantName(""); setVariantPrice(""); })
                  .catch((err) => setError(err instanceof ApiError ? err.message : "Could not save"));
              }}
            />
            <Field label={t.addon} tone="paper" value={addonName} onChangeText={setAddonName} />
            <Field label={t.price} tone="paper" value={addonPrice} onChangeText={setAddonPrice} keyboardType="decimal-pad" />
            <PillButton
              label={t.addon}
              tone="outline"
              onPress={() => {
                if (!addonName.trim()) return;
                menuPost({ action: "addon", id: editing.id, name: addonName.trim(), priceRupees: Number(addonPrice || 0) })
                  .then(() => { setAddonName(""); setAddonPrice(""); })
                  .catch((err) => setError(err instanceof ApiError ? err.message : "Could not save"));
              }}
            />
            <PillButton label={t.duplicate} tone="outline" onPress={() => menuPost({ action: "duplicate", id: editing.id, kind: "item" }).catch((err) => setError(err instanceof ApiError ? err.message : "Could not save"))} />
            <PillButton label={t.removeItem} tone="outline" onPress={() => menuPost({ action: "delete", id: editing.id, kind: "item" }).then(() => setEditing(null)).catch((err) => setError(err instanceof ApiError ? err.message : "Could not save"))} />
            {categoryId ? (
              <PillButton label={t.removeCategory} tone="outline" onPress={() => menuPost({ action: "delete", id: categoryId, kind: "category" }).then(() => setCategoryId(null)).catch((err) => setError(err instanceof ApiError ? err.message : "Could not save"))} />
            ) : null}
            {categoryId ? (
              <PillButton
                label={t.rename}
                tone="outline"
                onPress={() => {
                  const current = categories.find((category) => category.id === categoryId);
                  if (!current || !categoryName.trim()) return;
                  menuPost({ action: "category-rename", id: current.id, name: categoryName.trim() }).catch((err) => setError(err instanceof ApiError ? err.message : "Could not save"));
                }}
              />
            ) : null}
            {categories.length > 1 ? (
              <PillButton
                label={t.moveUp}
                tone="outline"
                onPress={() => {
                  if (!categoryId) return;
                  const ids = categories.map((category) => category.id);
                  const index = ids.indexOf(categoryId);
                  if (index <= 0) return;
                  const next = ids.slice();
                  const [picked] = next.splice(index, 1);
                  next.splice(index - 1, 0, picked);
                  menuPost({ action: "category-reorder", ids: next }).catch((err) => setError(err instanceof ApiError ? err.message : "Could not save"));
                }}
              />
            ) : null}
            {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
          </View>
        ) : null}
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
  onToggle,
  onOpen
}: {
  item: Product;
  grid: boolean;
  lang: string;
  rupee: string;
  onLabel: string;
  offLabel: string;
  busy: boolean;
  onToggle: () => void;
  onOpen: () => void;
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
  const body = !grid ? (
    <Card style={styles.listCard}>
      <ProductPhoto uri={uri} tall={false} />
      <View style={styles.listCopy}>
        <Text style={[styles.item, { color: palette.ink }, lang === "hi" && styles.hindi]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.note, { color: palette.muted }]}>{price}</Text>
      </View>
      {toggle}
    </Card>
  ) : (
    <Card style={styles.gridCard}>
      <ProductPhoto uri={uri} tall />
      <Text style={[styles.item, { color: palette.ink }, lang === "hi" && styles.hindi]} numberOfLines={2}>{item.name}</Text>
      <View style={styles.gridFoot}>
        <Text style={[styles.note, { color: palette.ink }]}>{price}</Text>
        {toggle}
      </View>
    </Card>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={onOpen}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { padding: 16, paddingBottom: 120 },
  header: { gap: 12, marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.display, fontSize: 28 },
  searchScroll: { flexGrow: 0 },
  searchContent: { flexGrow: 0 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
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

export default function MenuTab() {
  return (
    <Screen topInset={true}><MenuTabContent /></Screen>
  );
}
