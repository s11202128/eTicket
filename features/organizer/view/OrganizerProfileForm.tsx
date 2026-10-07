"use client";

import Image from "next/image";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { EVENT_TYPES } from "@/features/organizer/model/organizer.schema";
import type { OrganizerFormState } from "@/features/organizer/viewmodel/useOrganizerForm";

// The organizer profile fields (no submit button: the parent owns the form).
export function OrganizerProfileForm({ form, disabled }: { form: OrganizerFormState; disabled?: boolean }) {
  const { values, errors } = form;
  const typesLabelId = useId();
  const logoInputId = useId();

  return (
    <div className="grid gap-4">
      <Field label="Organization or brand name" required error={errors.organizationName}>
        {(props) => (
          <Input
            {...props}
            autoComplete="organization"
            disabled={disabled}
            value={values.organizationName}
            onChange={(event) => form.setField("organizationName", event.target.value)}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" required error={errors.phone} hint="Only our team sees this.">
          {(props) => (
            <Input
              {...props}
              type="tel"
              autoComplete="tel"
              disabled={disabled}
              value={values.phone}
              onChange={(event) => form.setField("phone", event.target.value)}
            />
          )}
        </Field>
        <Field label="City" error={errors.city}>
          {(props) => (
            <Input
              {...props}
              autoComplete="address-level2"
              disabled={disabled}
              value={values.city}
              onChange={(event) => form.setField("city", event.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Website or social page" error={errors.website} hint="e.g. facebook.com/yourpage">
        {(props) => (
          <Input
            {...props}
            inputMode="url"
            disabled={disabled}
            value={values.website}
            onChange={(event) => form.setField("website", event.target.value)}
          />
        )}
      </Field>

      <fieldset className="grid gap-2" aria-describedby={errors.eventTypes ? `${typesLabelId}-error` : undefined}>
        <legend id={typesLabelId} className="mb-1.5 text-sm font-semibold text-fg">
          Types of events you host<span className="text-accent-text"> *</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((type) => {
            const selected = values.eventTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => form.toggleEventType(type)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50",
                  selected ? "border-accent bg-accent text-on-accent" : "border-border bg-surface text-muted hover:text-fg"
                )}
              >
                {type}
              </button>
            );
          })}
        </div>
        {errors.eventTypes ? (
          <p id={`${typesLabelId}-error`} role="alert" className="text-xs font-medium text-danger">
            {errors.eventTypes}
          </p>
        ) : null}
      </fieldset>

      <Field label="About your events" error={errors.description} hint="What you organize, how often, typical audience size.">
        {(props) => (
          <Textarea
            {...props}
            rows={4}
            disabled={disabled}
            value={values.description}
            onChange={(event) => form.setField("description", event.target.value)}
          />
        )}
      </Field>

      <div className="grid gap-1.5">
        <label htmlFor={logoInputId} className="text-sm font-semibold text-fg">
          Logo <span className="font-normal text-muted">(optional)</span>
        </label>
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2 text-xs text-muted">
            {form.logoPreview ? (
              <Image src={form.logoPreview} alt="Logo preview" width={64} height={64} unoptimized className="size-16 object-cover" />
            ) : (
              "No logo"
            )}
          </span>
          <div className="grid gap-1">
            <input
              id={logoInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              onChange={(event) => form.setLogo(event.target.files?.[0] ?? null)}
              className="text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-fg hover:file:bg-surface-2"
            />
            <p className="text-xs text-muted">JPG, PNG or WebP, up to 2 MB.</p>
          </div>
        </div>
        {form.logoError ? (
          <p role="alert" className="text-xs font-medium text-danger">
            {form.logoError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
