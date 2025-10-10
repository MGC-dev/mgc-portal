import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing, avoid crashing middleware
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Do NOT attempt to mutate request cookies in middleware; set on response only
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user: any = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch (e) {
    // Prevent middleware crash if Supabase auth fetch fails
    console.error("Middleware auth getUser failed:", e);
  }

  // Redirect unauthenticated users trying to access mgdashboard to /login
  if (!user && request.nextUrl.pathname.startsWith("/mgdashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect any /auth requests to /register
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  // If user is authenticated and hits /register, optionally send to dashboard
  if (user && request.nextUrl.pathname.startsWith("/register")) {
    return NextResponse.redirect(new URL("/mgdashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclude API routes and static assets from middleware
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
