import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { templateCsv } from "@/lib/store/entry";

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
    if ("text" in value && value.text != null) return String(value.text);
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
  }
  return "";
}

async function workbookBytes() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");
  sheet.addRow(["name", "price", "category", "Hindi name", "description", "veg", "brand", "MRP"]);
  sheet.addRow(["Filter coffee", 80, "Coffee", "फ़िल्टर कॉफ़ी", "South Indian coffee", "VEG", "", ""]);
  const file = await workbook.xlsx.writeBuffer();
  return Buffer.from(file);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const format = new URL(req.url).searchParams.get("format");
  if (format === "xlsx") {
    const body = await workbookBytes();
    return new NextResponse(body, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="products.xlsx"'
      }
    });
  }
  return new NextResponse(templateCsv(), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="products.csv"'
    }
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an Excel file" }, { status: 400 });
  if (file.size > 2_000_000) return NextResponse.json({ error: "Choose a spreadsheet under 2 MB" }, { status: 400 });

  try {
    const workbook = new ExcelJS.Workbook();
    // exceljs names its own Buffer, which clashes with Node's Buffer.
    const bytes = await file.arrayBuffer();
    await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];
    if (!sheet) return NextResponse.json({ error: "That workbook has no sheet" }, { status: 400 });
    const rows: string[][] = [];
    sheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      rows.push(values.map((value) => cellText(value as ExcelJS.CellValue)));
    });
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "Could not read that spreadsheet" }, { status: 400 });
  }
}
