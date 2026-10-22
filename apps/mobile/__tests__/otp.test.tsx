import { fireEvent, render } from "@testing-library/react-native";
import { I18nProvider } from "../src/i18n";
import { canResend, channelLabel, devCodeFrom, digitsFrom, secondsUntilResend } from "../src/auth/otp";
import { OtpCodeForm } from "../src/ui/otp-form";

describe("OTP helpers", () => {
  it("names the channel the API returned", () => {
    expect(channelLabel("whatsapp", "en")).toBe("Code sent on WhatsApp");
    expect(channelLabel("email", "en")).toBe("Code sent on email");
    expect(channelLabel("whatsapp", "hi")).toBe("कोड WhatsApp पर भेजा गया");
    expect(channelLabel(undefined, "en")).toBe("Code sent on WhatsApp");
  });

  it("keeps six digits from a pasted message", () => {
    expect(digitsFrom("Your code is 123-456.")).toBe("123456");
    expect(digitsFrom("12")).toBe("12");
  });

  it("waits for resendAfterSec", () => {
    const sent = 1_000_000;
    expect(canResend(sent, 30, sent + 29_000)).toBe(false);
    expect(secondsUntilResend(sent, 30, sent + 10_000)).toBe(20);
    expect(canResend(sent, 30, sent + 30_000)).toBe(true);
  });

  it("shows a dev code only when the API sent one", () => {
    expect(devCodeFrom({})).toBeNull();
    expect(devCodeFrom({ devCode: "nope" })).toBeNull();
    expect(devCodeFrom({ devCode: "123456" })).toBe("123456");
  });
});

describe("OTP code screen", () => {
  function renderForm(devCode: string | null, secondsLeft = 12) {
    const onCode = jest.fn();
    const onResend = jest.fn();
    const view = render(
      <I18nProvider>
        <OtpCodeForm
          channel="email"
          devCode={devCode}
          code=""
          onCode={onCode}
          secondsLeft={secondsLeft}
          onResend={onResend}
          onChangeNumber={jest.fn()}
          onSubmit={jest.fn()}
        />
      </I18nProvider>
    );
    return { ...view, onCode, onResend };
  }

  it("says the code went by email and hides a missing dev code", () => {
    const view = renderForm(null);
    expect(view.getByText("Code sent on email")).toBeTruthy();
    expect(view.queryByText(/Dev code/)).toBeNull();
    expect(view.getByText("Resend in 12s")).toBeTruthy();
  });

  it("shows the dev code and accepts a pasted SMS", () => {
    const view = renderForm("654321", 0);
    expect(view.getByText("Dev code: 654321")).toBeTruthy();
    fireEvent.changeText(view.getByLabelText("Enter the code"), "Code 111222 extra");
    expect(view.onCode).toHaveBeenCalledWith("111222");
    fireEvent.press(view.getByText("Resend code"));
    expect(view.onResend).toHaveBeenCalled();
  });
});
