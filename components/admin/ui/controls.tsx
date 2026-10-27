"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const field =
  "min-h-10 w-full rounded-[10px] border border-zinc-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500";
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 focus-visible:ring-offset-2 dark:focus-visible:ring-emerald-400/50 dark:focus-visible:ring-offset-zinc-950";

export function AdminCard({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const reduce = useReducedMotion();
  return <motion.section {...(props as unknown as React.ComponentProps<typeof motion.section>)} className={cn("admin-card", className)} whileHover={reduce ? undefined : { y: -2 }} transition={{ duration: 0.18 }} />;
}

export function AdminButton({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  const tones = {
    primary: "border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400",
    outline: "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800",
    ghost: "border border-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
    danger: "border border-rose-700 bg-rose-700 text-white hover:bg-rose-800 dark:border-rose-500 dark:bg-rose-500 dark:text-zinc-950 dark:hover:bg-rose-400"
  };
  const sizes = { sm: "min-h-9 px-3 text-xs", md: "min-h-10 px-3.5 text-sm", lg: "min-h-11 px-4 text-sm" };
  return <button {...props} type={type} disabled={props.disabled || loading} aria-busy={loading || undefined} className={cn("admin-button inline-flex items-center justify-center gap-2 rounded-[11px] font-medium disabled:pointer-events-none disabled:opacity-50", focus, `admin-button--${variant}`, tones[variant], sizes[size], className)}>{loading ? <LoaderCircle aria-hidden className="admin-button__spinner h-4 w-4" /> : null}{props.children}</button>;
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("admin-input", field, focus, props.className)} />;
}

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("admin-input", field, "min-h-24 py-2", focus, props.className)} />;
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("admin-input", field, focus, props.className)} />;
}

export function AdminLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn("block text-sm font-medium text-zinc-800 dark:text-zinc-200", className)} />;
}

export function AdminField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</div>
      {children}
    </div>
  );
}

export function AdminEmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-card grid min-h-48 place-items-center border-dashed px-5 py-8 text-center">
      <div className="max-w-sm">
        {icon ? <div className="admin-empty-illustration">{icon}</div> : null}
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export function AdminErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100" role="alert">
      <p>{message}</p>
      {retry ? <AdminButton variant="outline" onClick={retry}>Retry</AdminButton> : null}
    </div>
  );
}

export function AdminTabs<T extends string>({
  value,
  items,
  onChange,
  label = "Page sections"
}: {
  value: T;
  items: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const indicatorId = React.useId();
  return (
    <div className="admin-tab-list -mx-1 flex max-w-full gap-1 overflow-x-auto rounded-[13px] p-1" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={cn("admin-tab-trigger min-h-9 shrink-0 rounded-[10px] px-3 text-sm font-medium transition-colors", focus, value === item.value ? "text-zinc-950 dark:text-white" : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white")}
          onClick={() => onChange(item.value)}
        >
          {value === item.value ? <motion.span layoutId={`admin-tab-${indicatorId}`} aria-hidden className="admin-tab-indicator" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} /> : null}
          <span className="relative z-10">{item.label}{item.count != null ? <span className="ml-1.5 tabular-nums text-xs opacity-70">{item.count}</span> : null}</span>
        </button>
      ))}
    </div>
  );
}

const legacyButtonTone = {
  default: "border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400",
  gradient: "border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400",
  accent: "border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400",
  outline: "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800",
  secondary: "border border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
  ghost: "border border-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
  destructive: "border border-rose-700 bg-rose-700 text-white hover:bg-rose-800 dark:border-rose-500 dark:bg-rose-500 dark:text-zinc-950 dark:hover:bg-rose-400",
  link: "border border-transparent text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400",
  skeuo: "border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400",
  neu: "border border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
} as const;

const legacyButtonSize = {
  default: "min-h-10 px-3.5 text-sm",
  sm: "min-h-9 px-3 text-xs",
  lg: "min-h-11 px-4 text-sm",
  icon: "h-10 w-10",
  "icon-sm": "h-8 w-8"
} as const;

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof legacyButtonTone;
    size?: keyof typeof legacyButtonSize;
    asChild?: boolean;
  }
>(({ variant = "default", size = "default", asChild = false, className, ...props }, ref) => {
  const Component = asChild ? Slot : "button";
  return <Component ref={ref} {...props} className={cn("admin-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[11px] font-medium disabled:pointer-events-none disabled:opacity-50", `admin-button--${variant === "default" ? "primary" : variant}`, focus, legacyButtonTone[variant], legacyButtonSize[size], className)} />;
});
Button.displayName = "AdminButton";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const reduce = useReducedMotion();
  return <motion.div ref={ref} {...(props as unknown as React.ComponentProps<typeof motion.div>)} className={cn("admin-card text-zinc-950 dark:text-zinc-50", className)} whileHover={reduce ? undefined : { y: -2 }} transition={{ duration: 0.18 }} />;
});
Card.displayName = "AdminCard";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} {...props} className={cn("flex flex-col space-y-1.5 p-4 sm:p-5", className)} />
));
CardHeader.displayName = "AdminCardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h2 ref={ref} {...props} className={cn("text-base font-semibold leading-tight tracking-tight", className)} />
));
CardTitle.displayName = "AdminCardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} {...props} className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)} />
));
CardDescription.displayName = "AdminCardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} {...props} className={cn("p-4 pt-0 sm:p-5 sm:pt-0", className)} />
));
CardContent.displayName = "AdminCardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} {...props} className={cn("flex items-center gap-2 p-4 pt-0 sm:p-5 sm:pt-0", className)} />
));
CardFooter.displayName = "AdminCardFooter";

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "accent" | "destructive" | "outline" | "success" | "warning" | "info" }) {
  const tone = {
    default: "border-transparent bg-emerald-700 text-white dark:bg-emerald-500 dark:text-zinc-950",
    secondary: "border-transparent bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    accent: "border-transparent bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    destructive: "border-transparent bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
    outline: "border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200",
    success: "border-transparent bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    warning: "border-transparent bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    info: "border-transparent bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200"
  }[variant];
  return <span {...props} className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", tone, className)} />;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input ref={ref} type={type} {...props} className={cn("min-h-10 w-full rounded-[10px] border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500", focus, className)} />
));
Input.displayName = "AdminInput";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} {...props} className={cn("min-h-24 w-full rounded-[10px] border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500", focus, className)} />
));
Textarea.displayName = "AdminTextarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn("text-sm font-medium leading-none text-zinc-800 dark:text-zinc-200", className)} />;
}
