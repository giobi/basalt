export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /auth/* (authentication pages)
     * - /_next/* (Next.js internals)
     * - /api/auth/* (NextAuth.js routes)
     * - /favicon.ico, /robots.txt (static files)
     */
    '/((?!auth|_next|api/auth|favicon.ico|robots.txt).*)',
  ],
}
