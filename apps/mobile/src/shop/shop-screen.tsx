import type { ShopCartView, ShopProduct, ShopOrdersResponse, ShopOrderDetail } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Copy, ExternalLink,
  MapPin, Minus, Package, Plus, Receipt, ShoppingCart, Trash2, Truck, X
} from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import QRCode from "react-native-qrcode-svg";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View
} from "react-native";
import { apiData } from "../api/data";
import { ApiError } from "../api/http";
import { useI18n } from "../i18n";
import { accountKey } from "../query/keys";
import { useBusiness } from "../state/business";
import { useSession } from "../state/session";
import { pollPayment } from "./poll";
import { cartStepError, normalizeShopQuantity, validateShopAddress, type ShopAddressDraft } from "./cart-validation";
import { toggleUnbrandedSwitch, unbrandedQuoteDisplay } from "./totals";
import { ShopProductArt, type ShopArtKind } from "./product-art";
import { shopStepperState } from "./status-stepper";
import { fonts } from "../theme";
import { PrimaryButton, SecondaryButton } from "../ui/buttons";
import { useTheme } from "../ui/theme";
import type { Palette } from "../ui/tokens";

type CatalogResponse = { items: ShopProduct[] };
type CartLine = ShopCartView["lines"][number];
type ProductVariant = ShopProduct["variants"][number];
type OrderRow = ShopOrdersResponse["items"][number];
type ShopView = "catalogue" | "cart" | "orders";
type PickerOption = { label: string; value: string };
type PickerState = { title: string; options: PickerOption[]; selected: string | null | undefined; onSelect: (value: string) => void };
type NewAddress = ShopAddressDraft & { line2: string };
type Estimate = { ok: true; serviceable: boolean; etdDays: number | null; ratePaise: number | null; courierName: string | null; message: string };

const EMPTY_ADDRESS: NewAddress = { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };
const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

function money(paise: number) {
  const rupees = Math.abs(paise) / 100;
  return `${paise < 0 ? "−" : ""}₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(rupees)}`;
}

function offPercent(mrpPaise: number, salePaise: number) {
  return mrpPaise > salePaise && mrpPaise > 0 ? Math.round(((mrpPaise - salePaise) / mrpPaise) * 100) : 0;
}

function artKind(product: Pick<ShopProduct, "category" | "needsNfc" | "defaultTemplateId">): ShopArtKind {
  const template = (product.defaultTemplateId || "").toLowerCase();
  if (product.category === "card" || template === "cr80") return "card";
  if (product.category === "sticker" || template.includes("sticker") || template.startsWith("square-") || template.startsWith("round-")) return "sticker";
  if (product.category === "keychain" || template.includes("keychain")) return "keychain";
  if (template.includes("tent")) return "tent";
  return product.needsNfc ? "combo" : "stand";
}

function productName(product: Pick<ShopProduct, "name" | "nameHi">, lang: string) {
  return lang === "hi" && product.nameHi ? product.nameHi : product.name;
}

function statusLabel(status: string, t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: t.shopStatusPendingPayment,
    PAID: t.shopStagePaid,
    PROOF_SENT: t.shopStatusProofSent,
    CHANGES_REQUESTED: t.shopStatusChangesRequested,
    APPROVED: t.shopStageApproved,
    PRINTING: t.shopStagePrinting,
    NFC_WRITTEN: t.shopStatusNfcWritten,
    PACKED: t.shopStagePacked,
    PICKUP_SCHEDULED: t.shopStatusPickupScheduled,
    SHIPPED: t.shopStageShipped,
    DELIVERED: t.shopStageDelivered,
    CANCELLED: t.shopStatusCancelled,
    RTO: t.shopStatusRto,
    REPRINT: t.shopStatusReprint
  };
  return labels[status] || status;
}

function stageLabel(step: string, t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<string, string> = {
    paid: t.shopStagePaid,
    proof: t.shopStageProof,
    approved: t.shopStageApproved,
    printing: t.shopStagePrinting,
    packed: t.shopStagePacked,
    shipped: t.shopStageShipped,
    delivered: t.shopStageDelivered
  };
  return labels[step] || step;
}

function timelineLabel(label: string, t: ReturnType<typeof useI18n>["t"]) {
  const key = label.trim().toUpperCase().replace(/[\\s-]+/g, "_");
  const labels: Record<string, string> = {
    "ORDER_PLACED": t.shopOrderPlaced,
    "AWAITING_PAYMENT": t.shopStatusPendingPayment,
    "DESIGN_PROOF_SENT": t.shopStatusProofSent,
    "PROOF_SENT": t.shopStatusProofSent,
    "CHANGES_REQUESTED": t.shopStatusChangesRequested,
    "CUSTOMER_APPROVED": t.shopStageApproved,
    "APPROVED": t.shopStageApproved,
    "PRINTING": t.shopStagePrinting,
    "NFC_WRITTEN": t.shopStatusNfcWritten,
    "PACKED": t.shopStagePacked,
    "PICKUP_SCHEDULED": t.shopStatusPickupScheduled,
    "SHIPPED": t.shopStageShipped,
    "DELIVERED": t.shopStageDelivered,
    "CANCELLED": t.shopStatusCancelled,
    "RTO": t.shopStatusRto,
    "REPRINT": t.shopStatusReprint,
    "UPDATED": t.shopLatestEvent
  };
  return labels[key] || label;
}

function dateTime(value: string, lang: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function localizeShopMessage(message: string, lang: string, t: ReturnType<typeof useI18n>["t"]) {
  if (lang !== "hi") return message;
  const translations: Record<string, string> = {
    "Choose the business this item is printed for": t.shopDesignNeedsBusiness,
    "Choose a print template": t.shopDesignNeedsTemplate,
    "Choose a QR code": t.shopDesignNeedsQr,
    "Choose an NFC tag from your stock": t.shopDesignNeedsNfc,
    "Choose a saved address": t.shopChooseAddress,
    "Name is required": t.shopAddressNameRequired,
    "Phone must be a 10-digit Indian mobile number": t.shopAddressPhoneInvalid,
    "Address line is required": t.shopAddressLineRequired,
    "City is required": t.shopCityRequired,
    "State is required": t.shopStateRequired,
    "Pincode must be 6 digits": t.shopPincodeInvalid,
    "Add at least one item": t.shopEmptyCart,
    "Quantity is below the minimum order": t.shopErrorMinimumQty,
    "Not enough stock": t.shopErrorStock,
    "This item is not for sale": t.shopErrorItem,
    "That coupon cannot be used": t.shopErrorCoupon,
    "That referral code cannot be used": t.shopErrorReferral
  };
  return translations[message] || message;
}

function ShopImage({
  imageUrl, product, businessName, palette, size
}: {
  imageUrl: string | null;
  product: Pick<ShopProduct, "category" | "needsNfc" | "defaultTemplateId">;
  businessName: string;
  palette: Palette;
  size: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (imageUrl && imageUrl !== failedUrl) return <Image source={{ uri: imageUrl }} onError={() => setFailedUrl(imageUrl)} resizeMode="cover" style={{ width: size, height: size, backgroundColor: palette.surface2 }} />;
  return <ShopProductArt kind={artKind(product)} businessName={businessName} palette={palette} size={size} />;
}

function ShopStatusChip({ status, t, palette, lang }: { status: string; t: ReturnType<typeof useI18n>["t"]; palette: Palette; lang: string }) {
  const color = status === "DELIVERED" ? palette.success : ["CANCELLED", "RTO"].includes(status) ? palette.danger : palette.primary;
  return <View style={[styles.statusChip, { backgroundColor: `${color}18` }]}><Text style={[styles.statusChipText, { color }, lang === "hi" && styles.hindi]}>{statusLabel(status, t)}</Text></View>;
}

function QuantityStepper({ value, min, max, onChange, label, palette }: { value: number; min: number; max: number; onChange: (value: number) => void; label: string; palette: Palette }) {
  return (
    <View style={styles.quantityRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value - 1}`} accessibilityState={{ disabled: value <= min }} disabled={value <= min} onPress={() => onChange(value - 1)} style={[styles.stepperButton, { borderColor: palette.line, backgroundColor: palette.card }]}>
        <Minus size={18} color={palette.ink} />
      </Pressable>
      <Text accessibilityLabel={`${label} ${value}`} style={[styles.quantityValue, { color: palette.ink }]}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value + 1}`} accessibilityState={{ disabled: value >= max }} disabled={value >= max} onPress={() => onChange(value + 1)} style={[styles.stepperButton, { borderColor: palette.line, backgroundColor: palette.card }]}>
        <Plus size={18} color={palette.ink} />
      </Pressable>
    </View>
  );
}

function ChoiceSheet({ visible, title, options, selected, onSelect, onClose, palette, t, lang, reduceMotion }: {
  visible: boolean; title: string; options: PickerOption[]; selected?: string | null; onSelect: (value: string) => void;
  onClose: () => void; palette: Palette; t: ReturnType<typeof useI18n>["t"]; lang: string; reduceMotion: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? "none" : "slide"} onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.shopClose} onPress={onClose} style={[styles.modalScrim, { backgroundColor: palette.scrim }]} />
        <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t.shopClose} onPress={onClose} style={styles.iconButton}><X size={20} color={palette.ink} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
            {options.map((option) => (
              <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: option.value === selected }} onPress={() => { onSelect(option.value); onClose(); }} style={[styles.choiceRow, { borderBottomColor: palette.line }]}>
                <Text style={[styles.bodyText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{option.label}</Text>
                {option.value === selected ? <Check size={19} color={palette.primary} /> : null}
              </Pressable>
            ))}
            {options.length === 0 ? <Text style={[styles.bodyText, { color: palette.muted }]}>{t.shopEmptyList}</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ProductSheet({ product, businessName, qrPreviewUrl, palette, t, lang, reduceMotion, busy, preselectUnbranded, onClose, onAdd }: {
  product: ShopProduct | null; businessName: string; qrPreviewUrl: string | null; palette: Palette; t: ReturnType<typeof useI18n>["t"];
  lang: string; reduceMotion: boolean; busy: boolean; preselectUnbranded: boolean; onClose: () => void; onAdd: (variant: ProductVariant, qty: number, unbranded: boolean) => void;
}) {
  const [sku, setSku] = useState(product?.variants[0]?.sku || "");
  const variant = product?.variants.find((item) => item.sku === sku) || product?.variants[0];
  const [qty, setQty] = useState(product?.variants[0]?.minQty || 1);
  const [unbranded, setUnbranded] = useState(preselectUnbranded);
  if (!product || !variant) return null;
  const safeQty = normalizeShopQuantity(qty, variant.minQty, variant.stock);
  const description = lang === "hi" && product.descriptionHi ? product.descriptionHi : product.description;
  return (
    <Modal visible={!!product} transparent animationType={reduceMotion ? "none" : "slide"} onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.shopClose} onPress={onClose} style={[styles.modalScrim, { backgroundColor: palette.scrim }]} />
        <View style={[styles.sheet, styles.productSheet, { backgroundColor: palette.card, borderColor: palette.line }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{productName(product, lang)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t.shopClose} onPress={onClose} style={styles.iconButton}><X size={20} color={palette.ink} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
            <View style={[styles.largeProductImage, { backgroundColor: palette.surface2 }]}>
              <ShopImage imageUrl={variant.imageUrl || product.imageUrl} product={product} businessName={businessName} palette={palette} size={250} />
            </View>
            {product.variants.length > 1 ? <View style={styles.stackGap}>
              <Text style={[styles.labelText, { color: palette.ink }]}>{t.shopChoose}</Text>
              {product.variants.map((item) => (
                <Pressable key={item.sku} accessibilityRole="button" accessibilityState={{ selected: item.sku === variant.sku }} onPress={() => { setSku(item.sku); setQty(item.minQty); }} style={[styles.variantChoice, { borderColor: item.sku === variant.sku ? palette.primary : palette.line, backgroundColor: palette.surface }]}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.bodyStrong, { color: palette.ink }]}>{productName(item, lang)}</Text>
                    <Text style={[styles.bodyText, { color: palette.muted }]}>{money(item.salePaise)}{item.mrpPaise > item.salePaise ? `  ·  ${money(item.mrpPaise)}` : ""}</Text>
                  </View>
                  {offPercent(item.mrpPaise, item.salePaise) ? <Text style={[styles.discountText, { color: palette.success }]}>{t.shopOff.replace("{percent}", String(offPercent(item.mrpPaise, item.salePaise)))}</Text> : null}
                </Pressable>
              ))}
            </View> : null}
            <View style={styles.inlineBetween}>
              <View style={{ gap: 3 }}>
                <Text style={[styles.priceText, { color: palette.ink }]}>{money(variant.salePaise)}</Text>
                {variant.mrpPaise > variant.salePaise ? <Text style={[styles.crossedPrice, { color: palette.muted }]}>{money(variant.mrpPaise)}</Text> : null}
              </View>
              <QuantityStepper value={safeQty} min={variant.minQty} max={Math.max(variant.minQty, variant.stock)} onChange={(value) => setQty(normalizeShopQuantity(value, variant.minQty, variant.stock))} label={t.shopQty} palette={palette} />
            </View>
            <View style={styles.stackGap}>
              <Text style={[styles.labelText, { color: palette.ink }]}>{t.shopDescription}</Text>
              <Text style={[styles.bodyText, { color: palette.muted }, lang === "hi" && styles.hindi]}>{description || productName(product, lang)}</Text>
            </View>
            <View style={[styles.designPreview, { borderColor: palette.line, backgroundColor: palette.surface }]}>
              <Text style={[styles.labelText, { color: palette.ink }]}>{t.livePreview}</Text>
              <View style={[styles.previewPiece, { backgroundColor: palette.card, borderColor: palette.line }]}>
                <Text style={[styles.previewBusinessName, { color: palette.ink }]} numberOfLines={1}>{businessName || t.shopBusiness}</Text>
                {qrPreviewUrl ? <QRCode value={qrPreviewUrl} size={108} backgroundColor={palette.card} color={palette.ink} /> : <ShopProductArt kind={artKind(product)} businessName={businessName} palette={palette} size={112} />}
                <Text style={[styles.previewCaption, { color: palette.muted }]}>{qrPreviewUrl ? t.scanToReview : t.shopChooseQr}</Text>
              </View>
              {product.needsNfc ? <Text style={[styles.bodyText, { color: palette.primary }]}>{t.shopNfcIncluded}</Text> : null}
              {product.needsDesign ? <Text style={[styles.bodyText, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.shopDesignConfirm}</Text> : null}
            </View>
            {product.unbrandedAddonPaise > 0 ? <View style={styles.brandingPreviewWrap} accessibilityLabel={`${t.shopUnbrandedBefore}; ${t.shopUnbrandedAfter}`}>
              <Text style={[styles.labelText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopUnbrandedBadge}</Text>
              <Text style={[styles.caption, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.shopUnbrandedExplain}</Text>
              <View style={styles.brandingPreviewRow}>
                {[true, false].map((withMark) => <View key={String(withMark)} style={[styles.brandingMiniCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
                  <Text numberOfLines={1} style={[styles.caption, { color: palette.ink }]}>{businessName || t.shopBusiness}</Text>
                  <View style={[styles.brandingMiniQr, { borderColor: palette.ink }]}><View style={[styles.brandingMiniDot, { backgroundColor: palette.ink }]} /></View>
                  {withMark ? <Text style={[styles.brandingMark, { color: palette.muted }]}>QR24x7</Text> : <View style={{ height: 12 }} />}
                  <Text style={[styles.miniPreviewCaption, { color: palette.muted }]}>{withMark ? t.shopUnbrandedBefore : t.shopUnbrandedAfter}</Text>
                </View>)}
              </View>
              <Pressable accessibilityRole="switch" accessibilityLabel={`${t.shopUnbrandedSwitch} ${money(product.unbrandedAddonPaise)}`} accessibilityState={{ checked: unbranded }} onPress={() => setUnbranded(toggleUnbrandedSwitch)} style={[styles.brandingToggle, { borderColor: unbranded ? palette.primary : palette.line, backgroundColor: palette.surface }]}>
                <View style={{ flex: 1, gap: 3 }}><Text style={[styles.bodyStrong, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopUnbrandedSwitch} +{money(product.unbrandedAddonPaise)}</Text><Text style={[styles.caption, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.shopUnbrandedExplain}</Text></View>
                <View style={[styles.switchTrack, { backgroundColor: unbranded ? palette.primary : palette.line }]}><View style={[styles.switchKnob, { backgroundColor: palette.card, transform: [{ translateX: unbranded ? 18 : 0 }] }]} /></View>
              </Pressable>
            </View> : null}
          </ScrollView>
          <View style={[styles.sheetFooter, { borderTopColor: palette.line }]}>
            <PrimaryButton label={`${t.shopAdd} · ${money(variant.salePaise * safeQty + (unbranded ? product.unbrandedAddonPaise * safeQty : 0))}`} disabled={busy || variant.stock < safeQty} onPress={() => onAdd(variant, safeQty, unbranded)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ShopScreen() {
  const { t, lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const stylesByPalette = useMemo(() => makeStyles(palette), [palette]);
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const router = useRouter();
  const params = useLocalSearchParams<{ order?: string; unbranded?: string }>();
  const orderParam = typeof params.order === "string" ? params.order : "";
  const [selectedOrder, setSelectedOrder] = useState<{ key: string; id: string | null } | null>(null);
  const linkKey = orderParam;
  const openId = selectedOrder?.key === linkKey ? selectedOrder.id : orderParam || null;
  const [view, setView] = useState<ShopView>("catalogue");
  const [productSheet, setProductSheet] = useState<ShopProduct | null>(null);
  const [prefillUnbranded, setPrefillUnbranded] = useState(false);
  const promoOpened = useRef(false);
  const [addedSku, setAddedSku] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverCartError, setServerCartError] = useState<string | null>(null);
  const [cartEdit, setCartEdit] = useState<{ revision: number; data: ShopCartView } | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [newAddress, setNewAddress] = useState<NewAddress>(EMPTY_ADDRESS);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimateBusy, setEstimateBusy] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState("");
  const [reprintNote, setReprintNote] = useState("");
  const [reprintReason, setReprintReason] = useState<"damage" | "misprint">("damage");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const pollAbort = useRef<AbortController | null>(null);
  const live = useRef(true);
  const userId = user?.id ?? "";

  const catalog = useQuery<CatalogResponse>({
    queryKey: accountKey(userId, "shop-catalog"), enabled: !!user,
    queryFn: () => apiData<CatalogResponse>("/api/v1/shop/catalog")
  });
  useEffect(() => {
    if (params.unbranded !== "1" || promoOpened.current || !catalog.data?.items.length) return;
    const product = catalog.data.items.find((item) => item.unbrandedAddonPaise > 0);
    if (!product) return;
    const frame = requestAnimationFrame(() => {
      promoOpened.current = true;
      setPrefillUnbranded(true);
      setProductSheet(product);
    });
    return () => cancelAnimationFrame(frame);
  }, [params.unbranded, catalog.data]);
  const cartQuery = useQuery<ShopCartView>({
    queryKey: accountKey(userId, "shop-cart", business?.id), enabled: !!user,
    queryFn: () => apiData<ShopCartView>(`/api/v1/shop/cart${business?.id ? `?businessId=${encodeURIComponent(business.id)}` : ""}`)
  });
  const orders = useQuery<ShopOrdersResponse>({
    queryKey: accountKey(userId, "shop-orders"), enabled: !!user,
    queryFn: () => apiData<ShopOrdersResponse>("/api/v1/shop/orders")
  });
  const detail = useQuery<ShopOrderDetail>({
    queryKey: accountKey(userId, "shop-order", openId), enabled: !!user && !!openId,
    queryFn: () => apiData<ShopOrderDetail>(`/api/v1/shop/orders/${openId}`)
  });
  const cartDraft = cartEdit?.revision === cartQuery.dataUpdatedAt ? cartEdit.data : cartQuery.data ?? null;
  const refetchCatalog = catalog.refetch;
  const refetchCart = cartQuery.refetch;
  const refetchOrders = orders.refetch;
  const refetchDetail = detail.refetch;

  useEffect(() => {
    live.current = true;
    return () => { live.current = false; pollAbort.current?.abort(); };
  }, []);
  useFocusEffect(useCallback(() => {
    void refetchCatalog();
    void refetchCart();
    void refetchOrders();
    if (openId) void refetchDetail();
    return undefined;
  }, [refetchCatalog, refetchCart, refetchOrders, refetchDetail, openId]));

  const cartUnits = cartDraft?.lines.reduce((sum, line) => sum + line.qty, 0) ?? 0;
  const firstQr = cartDraft?.qrCodes[0]?.url ?? null;
  const currentView: ShopView = orderParam && view === "catalogue" ? "orders" : view;
  const activeOrder = (orders.data?.items ?? []).find((row) => !["DELIVERED", "CANCELLED"].includes(row.status));
  const refresh = useCallback(async () => {
    setCartEdit(null);
    await Promise.all([refetchCatalog(), refetchCart(), refetchOrders(), openId ? refetchDetail() : Promise.resolve()]);
  }, [refetchCatalog, refetchCart, refetchOrders, refetchDetail, openId]);

  function setOpenOrder(id: string | null) {
    setSelectedOrder({ key: linkKey, id });
    setError(null);
    if (!id) {
      setProofNote("");
      if (orderParam) router.replace("/(app)/shop");
    }
  }

  function setCart(patch: Partial<ShopCartView>) {
    setServerCartError(null);
    if (cartDraft) setCartEdit({ revision: cartQuery.dataUpdatedAt, data: { ...cartDraft, ...patch } });
  }

  function setCartDraft(next: ShopCartView) {
    setCartEdit({ revision: cartQuery.dataUpdatedAt, data: next });
  }

  async function addToCart(sku: string, qty: number, unbranded = false) {
    setBusySku(sku);
    setError(null);
    try {
      const next = await apiData<ShopCartView>("/api/v1/shop/cart/items", { method: "POST", body: JSON.stringify({ sku, qty, unbranded }) });
      client.setQueryData(accountKey(userId, "shop-cart", business?.id), next);
      setCartDraft(next);
      setAddedSku(sku);
      setTimeout(() => setAddedSku((current) => current === sku ? null : current), 1800);
    } catch (err) {
      setError(localizeShopMessage(err instanceof ApiError ? err.message : t.shopErrorAdd, lang, t));
    } finally {
      setBusySku(null);
    }
  }

  function cartPayload(cart: ShopCartView) {
    return {
      businessId: cart.businessId,
      couponCode: cart.couponCode,
      referralCode: cart.referralCode,
      buyerGstin: cart.buyerGstin,
      buyerLegalName: cart.buyerLegalName,
      addressId: effectiveAddressId(cart),
      lines: cart.lines.map((line) => ({ sku: line.sku, qty: line.qty, design: line.design, unbranded: line.unbranded }))
    };
  }

  function effectiveAddressId(cart: ShopCartView) {
    return cart.addressId || cart.addresses.find((address) => address.isDefault)?.id || cart.addresses[0]?.id || null;
  }

  async function persistCart(nextCart = cartDraft) {
    if (!nextCart) return null;
    setBusy(true);
    setServerCartError(null);
    try {
      const next = await apiData<ShopCartView>("/api/v1/shop/cart", { method: "PUT", body: JSON.stringify(cartPayload(nextCart)) });
      client.setQueryData(accountKey(userId, "shop-cart", business?.id), next);
      setCartDraft(next);
      return next;
    } catch (err) {
      const message = localizeShopMessage(err instanceof ApiError ? err.message : t.shopErrorSave, lang, t);
      setServerCartError(message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function chooseBusiness(id: string) {
    if (!cartDraft) return;
    const same = cartDraft.businessId === id;
    const nextCart: ShopCartView = {
      ...cartDraft,
      businessId: id || null,
      qrBusinessId: id || null,
      lines: same ? cartDraft.lines : cartDraft.lines.map((line) => ({ ...line, design: null }))
    };
    setCartDraft(nextCart);
    if (!same) await persistCart(nextCart);
  }

  async function saveCart() {
    const next = await persistCart();
    if (next) setView("cart");
  }

  function changeLine(index: number, changes: Partial<CartLine>) {
    if (!cartDraft) return;
    const lines = cartDraft.lines.slice();
    lines[index] = { ...lines[index], ...changes };
    setCart({ lines });
  }

  function selectDesign(index: number, key: "templateId" | "qrShortCode" | "deviceId", value: string) {
    if (!cartDraft) return;
    const line = cartDraft.lines[index];
    if (!cartDraft.businessId) {
      setServerCartError(t.shopDesignNeedsBusiness);
      return;
    }
    const design = line.design || {
      templateId: line.needsDesign ? "" : "nfc",
      businessId: cartDraft.businessId,
      qrShortCode: null,
      deviceId: null
    };
    const nextDesign = { ...design, businessId: cartDraft.businessId, [key]: value || null };
    changeLine(index, { design: nextDesign });
  }

  function openPicker(title: string, options: PickerOption[], selected: string | null | undefined, onSelect: (value: string) => void) {
    setPicker({ title, options, selected, onSelect });
  }

  async function addAddress() {
    const problem = validateShopAddress(newAddress);
    if (problem) {
      const messages: Record<typeof problem, string> = {
        name: t.shopAddressNameRequired, phone: t.shopAddressPhoneInvalid, line1: t.shopAddressLineRequired,
        city: t.shopCityRequired, state: t.shopStateRequired, pincode: t.shopPincodeInvalid
      };
      setAddressError(messages[problem]);
      return;
    }
    setAddressError(null);
    setBusy(true);
    try {
      const created = await apiData<{ id: string; name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; label: string | null; isDefault: boolean }>("/api/v1/shop/addresses", {
        method: "POST", body: JSON.stringify({ ...newAddress, isDefault: true })
      });
      setNewAddress(EMPTY_ADDRESS);
      setAddressOpen(false);
      setEstimate(null);
      const refreshed = await apiData<ShopCartView>(`/api/v1/shop/cart${business?.id ? `?businessId=${encodeURIComponent(business.id)}` : ""}`);
      refreshed.addressId = created.id;
      client.setQueryData(accountKey(userId, "shop-cart", business?.id), refreshed);
      setCartDraft(refreshed);
      await persistCart(refreshed);
    } catch (err) {
      setAddressError(localizeShopMessage(err instanceof ApiError ? err.message : t.shopErrorAddress, lang, t));
    } finally {
      setBusy(false);
    }
  }

  async function checkEstimate(pincode: string) {
    if (!/^\d{6}$/.test(pincode)) {
      setEstimateError(t.shopPincodeInvalid);
      setEstimate(null);
      return;
    }
    const weightGrams = (cartDraft?.lines ?? []).reduce((sum, line) => sum + (line.ships ? line.weightGrams * line.qty : 0), 0);
    setEstimateBusy(true);
    setEstimateError(null);
    try {
      const next = await apiData<Estimate>("/api/v1/shop/estimate", { method: "POST", body: JSON.stringify({ pincode, weightGrams }) });
      setEstimate(next);
    } catch (err) {
      setEstimateError(localizeShopMessage(err instanceof ApiError ? err.message : t.shopErrorDelivery, lang, t));
    } finally {
      setEstimateBusy(false);
    }
  }

  async function payNow() {
    if (!cartDraft || pendingOrderId) return;
    const next = await persistCart();
    if (!next) return;
    const issue = cartStepError({
      lines: next.lines.map((line) => ({ qty: line.qty, minQty: line.minQty, stock: line.stock, active: line.active, designError: line.designError })),
      needsShipping: next.lines.some((line) => line.ships), addressId: effectiveAddressId(next), quote: next.quote
    });
    if (issue) {
      setServerCartError(localizeShopMessage(issue, lang, t));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const checkout = await apiData<{ orderId: string; paid: boolean; checkoutUrl: string | null }>("/api/v1/shop/checkout", { method: "POST" });
      setPendingOrderId(checkout.orderId);
      if (checkout.checkoutUrl) await WebBrowser.openBrowserAsync(checkout.checkoutUrl).catch(() => undefined);
      pollAbort.current?.abort();
      const controller = new AbortController();
      pollAbort.current = controller;
      const outcome = checkout.paid ? "paid" : await pollPayment({
        orderId: checkout.orderId,
        signal: controller.signal,
        fetchOrder: (id) => apiData<ShopOrderDetail>(`/api/v1/shop/orders/${id}`),
        sleep: (ms) => new Promise<void>((resolve, reject) => {
          if (controller.signal.aborted) { reject(new Error("aborted")); return; }
          const timer = setTimeout(() => { controller.signal.removeEventListener("abort", onAbort); resolve(); }, ms);
          const onAbort = () => { clearTimeout(timer); reject(new Error("aborted")); };
          controller.signal.addEventListener("abort", onAbort, { once: true });
        })
      });
      if (!live.current || outcome === "stopped") return;
      setOpenOrder(checkout.orderId);
      setView("orders");
      await Promise.all([client.invalidateQueries({ queryKey: accountKey(userId, "shop-orders") }), client.invalidateQueries({ queryKey: accountKey(userId, "shop-cart", business?.id) })]);
      if (outcome === "pending") setError(t.paymentPending);
      else setPendingOrderId(null);
    } catch (err) {
      if (live.current) setError(localizeShopMessage(err instanceof ApiError ? err.message : t.shopErrorPayment, lang, t));
    } finally {
      if (live.current) setBusy(false);
    }
  }

  async function orderAction(path: string, body: object, success?: () => void) {
    if (!openId) return;
    setError(null);
    setBusy(true);
    try {
      await apiData(`/api/v1/shop/orders/${openId}/${path}`, { method: "POST", body: JSON.stringify(body) });
      success?.();
      await Promise.all([detail.refetch(), orders.refetch()]);
    } catch (err) {
      setError(localizeShopMessage(err instanceof ApiError ? err.message : t.shopErrorOrder, lang, t));
    } finally {
      setBusy(false);
    }
  }

  async function openExternal(url: string) {
    await WebBrowser.openBrowserAsync(url).catch(() => undefined);
  }

  const scrollRefresh = <RefreshControl refreshing={catalog.isRefetching || cartQuery.isRefetching || orders.isRefetching || detail.isRefetching} onRefresh={() => { void refresh(); }} tintColor={palette.primary} />;
  const selectedAddress = cartDraft?.addresses.find((address) => address.id === effectiveAddressId(cartDraft)) || null;
  const unbrandedQuote = cartDraft?.quote.ok ? unbrandedQuoteDisplay(cartDraft.quote.lines, t.shopUnbranded) : null;

  return (
    <View style={[stylesByPalette.screen, { backgroundColor: palette.paper }]}>
      <View style={stylesByPalette.header}>
        {openId ? <Pressable accessibilityRole="button" accessibilityLabel={t.shopBack} onPress={() => setOpenOrder(null)} style={styles.iconButton}><ArrowLeft size={22} color={palette.ink} /></Pressable> : null}
        <Text style={[stylesByPalette.headerTitle, lang === "hi" && styles.hindi]}>{openId ? t.shopOrderNumber : currentView === "cart" ? t.cart : currentView === "orders" ? t.shopMyOrders : t.shop}</Text>
        {!openId ? <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.shopMyOrders} onPress={() => { setView("orders"); setError(null); }} style={[styles.headerTextButton, { borderColor: palette.line }]}>
            <Text style={[styles.headerText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopMyOrders}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${t.cart}, ${cartUnits}`} onPress={() => { setView("cart"); setError(null); }} style={[styles.headerCartButton, { backgroundColor: palette.primaryDeep }]}>
            <ShoppingCart size={20} color={palette.onPrimary} />
            <Text style={[styles.cartBadgeText, { color: palette.onPrimary }]}>{cartUnits}</Text>
          </Pressable>
        </View> : null}
        {openId ? <View style={{ flex: 1 }} /> : null}
      </View>

      {!openId && currentView === "catalogue" ? (
        <ScrollView contentContainerStyle={stylesByPalette.content} refreshControl={scrollRefresh}>
          {activeOrder ? <Pressable accessibilityRole="button" accessibilityLabel={`${t.shopActiveOrder}, ${statusLabel(activeOrder.status, t)}`} onPress={() => setOpenOrder(activeOrder.id)} style={[stylesByPalette.activeOrderCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
            {activeOrder.lines[0]?.imageUrl ? <Image source={{ uri: activeOrder.lines[0].imageUrl }} style={styles.activeThumb} /> : <ShopProductArt kind="stand" businessName={business?.name || "QR24x7"} palette={palette} size={56} />}
            <View style={styles.activeOrderInfo}>
              <Text style={[styles.bodyStrong, { color: palette.ink }, lang === "hi" && styles.hindi]}>{activeOrder.lines[0]?.name || t.shopOrderNumber}</Text>
              <ShopStatusChip status={activeOrder.status} t={t} palette={palette} lang={lang} />
              <Text style={[styles.caption, { color: palette.muted }]}>{activeOrder.shipment?.awb ? `${t.shopAwb}: ${activeOrder.shipment.awb}` : activeOrder.shipment?.etaDays != null ? t.shopEtaDays.replace("{days}", String(activeOrder.shipment.etaDays)) : t.shopDeliveryPending}</Text>
            </View>
            <ChevronRight size={20} color={palette.ink} />
          </Pressable> : null}
          {error ? <InlineMessage message={error} palette={palette} /> : null}
          {catalog.isLoading ? <View style={styles.loadingStack}><View style={[styles.skeleton, { backgroundColor: palette.card }]} /><View style={[styles.skeleton, { backgroundColor: palette.card }]} /></View> : null}
          {catalog.isError ? <InlineMessage message={t.loadError} palette={palette} action={t.retry} onAction={() => void catalog.refetch()} /> : null}
          {!catalog.isLoading && !catalog.isError && !catalog.data?.items.length ? <Text style={[styles.bodyText, { color: palette.muted }]}>{t.shopEmptyCatalog}</Text> : null}
          <View style={styles.productGrid}>
            {(catalog.data?.items ?? []).map((product) => <ProductCard key={product.slug} product={product} businessName={business?.name || "QR24x7"} palette={palette} t={t} lang={lang} busy={busySku === product.variants[0]?.sku} added={addedSku === product.variants[0]?.sku} onOpen={() => setProductSheet(product)} onAdd={() => {
              const first = product.variants[0];
              if (first) void addToCart(first.sku, Math.max(1, first.minQty));
            }} />)}
          </View>
        </ScrollView>
      ) : null}

      {!openId && currentView === "cart" ? <ScrollView contentContainerStyle={stylesByPalette.content} keyboardShouldPersistTaps="handled" refreshControl={scrollRefresh}>
        <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopItems}</Text>
        {!cartDraft && cartQuery.isLoading ? <View style={[styles.skeleton, { backgroundColor: palette.card }]} /> : null}
        {cartDraft?.lines.length === 0 ? <View style={[stylesByPalette.panel, { backgroundColor: palette.card }]}><Text style={[styles.bodyText, { color: palette.muted }]}>{t.shopEmptyCart}</Text><SecondaryButton label={t.catalogue} onPress={() => setView("catalogue")} /></View> : null}
      {cartDraft?.lines.map((line, index) => <CartLineCard key={`${line.sku}-${index}`} line={line} index={index} cart={cartDraft} palette={palette} t={t} lang={lang} onQty={(qty) => changeLine(index, { qty: normalizeShopQuantity(qty, line.minQty, line.stock) })} onRemove={() => setCart({ lines: cartDraft.lines.filter((_, lineIndex) => lineIndex !== index) })} onToggleUnbranded={() => changeLine(index, { unbranded: !line.unbranded })} onPickBusiness={(title, options, selected) => openPicker(title, options, selected, (value) => { void chooseBusiness(value); })} onPick={(title, options, selected, key) => openPicker(title, options, selected, (value) => selectDesign(index, key, value))} />)}
        {cartDraft?.lines.length ? <>
          <View style={[stylesByPalette.panel, { backgroundColor: palette.card, borderColor: palette.line }]}>
            <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopBusiness}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t.shopChooseBusiness} onPress={() => openPicker(t.shopChooseBusiness, cartDraft.businesses.map((row) => ({ label: row.name, value: row.id })), cartDraft.businessId, (value) => { void chooseBusiness(value); })} style={[styles.selectButton, { borderColor: palette.line, backgroundColor: palette.surface }]}>
              <Text style={[styles.bodyText, { color: cartDraft.businessId ? palette.ink : palette.muted }]}>{cartDraft.businesses.find((row) => row.id === cartDraft.businessId)?.name || t.shopChooseBusiness}</Text><ChevronDown size={19} color={palette.ink} />
            </Pressable>
            {cartDraft.businesses.length === 0 ? <Text style={[styles.caption, { color: palette.danger }]}>{t.shopDesignNeedsBusiness}</Text> : null}
          </View>

          <View style={[stylesByPalette.panel, { backgroundColor: palette.card, borderColor: palette.line }]}>
            <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopDelivery}</Text>
            {cartDraft.addresses.map((address) => <Pressable key={address.id} accessibilityRole="button" accessibilityState={{ selected: effectiveAddressId(cartDraft) === address.id }} onPress={() => { setCart({ addressId: address.id }); setEstimate(null); void checkEstimate(address.pincode); }} style={[styles.addressCard, { borderColor: effectiveAddressId(cartDraft) === address.id ? palette.primary : palette.line, backgroundColor: palette.surface }]}>
              <View style={styles.inlineBetween}>
                <Text style={[styles.bodyStrong, { color: palette.ink }]}>{address.name} · {address.phone}</Text>
                {effectiveAddressId(cartDraft) === address.id ? <CheckCircle2 size={20} color={palette.primary} /> : null}
              </View>
              <Text style={[styles.bodyText, { color: palette.muted }]}>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</Text>
              <Text style={[styles.bodyText, { color: palette.muted }]}>{address.city}, {address.state} {address.pincode}</Text>
              {address.isDefault ? <Text style={[styles.caption, { color: palette.primary }]}>{t.shopIncluded}</Text> : null}
            </Pressable>)}
            <SecondaryButton label={t.shopAddAddress} onPress={() => { setAddressError(null); setAddressOpen(true); }} />
            {selectedAddress ? <View style={styles.stackGap}>
              <SecondaryButton label={estimateBusy ? t.shopCheckingDelivery : t.shopEstimateDelivery} disabled={estimateBusy} onPress={() => void checkEstimate(selectedAddress.pincode)} />
              {estimate ? <Text style={[styles.bodyText, { color: estimate.serviceable ? palette.success : palette.danger }]}>{estimate.serviceable ? (estimate.etdDays == null ? t.shopServiceable : t.shopEtaDays.replace("{days}", String(estimate.etdDays))) : t.shopNotServiceable}</Text> : null}
              {estimateError ? <Text style={[styles.caption, { color: palette.danger }]}>{estimateError}</Text> : null}
            </View> : null}
          </View>

          <View style={[stylesByPalette.panel, { backgroundColor: palette.card, borderColor: palette.line }]}>
            <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopOffersInvoice}</Text>
            <ShopField label={t.shopCoupon} value={cartDraft.couponCode || ""} onChangeText={(value) => setCart({ couponCode: value })} palette={palette} />
            {cartDraft.quote.ok && cartDraft.quote.couponRejected ? <Text style={[styles.caption, { color: palette.danger }]}>{t.shopCouponRejected}</Text> : null}
            <ShopField label={t.shopReferral} value={cartDraft.referralCode || ""} onChangeText={(value) => setCart({ referralCode: value })} palette={palette} />
            {cartDraft.quote.ok && cartDraft.quote.referralRejected ? <Text style={[styles.caption, { color: palette.danger }]}>{t.shopReferralRejected}</Text> : null}
            <ShopField label={t.shopGstin} value={cartDraft.buyerGstin || ""} autoCapitalize="characters" onChangeText={(value) => setCart({ buyerGstin: value })} palette={palette} />
            <ShopField label={t.shopLegalName} value={cartDraft.buyerLegalName || ""} onChangeText={(value) => setCart({ buyerLegalName: value })} palette={palette} />
          </View>

          <View style={[stylesByPalette.panel, { backgroundColor: palette.card, borderColor: palette.line }]}>
            <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopSummary}</Text>
            {cartDraft.quote.ok ? <>
              {unbrandedQuote ? <SummaryRow label={unbrandedQuote.label} amount={unbrandedQuote.amountPaise} palette={palette} /> : null}
              <SummaryRow label={t.shopSubtotal} amount={cartDraft.quote.subtotalPaise} palette={palette} />
              <SummaryRow label={t.shopDiscount} amount={-cartDraft.quote.discountPaise} palette={palette} />
              <SummaryRow label={t.shopTaxable} amount={cartDraft.quote.taxablePaise} palette={palette} />
              <SummaryRow label={t.shopCgst} amount={cartDraft.quote.cgstPaise} palette={palette} />
              <SummaryRow label={t.shopSgst} amount={cartDraft.quote.sgstPaise} palette={palette} />
              <SummaryRow label={t.shopIgst} amount={cartDraft.quote.igstPaise} palette={palette} />
              <SummaryRow label={t.shopShipping} amount={cartDraft.quote.shippingPaise} palette={palette} />
              <View style={[styles.divider, { backgroundColor: palette.line }]} />
              <SummaryRow label={t.shopTotal} amount={cartDraft.quote.totalPaise} palette={palette} strong />
            </> : <Text style={[styles.bodyText, { color: palette.danger }]}>{cartDraft.quote.error}</Text>}
            <Text style={[styles.caption, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.shopPrepaid}</Text>
            <Text style={[styles.caption, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.shopReturnPolicy}</Text>
            {serverCartError ? <InlineMessage message={serverCartError} palette={palette} /> : null}
            {error ? <InlineMessage message={error} palette={palette} /> : null}
            <SecondaryButton label={t.shopSaveCart} disabled={busy} onPress={() => void saveCart()} />
            <PrimaryButton label={busy ? t.hintWait : t.shopPayNow} disabled={busy || !cartDraft.lines.length || !!pendingOrderId} onPress={() => void payNow()} />
          </View>
        </> : null}
      </ScrollView> : null}

      {!openId && currentView === "orders" ? <ScrollView contentContainerStyle={stylesByPalette.content} refreshControl={scrollRefresh}>
        {orders.isLoading ? <View style={[styles.skeleton, { backgroundColor: palette.card }]} /> : null}
        {orders.isError ? <InlineMessage message={t.loadError} palette={palette} action={t.retry} onAction={() => void orders.refetch()} /> : null}
        {!orders.isLoading && !orders.isError && !orders.data?.items.length ? <View style={[stylesByPalette.panel, { backgroundColor: palette.card }]}>
          <Package size={32} color={palette.muted} />
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.shopEmptyOrders}</Text>
          <Text style={[styles.bodyText, { color: palette.muted }]}>{t.shopEmptyOrdersBody}</Text>
          <SecondaryButton label={t.catalogue} onPress={() => setView("catalogue")} />
        </View> : null}
        {(orders.data?.items ?? []).map((order) => <OrderListCard key={order.id} order={order} palette={palette} t={t} lang={lang} businessName={business?.name || "QR24x7"} onPress={() => setOpenOrder(order.id)} />)}
      </ScrollView> : null}

      {openId ? <ScrollView contentContainerStyle={stylesByPalette.content} refreshControl={scrollRefresh}>
        {detail.isLoading ? <View style={[styles.skeleton, { backgroundColor: palette.card }]} /> : null}
        {detail.isError ? <InlineMessage message={t.loadError} palette={palette} action={t.retry} onAction={() => void detail.refetch()} /> : null}
        {detail.data ? <OrderDetailView detail={detail.data} palette={palette} t={t} lang={lang} busy={busy} proofNote={proofNote} setProofNote={setProofNote} reprintNote={reprintNote} setReprintNote={setReprintNote} reprintReason={reprintReason} setReprintReason={setReprintReason} picker={openPicker} onAction={orderAction} onOpenExternal={openExternal} onHelp={() => router.push("/(app)/help")} onCopyAwb={async (awb) => { await Clipboard.setStringAsync(awb); }} /> : null}
        {error ? <InlineMessage message={error} palette={palette} /> : null}
      </ScrollView> : null}

      <ProductSheet key={productSheet?.slug || "closed"} product={productSheet} businessName={business?.name || "QR24x7"} qrPreviewUrl={firstQr} palette={palette} t={t} lang={lang} reduceMotion={reduceMotion} busy={!!busySku} preselectUnbranded={prefillUnbranded} onClose={() => { setProductSheet(null); setPrefillUnbranded(false); }} onAdd={(variant, qty, unbranded) => {
        setProductSheet(null);
        setPrefillUnbranded(false);
        void addToCart(variant.sku, qty, unbranded);
      }} />

      <ChoiceSheet visible={!!picker} title={picker?.title || ""} options={picker?.options || []} selected={picker?.selected} onSelect={(value) => picker?.onSelect(value)} onClose={() => setPicker(null)} palette={palette} t={t} lang={lang} reduceMotion={reduceMotion} />

      <Modal visible={addressOpen} transparent animationType={reduceMotion ? "none" : "slide"} onRequestClose={() => setAddressOpen(false)}>
        <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.shopClose} onPress={() => setAddressOpen(false)} style={[styles.modalScrim, { backgroundColor: palette.scrim }]} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
            <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line }]}>
              <View style={styles.sheetHeader}><Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopAddAddress}</Text><Pressable accessibilityRole="button" accessibilityLabel={t.shopClose} onPress={() => setAddressOpen(false)} style={styles.iconButton}><X size={20} color={palette.ink} /></Pressable></View>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formBody}>
                <ShopField label={t.name} value={newAddress.name} onChangeText={(value) => setNewAddress({ ...newAddress, name: value })} palette={palette} />
                <ShopField label={t.phone} value={newAddress.phone} keyboardType="phone-pad" onChangeText={(value) => setNewAddress({ ...newAddress, phone: value })} palette={palette} />
                <ShopField label={t.shopLine1} value={newAddress.line1} onChangeText={(value) => setNewAddress({ ...newAddress, line1: value })} palette={palette} />
                <ShopField label={t.shopLine2} value={newAddress.line2} onChangeText={(value) => setNewAddress({ ...newAddress, line2: value })} palette={palette} />
                <ShopField label={t.city} value={newAddress.city} onChangeText={(value) => setNewAddress({ ...newAddress, city: value })} palette={palette} />
                <Pressable accessibilityRole="button" accessibilityLabel={t.shopSelectState} onPress={() => openPicker(t.shopSelectState, STATES.map((state) => ({ label: state, value: state })), newAddress.state, (value) => setNewAddress((current) => ({ ...current, state: value })))} style={[styles.selectButton, { borderColor: palette.line, backgroundColor: palette.surface }]}><Text style={[styles.bodyText, { color: newAddress.state ? palette.ink : palette.muted }]}>{newAddress.state || t.shopSelectState}</Text><ChevronDown size={19} color={palette.ink} /></Pressable>
                <ShopField label={t.pincode} value={newAddress.pincode} keyboardType="number-pad" maxLength={6} onChangeText={(value) => { setNewAddress({ ...newAddress, pincode: value.replace(/\D/g, "") }); setEstimate(null); }} palette={palette} />
                <SecondaryButton label={estimateBusy ? t.shopCheckingDelivery : t.shopEstimateDelivery} disabled={estimateBusy} onPress={() => void checkEstimate(newAddress.pincode)} />
                {estimate ? <Text style={[styles.bodyText, { color: estimate.serviceable ? palette.success : palette.danger }]}>{estimate.serviceable ? (estimate.etdDays == null ? t.shopServiceable : t.shopEtaDays.replace("{days}", String(estimate.etdDays))) : t.shopNotServiceable}</Text> : null}
                {estimateError ? <InlineMessage message={estimateError} palette={palette} /> : null}
                {addressError ? <InlineMessage message={addressError} palette={palette} /> : null}
                <PrimaryButton label={busy ? t.hintWait : t.shopAddAddress} disabled={busy} onPress={() => void addAddress()} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function ProductCard({ product, businessName, palette, t, lang, busy, added, onOpen, onAdd }: {
  product: ShopProduct; businessName: string; palette: Palette; t: ReturnType<typeof useI18n>["t"]; lang: string;
  busy: boolean; added: boolean; onOpen: () => void; onAdd: () => void;
}) {
  const first = product.variants[0];
  if (!first) return null;
  const many = product.variants.length > 1;
  const discount = offPercent(first.mrpPaise, first.salePaise);
  return (
    <View style={[styles.productCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={productName(product, lang)} onPress={onOpen} style={styles.productImagePress}>
        <View style={[styles.productImage, { backgroundColor: palette.surface2 }]}>
          <ShopImage imageUrl={product.imageUrl} product={product} businessName={businessName} palette={palette} size={156} />
          {discount ? <View style={[styles.discountBadge, { backgroundColor: palette.success }]}><Text style={[styles.discountBadgeText, { color: palette.onPrimary }]}>{t.shopOff.replace("{percent}", String(discount))}</Text></View> : null}
          {product.unbrandedAddonPaise > 0 ? <View style={[styles.unbrandedPill, { backgroundColor: palette.card }]}><Text style={[styles.unbrandedPillText, { color: palette.ink }]}>{t.shopUnbrandedBadge}</Text></View> : null}
        </View>
      </Pressable>
      <View style={styles.productCardBody}>
        <Text numberOfLines={2} style={[styles.productName, { color: palette.ink }, lang === "hi" && styles.hindi]}>{productName(product, lang)}</Text>
        {product.needsNfc ? <Text style={[styles.nfcTag, { color: palette.primary }]}>{t.shopNfcIncluded}</Text> : <View style={{ height: 19 }} />}
        <View style={styles.priceLine}><Text style={[styles.cardPrice, { color: palette.ink }]}>{money(first.salePaise)}</Text>{first.mrpPaise > first.salePaise ? <Text style={[styles.crossedPrice, { color: palette.muted }]}>{money(first.mrpPaise)}</Text> : null}</View>
        <Pressable accessibilityRole="button" accessibilityLabel={many ? t.shopChoose : added ? t.shopAdded : t.shopAdd} onPress={many ? onOpen : onAdd} disabled={busy} style={[styles.productAction, { backgroundColor: palette.primaryDeep }]}>
          <Text style={[styles.productActionText, { color: palette.onPrimary }, lang === "hi" && styles.hindi]}>{many ? t.shopChoose : added ? t.shopAdded : busy ? t.hintWait : t.shopAdd}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CartLineCard({ line, index, cart, palette, t, lang, onQty, onRemove, onToggleUnbranded, onPickBusiness, onPick }: {
  line: CartLine; index: number; cart: ShopCartView; palette: Palette; t: ReturnType<typeof useI18n>["t"]; lang: string;
  onQty: (qty: number) => void; onRemove: () => void;
  onToggleUnbranded: () => void;
  onPickBusiness: (title: string, options: PickerOption[], selected: string | null | undefined) => void;
  onPick: (title: string, options: PickerOption[], selected: string | null | undefined, key: "templateId" | "qrShortCode" | "deviceId") => void;
}) {
  const designError = line.needsDesign || line.needsNfc
    ? !cart.businessId ? t.shopDesignNeedsBusiness
      : line.needsDesign && !line.design?.templateId ? t.shopDesignNeedsTemplate
        : line.needsDesign && !line.design?.qrShortCode ? t.shopDesignNeedsQr
          : line.needsNfc && !line.design?.deviceId ? t.shopDesignNeedsNfc
            : null
    : line.designError;
  return (
    <View style={[styles.cartLine, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <View style={styles.lineHeader}>
        {line.imageUrl ? <Image source={{ uri: line.imageUrl }} style={styles.cartThumb} /> : <View style={styles.cartThumb}><ShopProductArt kind="stand" businessName={cart.businesses.find((item) => item.id === cart.businessId)?.name || "QR24x7"} palette={palette} size={54} /></View>}
        <View style={{ flex: 1, gap: 4 }}><Text style={[styles.bodyStrong, { color: palette.ink }, lang === "hi" && styles.hindi]}>{line.nameHi && lang === "hi" ? line.nameHi : line.name}</Text><Text style={[styles.caption, { color: palette.muted }]}>{money(line.unitPaise)}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t.shopRemove} ${line.name}`} onPress={onRemove} style={styles.iconButton}><Trash2 size={19} color={palette.danger} /></Pressable>
      </View>
      <View style={styles.inlineBetween}>
        <Text style={[styles.labelText, { color: palette.ink }]}>{t.shopQty}</Text>
        <QuantityStepper value={line.qty} min={line.minQty} max={Math.max(line.minQty, line.stock)} onChange={onQty} label={t.shopQty} palette={palette} />
      </View>
      {line.unbrandedUnitPaise > 0 ? <Pressable accessibilityRole="switch" accessibilityLabel={`${t.shopUnbrandedSwitch} ${money(line.unbrandedUnitPaise)}`} accessibilityState={{ checked: line.unbranded }} onPress={onToggleUnbranded} style={[styles.brandingToggle, { borderColor: line.unbranded ? palette.primary : palette.line, backgroundColor: palette.surface }]}>
        <View style={{ flex: 1, gap: 3 }}><Text style={[styles.bodyStrong, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopUnbrandedSwitch} +{money(line.unbrandedUnitPaise)} × {line.qty}</Text><Text style={[styles.caption, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.shopUnbrandedExplain}</Text></View>
        <View style={[styles.switchTrack, { backgroundColor: line.unbranded ? palette.primary : palette.line }]}><View style={[styles.switchKnob, { backgroundColor: palette.card, transform: [{ translateX: line.unbranded ? 18 : 0 }] }]} /></View>
      </Pressable> : null}
      {line.needsDesign || line.needsNfc ? <View style={styles.designFields}>
        {designError ? <Text style={[styles.inlineError, { color: palette.danger }]}>{localizeShopMessage(designError, lang, t)}</Text> : null}
        <ChoiceField title={t.shopBusiness} value={cart.businesses.find((item) => item.id === cart.businessId)?.name || t.shopChooseBusiness} palette={palette} onPress={() => onPickBusiness(t.shopChooseBusiness, cart.businesses.map((row) => ({ label: row.name, value: row.id })), cart.businessId)} />
        {line.needsDesign ? <ChoiceField title={t.shopTemplate} value={cart.templates.find((item) => item.id === line.design?.templateId)?.name || t.shopChooseTemplate} palette={palette} disabled={!cart.businessId} onPress={() => onPick(t.shopTemplate, cart.templates.map((row) => ({ label: row.name, value: row.id })), line.design?.templateId, "templateId")} /> : null}
        {line.needsDesign ? <ChoiceField title={t.shopQrCode} value={cart.qrCodes.find((item) => item.shortCode === line.design?.qrShortCode)?.label || line.design?.qrShortCode || t.shopChooseQr} palette={palette} disabled={!cart.businessId} onPress={() => onPick(t.shopQrCode, cart.qrCodes.map((row) => ({ label: row.label || row.shortCode, value: row.shortCode })), line.design?.qrShortCode, "qrShortCode")} /> : null}
        {line.needsNfc ? <ChoiceField title={t.shopNfcTag} value={cart.devices.find((item) => item.id === line.design?.deviceId)?.kind || t.shopChooseNfc} palette={palette} disabled={!cart.businessId} onPress={() => onPick(t.shopNfcTag, cart.devices.map((row) => ({ label: `${row.kind}${row.chipUid ? ` · ${row.chipUid}` : ""}`, value: row.id })), line.design?.deviceId, "deviceId")} /> : null}
      </View> : null}
    </View>
  );
}

function ChoiceField({ title, value, palette, onPress, disabled }: { title: string; value: string; palette: Palette; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${value}`} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.selectButton, { borderColor: palette.line, backgroundColor: palette.surface, opacity: disabled ? 0.55 : 1 }]}>
    <View style={{ flex: 1, gap: 3 }}><Text style={[styles.caption, { color: palette.muted }]}>{title}</Text><Text numberOfLines={1} style={[styles.bodyText, { color: palette.ink }]}>{value}</Text></View><ChevronDown size={18} color={palette.ink} />
  </Pressable>;
}

function ShopField({ label, value, onChangeText, palette, ...props }: { label: string; value: string; onChangeText: (value: string) => void; palette: Palette } & Omit<React.ComponentProps<typeof TextInput>, "value" | "onChangeText" | "style">) {
  return <View style={styles.fieldGroup}>
    <Text style={[styles.labelText, { color: palette.ink }]}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholderTextColor={palette.muted} style={[styles.textInput, { borderColor: palette.line, color: palette.ink, backgroundColor: palette.surface }]} {...props} />
  </View>;
}

function SummaryRow({ label, amount, palette, strong }: { label: string; amount: number; palette: Palette; strong?: boolean }) {
  return <View style={styles.summaryRow}><Text style={[strong ? styles.bodyStrong : styles.bodyText, { color: palette.ink }]}>{label}</Text><Text style={[strong ? styles.bodyStrong : styles.bodyText, { color: palette.ink }]}>{money(amount)}</Text></View>;
}

function OrderListCard({ order, palette, t, lang, businessName, onPress }: { order: OrderRow; palette: Palette; t: ReturnType<typeof useI18n>["t"]; lang: string; businessName: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${t.shopOrderNumber} ${order.id.slice(-8)}, ${statusLabel(order.status, t)}`} onPress={onPress} style={[styles.orderCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
    {order.lines[0]?.imageUrl ? <Image source={{ uri: order.lines[0].imageUrl }} style={styles.orderThumb} /> : <ShopProductArt kind="stand" businessName={businessName} palette={palette} size={68} />}
    <View style={styles.orderCardBody}>
      <View style={styles.inlineBetween}><Text style={[styles.bodyStrong, { color: palette.ink }]}>{order.invoiceNumber || `#${order.id.slice(-8)}`}</Text><ShopStatusChip status={order.status} t={t} palette={palette} lang={lang} /></View>
      <Text numberOfLines={1} style={[styles.bodyText, { color: palette.muted }]}>{order.lines[0]?.name || t.shopOrderNumber}</Text>
      <Text style={[styles.caption, { color: palette.muted }]}>{dateTime(order.createdAt, lang)} · {money(order.totalPaise)}</Text>
    </View>
    <ChevronRight size={20} color={palette.ink} />
  </Pressable>;
}

function OrderDetailView({ detail, palette, t, lang, busy, proofNote, setProofNote, reprintNote, setReprintNote, reprintReason, setReprintReason, picker, onAction, onOpenExternal, onHelp, onCopyAwb }: {
  detail: ShopOrderDetail; palette: Palette; t: ReturnType<typeof useI18n>["t"]; lang: string; busy: boolean;
  proofNote: string; setProofNote: (value: string) => void; reprintNote: string; setReprintNote: (value: string) => void;
  reprintReason: "damage" | "misprint"; setReprintReason: (value: "damage" | "misprint") => void;
  picker: (title: string, options: PickerOption[], selected: string | null | undefined, onSelect: (value: string) => void) => void;
  onAction: (path: string, body: object, success?: () => void) => Promise<void>;
  onOpenExternal: (url: string) => Promise<void>; onHelp: () => void; onCopyAwb: (awb: string) => Promise<void>;
}) {
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);
  const progress = shopStepperState(detail.status);
  const steps = ["paid", "proof", "approved", "printing", "packed", "shipped", "delivered"];
  return <View style={styles.detailStack}>
    <View style={[styles.detailHeading, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <View style={{ flex: 1, gap: 4 }}><Text style={[styles.sectionTitle, { color: palette.ink }]}>{detail.invoiceNumber || `#${detail.id.slice(-8)}`}</Text><Text style={[styles.caption, { color: palette.muted }]}>{t.shopOrderDate}: {dateTime(detail.createdAt, lang)}</Text></View>
      <ShopStatusChip status={detail.status} t={t} palette={palette} lang={lang} />
    </View>

    {progress.kind === "terminal" ? <View style={[styles.terminalBanner, { backgroundColor: palette.danger }]}>
      <Text style={[styles.bodyStrong, { color: palette.onDanger }]}>{statusLabel(progress.status, t)}</Text>
      <Text style={[styles.bodyText, { color: palette.onDanger }]}>{t.shopTerminalHelp}</Text>
    </View> : progress.kind === "steps" ? <View style={[styles.detailPanel, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.tracking}</Text>
      {progress.warning ? <Text style={[styles.inlineError, { color: palette.warning }]}>{t.shopStatusChangesRequested}</Text> : null}
      <View style={styles.stepperList}>
        {steps.map((step, index) => {
          const complete = index <= progress.currentIndex;
          return <View key={step} style={styles.stepRow}>
            <View style={styles.stepRail}>
              <View style={[styles.stepDot, { backgroundColor: complete ? palette.primary : palette.surface, borderColor: complete ? palette.primary : palette.line }]}>{index < progress.currentIndex ? <Check size={12} color={palette.onPrimary} /> : null}</View>
              {index < steps.length - 1 ? <View style={[styles.stepConnector, { backgroundColor: index < progress.currentIndex ? palette.primary : palette.line }]} /> : null}
            </View>
            <Text style={[styles.stepLabel, { color: complete ? palette.ink : palette.muted }, index === progress.currentIndex && styles.bodyStrong, lang === "hi" && styles.hindi]}>{stageLabel(step, t)}</Text>
          </View>;
        })}
      </View>
    </View> : <View style={[styles.detailPanel, { backgroundColor: palette.card, borderColor: palette.line }]}><Text style={[styles.bodyText, { color: palette.muted }]}>{statusLabel(detail.status, t)}</Text></View>}

    <View style={[styles.detailPanel, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopItems}</Text>
      {detail.lines.map((line, index) => <View key={`${line.sku}-${index}`} style={styles.orderLineRow}>
        {line.imageUrl ? <Image source={{ uri: line.imageUrl }} style={styles.orderThumb} /> : <ShopProductArt kind="stand" businessName="QR24x7" palette={palette} size={62} />}
        <View style={{ flex: 1 }}><Text style={[styles.bodyStrong, { color: palette.ink }]}>{line.name}</Text><Text style={[styles.caption, { color: palette.muted }]}>{line.qty} × {money(line.unitPaise)}</Text>{line.unbranded ? <Text style={[styles.unbrandedOrderBadge, { backgroundColor: palette.accentSoft, color: palette.deep }, lang === "hi" && styles.hindi]}>{t.shopUnbrandedBadge}</Text> : null}</View>
      </View>)}
    </View>

    {detail.status === "PROOF_SENT" ? <View style={[styles.detailPanel, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopProof}</Text>
      <Text style={[styles.bodyText, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.shopProofNote}</Text>
      {detail.lines.map((line, index) => line.proof?.proofUrl ? <View key={`${line.sku}-proof-${index}`} style={styles.proofBlock}>
        {line.proof.proofContentType?.startsWith("image/") ? <Image source={{ uri: line.proof.proofUrl }} resizeMode="contain" style={styles.proofImage} /> : <SecondaryButton label={t.shopProof} icon={ExternalLink} onPress={() => void onOpenExternal(line.proof!.proofUrl!)} />}
      </View> : null)}
      <PrimaryButton label={t.approveProof} disabled={busy} onPress={() => void onAction("proof", { action: "approve" })} />
      <ShopField label={t.shopChangesNote} value={proofNote} onChangeText={setProofNote} palette={palette} multiline />
      <SecondaryButton label={t.shopSendChanges} disabled={busy || !proofNote.trim()} onPress={() => void onAction("proof", { action: "changes", comment: proofNote.trim() }, () => setProofNote(""))} />
    </View> : null}

    <View style={[styles.detailPanel, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopDelivery}</Text>
      {detail.address ? <View style={styles.addressSummary}>
        <MapPin size={18} color={palette.primary} />
        <View style={{ flex: 1 }}><Text style={[styles.bodyStrong, { color: palette.ink }]}>{detail.address.name} · {detail.address.phone}</Text><Text style={[styles.bodyText, { color: palette.muted }]}>{detail.address.line1}{detail.address.line2 ? `, ${detail.address.line2}` : ""}, {detail.address.city}, {detail.address.state} {detail.address.pincode}</Text></View>
      </View> : <Text style={[styles.bodyText, { color: palette.muted }]}>{t.shopChooseAddress}</Text>}
      {detail.shipment ? <>
        <View style={styles.detailInfoRow}><Truck size={18} color={palette.primary} /><Text style={[styles.bodyText, { color: palette.ink }]}>{t.shopCourier}: {detail.shipment.courierName || detail.shipment.provider}</Text></View>
        {detail.shipment.awb ? <View style={styles.inlineBetween}>
          <View style={styles.detailInfoRow}><Text style={[styles.bodyStrong, { color: palette.ink }]}>{t.shopAwb}: {detail.shipment.awb}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={copiedAwb === detail.shipment.awb ? t.shopAwbCopied : t.shopCopyAwb} onPress={() => { const awb = detail.shipment!.awb!; void onCopyAwb(awb).then(() => setCopiedAwb(awb)).catch(() => undefined); }} style={[styles.copyButton, { borderColor: palette.line }]}><Copy size={16} color={palette.ink} /><Text style={[styles.caption, { color: palette.ink }]}>{copiedAwb === detail.shipment.awb ? t.shopAwbCopied : t.shopCopyAwb}</Text></Pressable>
        </View> : null}
        {detail.shipment.latestEvent ? <View style={[styles.ndrBox, { backgroundColor: `${palette.surface2}` }]}><Text style={[styles.labelText, { color: palette.primary }]}>{t.shopLatestEvent}</Text><Text style={[styles.bodyText, { color: palette.ink }]}>{timelineLabel(detail.shipment.latestEvent.status, t)}</Text><Text style={[styles.caption, { color: palette.muted }]}>{dateTime(detail.shipment.latestEvent.at, lang)}</Text></View> : null}
        {detail.shipment.ndrNote ? <View style={[styles.ndrBox, { backgroundColor: `${palette.warning}18` }]}><Text style={[styles.labelText, { color: palette.warning }]}>{t.shopNdrNote}</Text><Text style={[styles.bodyText, { color: palette.ink }]}>{detail.shipment.ndrNote}</Text></View> : null}
        {detail.shipment.etaDays != null ? <Text style={[styles.bodyText, { color: palette.muted }]}>{t.shopEta}: {t.shopEtaDays.replace("{days}", String(detail.shipment.etaDays))}</Text> : null}
        <PrimaryButton label={t.shopTrackShipment} icon={ExternalLink} onPress={() => void onOpenExternal(detail.shipment?.trackingUrl || `https://qr24x7.in/dashboard/shop/orders/${detail.id}`)} />
      </> : <Text style={[styles.bodyText, { color: palette.muted }]}>{t.shopTrackShipment}</Text>}
    </View>

    <View style={[styles.detailPanel, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopSummary}</Text>
      <SummaryRow label={t.shopSubtotal} amount={detail.subtotalPaise} palette={palette} />
      <SummaryRow label={t.shopDiscount} amount={-detail.discountPaise} palette={palette} />
      <SummaryRow label={t.shopCgst} amount={detail.cgstPaise} palette={palette} />
      <SummaryRow label={t.shopSgst} amount={detail.sgstPaise} palette={palette} />
      <SummaryRow label={t.shopIgst} amount={detail.igstPaise} palette={palette} />
      <SummaryRow label={t.shopTotal} amount={detail.totalPaise} palette={palette} strong />
      {detail.invoiceNumber ? <View style={styles.invoiceRow}><Receipt size={19} color={palette.primary} /><Text style={[styles.bodyText, { color: palette.ink }]}>{t.shopInvoice}: {detail.invoiceNumber}</Text></View> : null}
      {detail.invoiceDownloadUrl ? <SecondaryButton label={t.shopDownloadInvoice} icon={ExternalLink} onPress={() => void onOpenExternal(detail.invoiceDownloadUrl!)} /> : null}
    </View>

    {detail.status === "DELIVERED" ? <View style={[styles.detailPanel, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.reprint}</Text>
      <ChoiceField title={t.shopReprintReason} value={reprintReason === "damage" ? t.shopDamage : t.shopMisprint} palette={palette} onPress={() => picker(t.shopReprintReason, [{ label: t.shopDamage, value: "damage" }, { label: t.shopMisprint, value: "misprint" }], reprintReason, (value) => setReprintReason(value as "damage" | "misprint"))} />
      <ShopField label={t.shopReprintNote} value={reprintNote} onChangeText={setReprintNote} palette={palette} multiline />
      <SecondaryButton label={t.shopRequestReprint} disabled={busy} onPress={() => void onAction("reprint", { reason: reprintReason, note: reprintNote.trim() || undefined }, () => setReprintNote(""))} />
    </View> : null}

    <View style={[styles.detailPanel, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopTimeline}</Text>
      {[{ label: t.shopOrderPlaced, at: detail.createdAt }, ...detail.timeline.slice(1).map((event) => ({ ...event, label: timelineLabel(event.label, t) }))].map((event, index) => <View key={`${event.at}-${index}`} style={styles.timelineRow}>
        <Clock3 size={16} color={palette.primary} />
        <View style={{ flex: 1 }}><Text style={[styles.bodyText, { color: palette.ink }]}>{event.label}</Text><Text style={[styles.caption, { color: palette.muted }]}>{dateTime(event.at, lang)}</Text></View>
      </View>)}
    </View>

    <View style={[styles.detailPanel, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.shopNeedHelp}</Text>
      <SecondaryButton label={t.shopNeedHelp} onPress={onHelp} />
    </View>
  </View>;
}

function InlineMessage({ message, palette, action, onAction }: { message: string; palette: Palette; action?: string; onAction?: () => void }) {
  return <View style={[styles.inlineMessage, { backgroundColor: `${palette.danger}12`, borderColor: `${palette.danger}55` }]}>
    <Text style={[styles.bodyText, { color: palette.danger, flex: 1 }]}>{message}</Text>
    {action && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={styles.inlineAction}><Text style={[styles.bodyStrong, { color: palette.primary }]}>{action}</Text></Pressable> : null}
  </View>;
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    screen: { flex: 1 },
    header: { minHeight: 58, paddingHorizontal: 16, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { flex: 1, color: palette.ink, fontFamily: fonts.title, fontSize: 21 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTextButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
    headerText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
    headerCartButton: { minWidth: 52, height: 44, borderRadius: 16, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    cartBadgeText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
    content: { paddingHorizontal: 16, paddingTop: 7, paddingBottom: 28, gap: 12 },
    panel: { borderRadius: 20, padding: 14, gap: 12 },
    activeOrderCard: { borderWidth: 1, borderRadius: 20, padding: 11, flexDirection: "row", alignItems: "center", gap: 11 },
    activeOrderInfo: { flex: 1, gap: 4 },
    productGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
    productCard: { width: "48%", borderRadius: 18, overflow: "hidden", borderWidth: 1 },
    productImagePress: { width: "100%" },
    productImage: { width: "100%", aspectRatio: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    productCardBody: { padding: 10, gap: 6 },
    productName: { fontFamily: fonts.bodyStrong, fontSize: 14, minHeight: 36 },
    nfcTag: { fontFamily: fonts.bodyStrong, fontSize: 11, minHeight: 16 },
    priceLine: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 23 },
    cardPrice: { fontFamily: fonts.bodyStrong, fontSize: 16 },
    crossedPrice: { fontFamily: fonts.body, fontSize: 12, textDecorationLine: "line-through" },
    discountBadge: { position: "absolute", top: 8, left: 8, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 },
    discountBadgeText: { fontFamily: fonts.bodyStrong, fontSize: 10 },
    unbrandedPill: { position: "absolute", top: 8, right: 8, maxWidth: "80%", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
    unbrandedPillText: { fontFamily: fonts.bodyStrong, fontSize: 9 },
    unbrandedOrderBadge: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, fontFamily: fonts.bodyStrong, fontSize: 10, marginTop: 4 },
    productAction: { minHeight: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
    productActionText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
    sectionTitle: { fontFamily: fonts.title, fontSize: 18 },
    bodyText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
    bodyStrong: { fontFamily: fonts.bodyStrong, fontSize: 14, lineHeight: 20 },
    caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
    labelText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
    priceText: { fontFamily: fonts.title, fontSize: 24 },
    stackGap: { gap: 9 },
    inlineBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    quantityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    quantityValue: { minWidth: 22, textAlign: "center", fontFamily: fonts.bodyStrong, fontSize: 16 },
    stepperButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "transparent" },
    modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: palette.scrim },
    sheet: { maxHeight: "92%", width: "100%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingTop: 14, paddingBottom: Platform.OS === "ios" ? 30 : 18, paddingHorizontal: 16, gap: 10 },
    productSheet: { maxHeight: "94%" },
    sheetHeader: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    sheetBody: { gap: 16, paddingBottom: 8 },
    sheetFooter: { borderTopWidth: 1, paddingTop: 12 },
    largeProductImage: { alignItems: "center", justifyContent: "center", width: "100%", aspectRatio: 1, borderRadius: 20, overflow: "hidden" },
    variantChoice: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
    discountText: { fontFamily: fonts.bodyStrong, fontSize: 12 },
    designPreview: { alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 18, padding: 14 },
    brandingPreviewWrap: { gap: 8 },
    brandingPreviewRow: { flexDirection: "row", gap: 8 },
    brandingMiniCard: { flex: 1, minHeight: 112, borderRadius: 13, borderWidth: 1, padding: 7, alignItems: "center", justifyContent: "center", gap: 5 },
    brandingMiniQr: { width: 38, height: 38, borderWidth: 2, alignItems: "center", justifyContent: "center" },
    brandingMiniDot: { width: 15, height: 15 },
    brandingMark: { fontFamily: fonts.bodyStrong, fontSize: 8 },
    miniPreviewCaption: { fontFamily: fonts.body, fontSize: 9, textAlign: "center" },
    brandingToggle: { minHeight: 60, borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: "row", alignItems: "center", gap: 10 },
    switchTrack: { width: 44, height: 26, borderRadius: 13, padding: 4, justifyContent: "center" },
    switchKnob: { width: 18, height: 18, borderRadius: 9 },
    previewPiece: { minHeight: 174, minWidth: 164, alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: 16, borderWidth: 1 },
    previewBusinessName: { maxWidth: 150, fontFamily: fonts.bodyStrong, fontSize: 13 },
    previewCaption: { fontFamily: fonts.body, fontSize: 10 },
    formBody: { gap: 13, paddingBottom: 12 },
    fieldGroup: { gap: 6 },
    textInput: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15 },
    selectButton: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    choiceRow: { minHeight: 52, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
    iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    cartLine: { borderWidth: 1, borderRadius: 20, padding: 13, gap: 12 },
    lineHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    cartThumb: { width: 56, height: 56, borderRadius: 13, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    designFields: { gap: 9 },
    inlineError: { fontFamily: fonts.bodyStrong, fontSize: 13, lineHeight: 19 },
    addressCard: { borderWidth: 1, borderRadius: 15, padding: 12, gap: 4 },
    summaryRow: { minHeight: 25, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    divider: { height: 1, marginVertical: 2 },
    orderCard: { minHeight: 91, borderWidth: 1, borderRadius: 18, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
    orderThumb: { width: 68, height: 68, borderRadius: 13, backgroundColor: palette.surface2 },
    orderCardBody: { flex: 1, gap: 4 },
    activeThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: palette.surface2 },
    detailStack: { gap: 12 },
    detailHeading: { minHeight: 68, borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 8 },
    statusChip: { minHeight: 28, borderRadius: 999, paddingHorizontal: 9, justifyContent: "center", alignSelf: "flex-start" },
    statusChipText: { fontFamily: fonts.bodyStrong, fontSize: 11 },
    terminalBanner: { borderRadius: 18, padding: 14, gap: 5 },
    detailPanel: { borderWidth: 1, borderRadius: 19, padding: 14, gap: 12 },
    stepperList: { gap: 0 },
    stepRow: { minHeight: 42, flexDirection: "row", alignItems: "flex-start", gap: 12 },
    stepRail: { width: 24, alignItems: "center", height: 42 },
    stepDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center", zIndex: 1 },
    stepConnector: { position: "absolute", width: 2, top: 19, bottom: -1 },
    stepLabel: { fontFamily: fonts.body, fontSize: 14, paddingTop: 1 },
    orderLineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    proofBlock: { borderRadius: 14, overflow: "hidden", alignItems: "center" },
    proofImage: { width: "100%", height: 240, backgroundColor: palette.surface, borderRadius: 12 },
    addressSummary: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
    detailInfoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    copyButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 13, paddingHorizontal: 10 },
    ndrBox: { borderRadius: 13, padding: 10, gap: 4 },
    invoiceRow: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 8 },
    timelineRow: { minHeight: 40, flexDirection: "row", alignItems: "flex-start", gap: 8 },
    inlineMessage: { borderWidth: 1, borderRadius: 13, padding: 11, flexDirection: "row", alignItems: "center", gap: 8 },
    inlineAction: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
    loadingStack: { gap: 12 },
    skeleton: { minHeight: 96, borderRadius: 18 },
    hindi: { fontFamily: fonts.hindi }
  });
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTextButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
  headerText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  headerCartButton: { minWidth: 52, height: 44, borderRadius: 16, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  cartBadgeText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  content: { paddingHorizontal: 16, paddingTop: 7, paddingBottom: 28, gap: 12 },
  activeOrderCard: { borderWidth: 1, borderRadius: 20, padding: 11, flexDirection: "row", alignItems: "center", gap: 11 },
  activeOrderInfo: { flex: 1, gap: 4 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  productCard: { width: "48%", borderRadius: 18, overflow: "hidden", borderWidth: 1 },
  productImagePress: { width: "100%" },
  productImage: { width: "100%", aspectRatio: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  productCardBody: { padding: 10, gap: 6 },
  productName: { fontFamily: fonts.bodyStrong, fontSize: 14, minHeight: 36 },
  nfcTag: { fontFamily: fonts.bodyStrong, fontSize: 11, minHeight: 16 },
  priceLine: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 23 },
  cardPrice: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  crossedPrice: { fontFamily: fonts.body, fontSize: 12, textDecorationLine: "line-through" },
  discountBadge: { position: "absolute", top: 8, left: 8, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 },
  discountBadgeText: { fontFamily: fonts.bodyStrong, fontSize: 10 },
  unbrandedPill: { position: "absolute", top: 8, right: 8, maxWidth: "80%", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  unbrandedPillText: { fontFamily: fonts.bodyStrong, fontSize: 9 },
  unbrandedOrderBadge: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, fontFamily: fonts.bodyStrong, fontSize: 10, marginTop: 4 },
  productAction: { minHeight: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  productActionText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  sectionTitle: { fontFamily: fonts.title, fontSize: 18 },
  bodyText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontFamily: fonts.bodyStrong, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  labelText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  priceText: { fontFamily: fonts.title, fontSize: 24 },
  stackGap: { gap: 9 },
  inlineBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  quantityValue: { minWidth: 22, textAlign: "center", fontFamily: fonts.bodyStrong, fontSize: 16 },
  stepperButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalScrim: { ...StyleSheet.absoluteFill },
  sheet: { maxHeight: "92%", width: "100%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingTop: 14, paddingBottom: Platform.OS === "ios" ? 30 : 18, paddingHorizontal: 16, gap: 10 },
  productSheet: { maxHeight: "94%" },
  sheetHeader: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sheetBody: { gap: 16, paddingBottom: 8 },
  sheetFooter: { borderTopWidth: 1, paddingTop: 12 },
  largeProductImage: { alignItems: "center", justifyContent: "center", width: "100%", aspectRatio: 1, borderRadius: 20, overflow: "hidden" },
  variantChoice: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  discountText: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  designPreview: { alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 18, padding: 14 },
  brandingPreviewWrap: { gap: 8 },
  brandingPreviewRow: { flexDirection: "row", gap: 8 },
  brandingMiniCard: { flex: 1, minHeight: 112, borderRadius: 13, borderWidth: 1, padding: 7, alignItems: "center", justifyContent: "center", gap: 5 },
  brandingMiniQr: { width: 38, height: 38, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  brandingMiniDot: { width: 15, height: 15 },
  brandingMark: { fontFamily: fonts.bodyStrong, fontSize: 8 },
  miniPreviewCaption: { fontFamily: fonts.body, fontSize: 9, textAlign: "center" },
  brandingToggle: { minHeight: 60, borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  switchTrack: { width: 44, height: 26, borderRadius: 13, padding: 4, justifyContent: "center" },
  switchKnob: { width: 18, height: 18, borderRadius: 9 },
  previewPiece: { minHeight: 174, minWidth: 164, alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: 16, borderWidth: 1 },
  previewBusinessName: { maxWidth: 150, fontFamily: fonts.bodyStrong, fontSize: 13 },
  previewCaption: { fontFamily: fonts.body, fontSize: 10 },
  formBody: { gap: 13, paddingBottom: 12 },
  fieldGroup: { gap: 6 },
  textInput: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 15 },
  selectButton: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  choiceRow: { minHeight: 52, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  cartLine: { borderWidth: 1, borderRadius: 20, padding: 13, gap: 12 },
  lineHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cartThumb: { width: 56, height: 56, borderRadius: 13, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  designFields: { gap: 9 },
  inlineError: { fontFamily: fonts.bodyStrong, fontSize: 13, lineHeight: 19 },
  addressCard: { borderWidth: 1, borderRadius: 15, padding: 12, gap: 4 },
  summaryRow: { minHeight: 25, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  divider: { height: 1, marginVertical: 2 },
  orderCard: { minHeight: 91, borderWidth: 1, borderRadius: 18, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  orderThumb: { width: 68, height: 68, borderRadius: 13 },
  orderCardBody: { flex: 1, gap: 4 },
  activeThumb: { width: 56, height: 56, borderRadius: 12 },
  detailStack: { gap: 12 },
  detailHeading: { minHeight: 68, borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  statusChip: { minHeight: 28, borderRadius: 999, paddingHorizontal: 9, justifyContent: "center", alignSelf: "flex-start" },
  statusChipText: { fontFamily: fonts.bodyStrong, fontSize: 11 },
  terminalBanner: { borderRadius: 18, padding: 14, gap: 5 },
  detailPanel: { borderWidth: 1, borderRadius: 19, padding: 14, gap: 12 },
  stepperList: { gap: 0 },
  stepRow: { minHeight: 42, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepRail: { width: 24, alignItems: "center", height: 42 },
  stepDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center", zIndex: 1 },
  stepConnector: { position: "absolute", width: 2, top: 19, bottom: -1 },
  stepLabel: { fontFamily: fonts.body, fontSize: 14, paddingTop: 1 },
  orderLineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  proofBlock: { borderRadius: 14, overflow: "hidden", alignItems: "center" },
  proofImage: { width: "100%", height: 240, borderRadius: 12 },
  addressSummary: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  detailInfoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  copyButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 13, paddingHorizontal: 10 },
  ndrBox: { borderRadius: 13, padding: 10, gap: 4 },
  invoiceRow: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 8 },
  timelineRow: { minHeight: 40, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  inlineMessage: { borderWidth: 1, borderRadius: 13, padding: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  inlineAction: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
  loadingStack: { gap: 12 },
  skeleton: { minHeight: 96, borderRadius: 18 },
  hindi: { fontFamily: fonts.hindi }
});
