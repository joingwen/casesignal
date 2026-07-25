/**
 * Clerk's hosted components, retuned to the CaseSignal tokens.
 *
 * Near-black primary action, hairline inputs, no purple, no drop shadow — the
 * sign-in card should be indistinguishable from the rest of the product.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#111111',
    colorText: '#111111',
    colorTextSecondary: '#676762',
    colorBackground: '#FFFFFF',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#111111',
    colorDanger: '#B4544C',
    colorSuccess: '#3D7A5A',
    colorWarning: '#A67A16',
    borderRadius: '8px',
    fontFamily: 'var(--font-geist-sans)',
    fontSize: '14px',
  },
  elements: {
    rootBox: 'w-full',
    card: 'w-full bg-canvas border border-line rounded-panel shadow-none p-6',
    cardBox: 'w-full shadow-none border-0',
    header: 'hidden',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton:
      'border border-line-strong bg-canvas text-ink rounded-control hover:bg-surface',
    socialButtonsBlockButtonText: 'text-ink font-medium',
    dividerLine: 'bg-line',
    dividerText: 'text-ink-muted text-xs',
    formFieldLabel: 'text-ink text-[13px] font-medium',
    formFieldInput: 'border border-line bg-canvas text-ink rounded-control focus:border-evidence',
    formButtonPrimary:
      'bg-ink text-white rounded-control text-sm font-medium normal-case shadow-none hover:bg-ink/90',
    footer: 'hidden',
    footerAction: 'hidden',
    footerActionText: 'text-ink-secondary',
    footerActionLink: 'text-ink underline underline-offset-4 hover:text-evidence',
    identityPreviewEditButton: 'text-evidence',
    formResendCodeLink: 'text-evidence',
    otpCodeFieldInput: 'border border-line text-ink',
    badge: 'bg-surface text-ink-secondary',
  },
} as const
