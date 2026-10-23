import { Check, X } from "lucide-react";

const ROWS: Array<{ label: string; sticker: boolean; ours: boolean }> = [
  { label: "Google review link", sticker: true, ours: true },
  { label: "Change links after printing", sticker: false, ours: true },
  { label: "NFC tap, no camera needed", sticker: false, ours: true },
  { label: "Menu and WhatsApp ordering", sticker: false, ours: true },
  { label: "Private feedback alerts", sticker: false, ours: true },
  { label: "Customer list and loyalty", sticker: false, ours: true },
  { label: "Scans, orders and review reports", sticker: false, ours: true },
  { label: "Themes with your branding", sticker: false, ours: true }
];

function Mark({ on }: { on: boolean }) {
  return on ? (
    <Check className="hv3-yes" size={20} strokeWidth={1.75} aria-hidden="true" />
  ) : (
    <X className="hv3-no" size={20} strokeWidth={1.75} aria-hidden="true" />
  );
}

export function HomeComparison() {
  return (
    <section id="home-compare" className="hv3-section" aria-labelledby="home-compare-title">
      <div className="hv3-wrap">
        <h2 id="home-compare-title" className="marketing-rupee">
          ₹200 sticker vs QR24x7
        </h2>
        <p className="hv3-lead hv3-muted marketing-rupee" style={{ marginTop: 8 }}>
          A ₹200 sticker opens one link. QR24x7 runs your counter.
        </p>
        <div className="hv3-cmp" style={{ marginTop: 16 }}>
          <div className="hv3-cmp-row hv3-cmp-head hv3-small" style={{ fontWeight: 700 }}>
            <span>Feature</span>
            <span>₹200 sticker</span>
            <span>QR24x7</span>
          </div>
          {ROWS.map((row) => (
            <div key={row.label} className="hv3-cmp-row">
              <p>{row.label}</p>
              <p className="hv3-cmp-side">
                <Mark on={row.sticker} />
                <span className="hv3-small">{row.sticker ? "Included" : "Not included"}</span>
              </p>
              <p className="hv3-cmp-side">
                <Mark on={row.ours} />
                <span className="hv3-small">{row.ours ? "Included" : "Not included"}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
