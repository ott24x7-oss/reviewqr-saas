"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { useAuthLang } from "@/components/auth/otp-ui";

export function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  minLength,
  required
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [show, setShow] = React.useState(false);
  const { t } = useAuthLang();
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 pr-16"
      />
      <button
        type="button"
        className="auth-eye"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? t.hidePassword : t.showPassword}
        aria-pressed={show}
      >
        {show ? t.hidePassword : t.showPassword}
      </button>
    </div>
  );
}
