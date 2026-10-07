"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormMessage } from "@/features/auth/view/AuthPanel";
import { useAdminLogin } from "@/features/admin/viewmodel/useAdminLogin";

export default function AdminLoginScreen({ next }: { next: string | null }) {
  const vm = useAdminLogin(next);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-12 text-fg">
      <div className="grid w-full max-w-sm gap-6">
        <div className="grid gap-1 text-center">
          <p className="text-2xl font-extrabold tracking-tight">
            E-Ticket <span className="text-accent-text">Admin</span>
          </p>
          <p className="text-sm text-muted">Authorized administrators only.</p>
        </div>

        <form
          noValidate
          className="grid gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void vm.onSubmit();
          }}
        >
          <Field label="Email">
            {(props) => (
              <Input {...props} type="email" autoComplete="username" value={vm.email} onChange={(event) => vm.setEmail(event.target.value)} />
            )}
          </Field>
          <Field label="Password">
            {(props) => (
              <div className="relative">
                <Input
                  {...props}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-16"
                  value={vm.password}
                  onChange={(event) => vm.setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-muted hover:text-fg"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            )}
          </Field>
          {vm.error ? <FormMessage tone="error">{vm.error}</FormMessage> : null}
          <Button type="submit" size="lg" isLoading={vm.isSubmitting} disabled={!vm.email.trim() || !vm.password}>
            Log in to admin
          </Button>
          <Link href="/forgot-password" className="justify-self-center text-sm font-semibold text-muted hover:text-fg">
            Forgot password?
          </Link>
        </form>
      </div>
    </main>
  );
}
