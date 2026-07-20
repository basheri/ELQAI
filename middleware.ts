import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // WHY: auth disabled for development — pass all requests through
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
