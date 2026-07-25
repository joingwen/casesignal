import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

import { capabilities } from '@/lib/env'

/**
 * Route protection.
 *
 * With Clerk configured, `/app/*` requires a signed-in user. Without keys the
 * middleware is a pass-through: `getSession()` still gates every `/app` page on
 * the local development cookie and redirects to `/sign-in` when it is absent,
 * so the guarantee holds in both modes.
 */
const isProtectedRoute = createRouteMatcher(['/app(.*)'])

let handler: NextMiddleware | null = null

function clerkHandler(): NextMiddleware {
  handler ??= clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) await auth.protect()
  })
  return handler
}

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!capabilities.clerkAuth) return NextResponse.next()
  return clerkHandler()(request, event)
}

export const config = {
  matcher: [
    // Everything except Next internals and static files, unless they carry search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|pdf|txt)).*)',
    '/(api|trpc)(.*)',
    // Clerk's auto-proxy path — handshake, satellite and OAuth callbacks.
    '/__clerk/:path*',
  ],
}
