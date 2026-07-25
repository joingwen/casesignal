import type { Metadata } from 'next'
import { CheckCircle2, Info } from 'lucide-react'

import { missingSetupNotes } from '@/lib/env'
import { requireSession } from '@/server/auth/session'
import { listCases } from '@/server/queries/cases'
import { pluralize } from '@/lib/utils'
import { DeleteAllCases, WorkspaceNameForm } from '@/components/app/workspace-settings'

export const metadata: Metadata = {
  title: 'Workspace',
  description: 'Workspace name, environment configuration and data removal.',
}

export default async function WorkspaceSettingsPage() {
  const session = await requireSession()
  const cases = await listCases(session, { status: 'all' })
  const notes = missingSetupNotes()
  const readOnly = session.membershipRole === 'viewer'

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="workspace-heading">
        <h2 id="workspace-heading" className="text-[17px] font-medium tracking-tight text-ink">
          Workspace
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
          {pluralize(cases.length, 'case')} in {session.organization.name}.
        </p>

        <div className="mt-5">
          <WorkspaceNameForm name={session.organization.name} readOnly={readOnly} />
        </div>
      </section>

      {/* ------------------------------------------------------ configuration */}
      <section aria-labelledby="configuration-heading" className="border-t border-line pt-8">
        <h2 id="configuration-heading" className="text-[17px] font-medium tracking-tight text-ink">
          Configuration
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
          What this deployment has credentials for. Everything runs without them — features degrade
          with a stated reason rather than failing.
        </p>

        {notes.length === 0 ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-panel border border-status-supported/30 bg-status-supported-soft p-4">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-status-supported"
              aria-hidden="true"
            />
            <p className="text-[13px] leading-relaxed text-ink">
              <span className="font-medium text-status-supported">All services configured.</span>{' '}
              Authentication, database, storage, analysis, retrieval and billing are all using their
              production providers.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {notes.map((note) => (
              <li key={note.key} className="flex items-start gap-2.5 py-3.5">
                <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-ink">{note.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-secondary">
                    {note.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------------- danger zone */}
      <section aria-labelledby="danger-heading" className="border-t border-line pt-8">
        <h2 id="danger-heading" className="text-[17px] font-medium tracking-tight text-ink">
          Danger zone
        </h2>

        <div className="mt-4 rounded-panel border border-status-contradicted/30 p-4">
          <p className="text-[14px] font-medium text-ink">Delete all cases</p>
          <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-ink-secondary">
            Removes every case, uploaded record, extracted excerpt and derived finding in this
            workspace, and revokes any public evidence rooms. Provided so you can remove sensitive
            material yourself, without contacting anyone. It cannot be undone.
          </p>
          <div className="mt-4">
            {readOnly ? (
              <p className="text-[13px] text-ink-muted">
                You have read-only access to this workspace, so cases cannot be deleted here.
              </p>
            ) : (
              <DeleteAllCases caseCount={cases.length} />
            )}
            {!readOnly && cases.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                There are no cases in this workspace to delete.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
