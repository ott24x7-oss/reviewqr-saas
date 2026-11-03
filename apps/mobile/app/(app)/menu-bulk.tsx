import * as React from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/ui/screen";
import { mobileApi } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useBusiness } from "../../src/state/business";
import { useI18n } from "../../src/i18n";
import { useTheme } from "../../src/ui/theme";
import { fonts } from "../../src/theme";
import type { Palette } from "../../src/ui/tokens";
import { PrimaryButton } from "../../src/ui/buttons";
import { arrayBufferToBase64, menuBulkFileSpec, mapBulkPreview, bulkResultCopy, localizeBulkIssue, type BulkMode, type MobileBulkPreview } from "../../src/store/menu-bulk";

const WORDS = {
  en: {
    title: "Bulk upload", intro: "Download a template or demo file, fill it in, then preview before importing.",
    template: "Blank template", demo: "Demo file", csv: "CSV", excel: "Excel", choose: "Choose CSV or Excel file",
    preview: "Preview file", addNew: "Add new", updateExisting: "Update existing", newCategories: "New categories",
    plan: "Plan limit", import: "Import selected rows", loading: "Working…", noRows: "Pick a file to see its rows.",
    error: "Could not continue", add: "Add", update: "Update", skip: "Skip", name: "Name", category: "Category",
    price: "Price", noPrice: "On request", missingName: "Unnamed item", warning: "Warning", row: "Row",
    chooseFile: "Choose file", limitOffer: "Only the rows that fit your plan will be imported.",
    imagesQueued: "Photo links are being checked in the background.", refreshImages: "Check photo links"
  },
  hi: {
    title: "बल्क अपलोड", intro: "टेम्पलेट या डेमो फ़ाइल डाउनलोड करें, भरें और इम्पोर्ट से पहले जाँचें।",
    template: "खाली टेम्पलेट", demo: "डेमो फ़ाइल", csv: "CSV", excel: "Excel", choose: "CSV या Excel फ़ाइल चुनें",
    preview: "फ़ाइल की जाँच करें", addNew: "नए जोड़ें", updateExisting: "मौजूदा अपडेट करें", newCategories: "नई श्रेणियाँ",
    plan: "प्लान सीमा", import: "चुनी हुई पंक्तियाँ इम्पोर्ट करें", loading: "कृपया रुकें…", noRows: "पंक्तियाँ देखने के लिए फ़ाइल चुनें।",
    error: "आगे नहीं बढ़ सके", add: "जोड़ें", update: "अपडेट", skip: "छोड़ें", name: "नाम", category: "श्रेणी",
    price: "कीमत", noPrice: "पूछने पर", missingName: "नाम नहीं है", warning: "चेतावनी", row: "पंक्ति",
    chooseFile: "फ़ाइल चुनें", limitOffer: "आपके प्लान में जितनी पंक्तियाँ फिट होंगी, उतनी ही इम्पोर्ट होंगी।",
    imagesQueued: "फ़ोटो लिंक बैकग्राउंड में जाँचे जा रहे हैं।", refreshImages: "फ़ोटो लिंक जाँचें"
  }
} as const;

type Result = { created: number; updated: number; skipped: number; failed: number; noPhoto: number; imageJobs: { jobId: string; itemId: string; rowIndex: number }[]; imageErrors?: { rowIndex: number; error: string }[] };

export default function MenuBulkScreen() {
  const { business } = useBusiness();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const language = lang === "hi" ? "hi" : "en";
  const t = WORDS[language];
  const [preview, setPreview] = React.useState<MobileBulkPreview | null>(null);
  const [actions, setActions] = React.useState<("add" | "update" | "skip")[]>([]);
  const [mode, setMode] = React.useState<BulkMode>("add_new");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<Result | null>(null);
  const [imageErrors, setImageErrors] = React.useState<{ rowIndex: number; error: string }[]>([]);
  const [fileName, setFileName] = React.useState("");

  async function download(kind: "template" | "demo", format: "csv" | "xlsx") {
    if (!business?.id) return;
    setBusy(true); setError("");
    try {
      const spec = menuBulkFileSpec(business.id, kind, format);
      const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!directory) throw new Error(t.error);
      const dest = `${directory}${spec.filename}`;
      const response = await mobileApi.request(spec.path);
      if (!response.ok) throw new Error(t.error);
      await FileSystem.writeAsStringAsync(dest, arrayBufferToBase64(await response.arrayBuffer()), { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dest, { mimeType: spec.mimeType, UTI: spec.uti, dialogTitle: `${kind === "demo" ? t.demo : t.template} · ${format.toUpperCase()}` });
    } catch (err) { setError(err instanceof Error ? localizeBulkIssue(err.message, language) : t.error); }
    finally { setBusy(false); }
  }

  async function pickFile() {
    if (!business?.id) return;
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      copyToCacheDirectory: true,
      multiple: false
    });
    if (picked.canceled || !picked.assets[0]) return;
    const file = picked.assets[0];
    if ((file.size || 0) > 2_000_000) { setError(language === "hi" ? "फ़ाइल 2 MB से छोटी होनी चाहिए।" : "Choose a file under 2 MB."); return; }
    setBusy(true); setError(""); setResult(null); setImageErrors([]); setFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", { uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" } as unknown as Blob);
      const data = await apiData<unknown>(`/api/v1/businesses/${business.id}/menu/bulk`, { method: "POST", body: form });
      const mapped = mapBulkPreview(data);
      setPreview(mapped);
      setMode("add_new");
      setActions(mapped.rows.map((row) => row.matchedItemId || row.action === "skip" ? "skip" : "add"));
    } catch (err) { setError(err instanceof ApiError ? localizeBulkIssue(err.message, language) : t.error); }
    finally { setBusy(false); }
  }

  function chooseMode(next: BulkMode) {
    setMode(next);
    setActions(preview?.rows.map((row) => row.action === "skip" ? "skip" : row.matchedItemId ? (next === "update_existing" ? "update" : "skip") : "add") || []);
  }

  async function importRows() {
    if (!business?.id || !preview) return;
    const selected = preview.rows.map((row, index) => ({ row, action: actions[index] })).filter(({ row, action }) => !row.errors.length && action !== "skip");
    if (!selected.length) return;
    setBusy(true); setError("");
    try {
      const data = await apiData<Result>(`/api/v1/businesses/${business.id}/menu/bulk`, {
        method: "POST",
        body: JSON.stringify({
          mode,
          rows: preview.rows.map((row) => row.row),
          actions: actions.map((action, index) => ({ index, action }))
        })
      });
      setResult(data);
      setImageErrors(data.imageErrors || []);
      if (data.imageJobs?.length) void pollImageJobs(data.imageJobs.map((job) => ({ jobId: job.jobId, rowIndex: job.rowIndex })));
    } catch (err) { setError(err instanceof ApiError ? localizeBulkIssue(err.message, language) : t.error); }
    finally { setBusy(false); }
  }

  async function pollImageJobs(jobs: { jobId: string; rowIndex: number }[]) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      if (!business?.id) return;
      try {
        if (await checkImageJobs(jobs)) return;
      } catch { return; }
    }
  }

  async function checkImageJobs(jobs: { jobId: string; rowIndex: number }[]) {
    if (!business?.id) return false;
    const ids = jobs.map((job) => job.jobId).join(",");
    const response = await apiData<{ jobs: { jobId: string; status: string; error: string | null }[] }>(`/api/v1/businesses/${business.id}/menu/bulk?imageJobIds=${encodeURIComponent(ids)}`);
    const failed = response.jobs.filter((job) => job.status === "FAILED").map((job) => ({ rowIndex: jobs.find((item) => item.jobId === job.jobId)?.rowIndex ?? 0, error: job.error || t.error }));
    setImageErrors(failed);
    return response.jobs.length === jobs.length && response.jobs.every((job) => ["DONE", "FAILED"].includes(job.status));
  }

  const remaining = preview?.limit.remaining ?? 0;
  return <Screen topInset>
    <ScrollView contentContainerStyle={[styles.content, { backgroundColor: palette.paper }]}>
      <Text style={[styles.title, { color: palette.ink }, language === "hi" && styles.hindi]}>{t.title}</Text>
      <Text style={[styles.body, { color: palette.muted }, language === "hi" && styles.hindi]}>{t.intro}</Text>
      <Text style={[styles.section, { color: palette.ink }]}>{t.template}</Text>
      <View style={styles.buttons}>
        <Action label={`${t.template} · ${t.csv}`} accessibilityLabel={`${t.template} ${t.csv}`} disabled={busy} onPress={() => void download("template", "csv")} palette={palette} />
        <Action label={`${t.template} · ${t.excel}`} accessibilityLabel={`${t.template} ${t.excel}`} disabled={busy} onPress={() => void download("template", "xlsx")} palette={palette} />
        <Action label={`${t.demo} · ${t.csv}`} accessibilityLabel={`${t.demo} ${t.csv}`} disabled={busy} onPress={() => void download("demo", "csv")} palette={palette} />
        <Action label={`${t.demo} · ${t.excel}`} accessibilityLabel={`${t.demo} ${t.excel}`} disabled={busy} onPress={() => void download("demo", "xlsx")} palette={palette} />
      </View>
      <PrimaryButton label={busy ? t.loading : t.chooseFile} accessibilityLabel={t.choose} disabled={busy || !business?.id} onPress={() => void pickFile()} />
      {fileName ? <Text style={[styles.body, { color: palette.muted }]}>{fileName}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
      {busy ? <ActivityIndicator color={palette.primary} /> : null}
      {preview ? <>
        <Text style={[styles.section, { color: palette.ink }]}>{t.preview} · {preview.rows.length}</Text>
        <Text style={[styles.body, { color: palette.muted }]}>{t.plan}: {preview.limit.used} / {preview.limit.cap}. {preview.limit.fits} rows fit.</Text>
        {preview.limit.additions > remaining ? <Text style={[styles.warning, { color: palette.warning }]}>{t.limitOffer}</Text> : null}
        {preview.newCategories.length ? <Text style={[styles.body, { color: palette.muted }]}>{t.newCategories}: {preview.newCategories.join(", ")}</Text> : null}
        <View style={styles.buttons}>
          <Action label={t.addNew} accessibilityLabel={t.addNew} selected={mode === "add_new"} onPress={() => chooseMode("add_new")} palette={palette} />
          <Action label={t.updateExisting} accessibilityLabel={t.updateExisting} selected={mode === "update_existing"} onPress={() => chooseMode("update_existing")} palette={palette} />
        </View>
        {preview.rows.map((row, index) => <View key={`${row.index}-${index}`} style={[styles.rowCard, { backgroundColor: palette.card, borderColor: row.errors.length ? palette.danger : palette.line }]}>
          <Text style={[styles.rowTitle, { color: palette.ink }]}>{row.row.name || t.missingName} · {t.row} {index + 1}</Text>
          <Text style={[styles.body, { color: palette.muted }]}>{t.price}: {row.row.price || t.noPrice} · {t.category}: {row.row.category || "—"}</Text>
          {row.errors.map((issue) => <Text key={issue} style={[styles.issue, { color: palette.danger }]}>{localizeBulkIssue(issue, language)}</Text>)}
          {row.warnings.map((warning) => <Text key={warning} style={[styles.warning, { color: palette.warning }]}>{localizeBulkIssue(warning, language)}</Text>)}
          <View style={styles.buttons}>{(["add", "update", "skip"] as const).map((action) => <Action key={action} label={t[action]} accessibilityLabel={`${t[action]} ${row.row.name}`} selected={actions[index] === action} disabled={!!row.errors.length && action !== "skip"} onPress={() => setActions((current) => current.map((value, rowIndex) => rowIndex === index ? action : value))} palette={palette} />)}</View>
        </View>)}
        <PrimaryButton label={busy ? t.loading : t.import} accessibilityLabel={t.import} disabled={busy || !actions.some((action, index) => action !== "skip" && !preview.rows[index].errors.length)} onPress={() => void importRows()} />
      </> : <Text style={[styles.body, { color: palette.muted }]}>{t.noRows}</Text>}
      {result ? <View style={[styles.result, { backgroundColor: palette.card, borderColor: palette.line }]}>
        <Text style={[styles.rowTitle, { color: palette.ink }]}>{bulkResultCopy(result, language)}</Text>
        {result.imageJobs.length ? <Text style={[styles.body, { color: palette.muted }]}>{t.imagesQueued}</Text> : null}
        {result.imageJobs.length ? <Action label={t.refreshImages} accessibilityLabel={t.refreshImages} disabled={busy} onPress={() => void checkImageJobs(result.imageJobs)} palette={palette} /> : null}
        {imageErrors.map((item) => <Text key={`${item.rowIndex}-${item.error}`} style={[styles.issue, { color: palette.danger }]}>{t.row} {item.rowIndex + 1}: {item.error}</Text>)}
      </View> : null}
    </ScrollView>
  </Screen>;
}

function Action({ label, accessibilityLabel, onPress, disabled, selected, palette }: { label: string; accessibilityLabel: string; onPress: () => void; disabled?: boolean; selected?: boolean; palette: Palette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: !!disabled, selected: !!selected }} disabled={disabled} onPress={onPress} style={[styles.action, { backgroundColor: selected ? palette.primary : palette.card, borderColor: selected ? palette.primary : palette.line, opacity: disabled ? 0.5 : 1 }]}>
    <Text style={[styles.actionText, { color: selected ? palette.onPrimary : palette.ink }]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 16, gap: 12, paddingBottom: 36 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  section: { fontFamily: fonts.bodyStrong, fontSize: 17, marginTop: 8 },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  rowCard: { gap: 7, borderWidth: 1, borderRadius: 16, padding: 12 },
  rowTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  issue: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  warning: { fontFamily: fonts.body, fontSize: 12 },
  result: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  error: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  hindi: { fontFamily: fonts.hindi }
});
