import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const path = request.nextUrl.pathname;

  const protectedPaths = ["/dashboard", "/admin", "/student", "/proctor", "/exam"];
  const isProtected = protectedPaths.some((protectedPath) => path.startsWith(protectedPath));

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
    "/proctor/:path*",
    "/exam/:path*",
  ],
};
