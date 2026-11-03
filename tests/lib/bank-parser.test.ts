import { describe, expect, it } from "vitest";
import { bankEmailDiagnostics, parseBankEmail, parseBankSms } from "../../lib/payments/bank-parser";

describe("bank SMS parser", () => {
  const samples = [
    ["AX-AXISBK-S", "Rs. 999.37 has been credited to your account through UPI from RAHUL KUMAR. UPI Ref No 123456789012", 99937, "123456789012"],
    ["VM-HDFCBK", "INR 1,234.56 credited to A/c XX1234. UPI Ref: 223456789012", 123456, "223456789012"],
    ["JD-SBIUPI-S", "Your A/c has been credited by Rs 55.12 on 04-Nov. UPI Ref No: 323456789012", 5512, "323456789012"],
    ["AD-ICICIB", "Rs 501.00 credited to your account. UTR 423456789012", 50100, "423456789012"],
    ["VM-PAYTMB", "Payment Received ₹ 78.90 via UPI. UPI Ref 523456789012", 7890, "523456789012"],
    ["VM-KOTAKB", "INR 65.43 has been credited to your account. RRN: 623456789012", 6543, "623456789012"]
  ] as const;

  it.each(samples)("parses %s credit amount and UTR", (sender, body, amountPaise, utr) => {
    expect(parseBankSms(sender, body)).toMatchObject({ amountPaise, utr });
  });

  it("honors the admin sender allow-list and rejects debit, OTP, collect, and phone senders", () => {
    expect(parseBankSms("VM-HDFCBK", "INR 200 credited to account", ["AX-AXISBK"])).toBeNull();
    expect(parseBankSms("AX-AXISBK-S", "Rs 200 debited from your account")).toBeNull();
    expect(parseBankSms("AX-AXISBK-S", "Your OTP 123456 for UPI payment")).toBeNull();
    expect(parseBankSms("AX-AXISBK-S", "Approve collect request of Rs 200")).toBeNull();
    expect(parseBankSms("9876543210", "INR 200 credited to account")).toBeNull();
  });
});

describe("bank email sender authentication", () => {
  const trusted = {
    from: "Axis Alerts <alerts@axisbank.com>",
    subject: "Payment received",
    text: "INR 999.37 has been credited to your account. UPI Ref 123456789012",
    authenticationResults: "mx.google.com; dkim=pass header.d=axisbank.com header.i=@axisbank.com"
  };

  it("accepts an allow-listed parsed sender with aligned DKIM", () => {
    expect(parseBankEmail(trusted)).toMatchObject({ amountPaise: 99937, utr: "123456789012" });
  });

  it("accepts multiple passing aligned DKIM signatures", () => {
    expect(parseBankEmail({
      ...trusted,
      authenticationResults: "mx.google.com; dkim=pass header.d=axisbank.com header.i=@axisbank.com; dkim=pass header.d=axisbank.com header.i=@axisbank.com"
    })).toMatchObject({ amountPaise: 99937, utr: "123456789012" });
  });

  it("rejects spoofed display names, untrusted domains, and missing or misaligned DKIM", () => {
    expect(parseBankEmail({ ...trusted, from: "alerts@attacker.invalid" })).toBeNull();
    expect(parseBankEmail({ ...trusted, from: "Axis Bank <fraud@attacker.invalid>" })).toBeNull();
    expect(parseBankEmail({ ...trusted, from: "Axis Bank alerts@axisbank.com <alerts@attacker.invalid>" })).toBeNull();
    expect(parseBankEmail({ ...trusted, authenticationResults: "dkim=fail header.d=axisbank.com" })).toBeNull();
    expect(parseBankEmail({ ...trusted, authenticationResults: "dkim=pass header.d=attacker.invalid" })).toBeNull();
    expect(bankEmailDiagnostics({ ...trusted, from: "Axis Bank <alerts@attacker.invalid>" })).toMatchObject({ domainAllowed: false, dkimAligned: false });
  });

  it("keeps a passing result and its DKIM identity in the same clause", () => {
    expect(parseBankEmail({
      ...trusted,
      authenticationResults: "mx.google.com; dkim=pass header.i=@evil.com; dkim=fail header.d=axisbank.in"
    })).toBeNull();
  });

  it("ignores extra Authentication-Results headers after Gmail's topmost header", () => {
    expect(parseBankEmail({
      ...trusted,
      authenticationResults: [
        "mx.google.com; dkim=fail header.d=axisbank.com",
        "mx.google.com; dkim=pass header.d=axisbank.com"
      ]
    })).toBeNull();
  });

  it("ignores ARC authentication results", () => {
    expect(parseBankEmail({
      ...trusted,
      authenticationResults: "mx.google.com; dkim=fail header.d=axisbank.com",
      arcAuthenticationResults: "i=1; dkim=pass header.d=axisbank.com"
    })).toBeNull();
  });

  it("accepts genuine Axis and HDFC samples and an allow-listed parent DKIM domain", () => {
    expect(parseBankEmail(trusted)).not.toBeNull();
    expect(parseBankEmail({
      from: "HDFC Bank <alerts@hdfcbank.net>",
      subject: "Credit alert",
      text: "INR 250.50 has been credited to your account. UTR 223456789012",
      authenticationResults: "mx.google.com; dkim=pass header.d=hdfcbank.net header.i=@hdfcbank.net"
    })).toMatchObject({ amountPaise: 25050, utr: "223456789012" });
    expect(parseBankEmail({
      ...trusted,
      from: "Axis Bank <alerts@alerts.axisbank.com>",
      authenticationResults: "mx.google.com; dkim=pass header.d=axisbank.com"
    })).not.toBeNull();
  });

  it("requires the receiver ID to be in the configured trust list", () => {
    expect(parseBankEmail({ ...trusted, authenticationResults: "mail.example.net; dkim=pass header.d=axisbank.com" })).toBeNull();
    expect(parseBankEmail({ ...trusted, authenticationResults: "mail.example.net; dkim=pass header.d=axisbank.com" }, [], ["mail.example.net"])).not.toBeNull();
  });
});
