"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: string }) {
  return <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", variant === "secondary" ? "border-transparent bg-secondary text-secondary-foreground" : "border-transparent bg-primary text-primary-foreground", className)} {...props} />;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("text-sm font-medium leading-none", className)} {...props} />
));
Label.displayName = "Label";

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

const TabsCtx = React.createContext<{ value: string; onChange: (v: string) => void }>({ value: "", onChange: () => {} });
export function Tabs({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) {
  return <TabsCtx.Provider value={{ value, onChange: onValueChange }}><div>{children}</div></TabsCtx.Provider>;
}
export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1", className)}>{children}</div>;
}
export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsCtx);
  return <button className={cn("inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all", ctx.value === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground", className)} onClick={() => ctx.onChange(value)}>{children}</button>;
}

const SelCtx = React.createContext<{ value: string; onChange: (v: string) => void; open: boolean; setOpen: (o: boolean) => void }>({ value: "", onChange: () => {}, open: false, setOpen: () => {} });
export function Select({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <SelCtx.Provider value={{ value, onChange: (v) => { onValueChange(v); setOpen(false); }, open, setOpen }}><div className="relative">{children}</div></SelCtx.Provider>;
}
export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(SelCtx);
  return <button type="button" onClick={() => ctx.setOpen(!ctx.open)} className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm", className)}>{children}<span className="text-xs opacity-40 ml-2">▼</span></button>;
}
export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelCtx);
  return <span className={ctx.value ? "" : "text-muted-foreground"}>{ctx.value || placeholder}</span>;
}
export function SelectContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(SelCtx);
  if (!ctx.open) return null;
  return <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg p-1 max-h-60 overflow-auto">{children}</div>;
}
export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelCtx);
  return <button type="button" onClick={() => ctx.onChange(value)} className={cn("w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-muted", ctx.value === value && "bg-muted font-medium")}>{children}</button>;
}

export function Slider({ value, onValueChange, max = 100, step = 1, className }: { value: number[]; onValueChange: (v: number[]) => void; max?: number; step?: number; className?: string }) {
  return <input type="range" min={0} max={max} step={step} value={value[0]} onChange={(e) => onValueChange([parseInt(e.target.value)])} className={cn("w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary", className)} />;
}

const DlgCtx = React.createContext<{ open: boolean; setOpen: (o: boolean) => void }>({ open: false, setOpen: () => {} });
export function Dialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <DlgCtx.Provider value={{ open, setOpen }}>{children}</DlgCtx.Provider>;
}
export function DialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const ctx = React.useContext(DlgCtx);
  return <span onClick={() => ctx.setOpen(true)} className="cursor-pointer">{children}</span>;
}
export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(DlgCtx);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!ctx.open || !mounted) return null;

  // createPortal renders directly into document.body, completely escaping any
  // parent CSS transform (e.g. animate-in) that would break position:fixed
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}
      onClick={() => ctx.setOpen(false)}
    >
      <div style={{ display: 'flex', minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div
          className={cn("bg-background rounded-xl shadow-xl p-6 w-full max-w-2xl", className)}
          style={{ position: 'relative', margin: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
export function DialogHeader({ children }: { children: React.ReactNode }) { return <div className="mb-4">{children}</div>; }
export function DialogTitle({ children }: { children: React.ReactNode }) { return <h2 className="text-lg font-semibold">{children}</h2>; }

// ── Toast System ────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  message: string;
  variant?: 'default' | 'destructive' | 'success';
}

const ToastCtx = React.createContext<{ toast: (t: Omit<Toast, 'id'>) => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback(({ message, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "px-4 py-3 rounded-lg shadow-2xl border text-sm font-medium animate-in slide-in-from-right-full transition-all flex items-center justify-between min-w-[280px]",
              t.variant === 'destructive' ? "bg-red-50 border-red-200 text-red-800" :
              t.variant === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
              "bg-white border-border text-foreground"
            )}
          >
            <span>{t.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="ml-4 opacity-50 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastCtx);
}
