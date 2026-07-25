import { PageHeader } from '@/components/app/page-header'
import { SettingsNav } from '@/components/app/settings-nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your profile, this workspace and its plan."
        className="pb-4 lg:pb-5"
      />
      <SettingsNav />
      <div className="mx-auto w-full max-w-3xl px-5 py-6 lg:px-8 lg:py-8">{children}</div>
    </>
  )
}
