import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {

  const token = request.cookies.get("token")?.value;

  const protectedPaths = [
    "/dashboard",
    "/admin",
    "/student",
    "/proctor"
  ];

  const path = request.nextUrl.pathname;

  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/student/:path*",
    "/proctor/:path*"
  ],
};