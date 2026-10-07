"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import { FormMessage } from "@/features/auth/view/AuthPanel";
import { OrganizerProfileForm } from "@/features/organizer/view/OrganizerProfileForm";
import { useOrganizationProfile } from "@/features/manager/viewmodel/useOrganizationProfile";

export default function OrganizationScreen() {
  const vm = useOrganizationProfile();

  return (
    <>
      <PageHeader
        title="Organization profile"
        description="Your name, logo and description appear on your events as “Hosted by”. Your phone number stays private."
      />
      {vm.error ? (
        <ErrorState message={vm.error} />
      ) : vm.isLoading ? (
        <SkeletonRows rows={6} label="Loading profile" />
      ) : !vm.profile ? (
        <ErrorState message="No organizer profile found." />
      ) : (
        <Card className="max-w-3xl">
          <form
            noValidate
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void vm.save();
            }}
          >
            <OrganizerProfileForm form={vm.form} disabled={vm.isSaving} />
            {vm.saveError ? <FormMessage tone="error">{vm.saveError}</FormMessage> : null}
            <Button type="submit" size="lg" isLoading={vm.isSaving} className="justify-self-start">
              Save profile
            </Button>
          </form>
        </Card>
      )}
    </>
  );
}
