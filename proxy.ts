import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const NATIVE_IOS_MARKER = "strikr-ios";

function nativeBootHtml() {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="theme-color" content="#070B12" />
  <style>
    html,body{margin:0;width:100%;height:100%;background:#070B12;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    body{display:flex;align-items:center;justify-content:center;overflow:hidden}
    .boot{display:flex;min-height:100%;width:100%;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
    .brand{text-align:center;transform:translateY(-2vh)}
    .logo{font-size:42px;line-height:1;font-weight:900;letter-spacing:-2px}
    .claim{margin-top:12px;font-size:10px;font-weight:800;letter-spacing:2.4px;color:rgba(255,255,255,.46)}
    .loader{width:26px;height:26px;margin:28px auto 0;border:3px solid rgba(255,255,255,.12);border-top-color:rgba(255,255,255,.82);border-radius:50%;animation:spin .75s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="boot">
    <div class="brand">
      <div class="logo">strikr</div>
      <div class="claim">JEDES TRAINING ZÄHLT.</div>
      <div class="loader" aria-hidden="true"></div>
    </div>
  </div>
  <script>
    window.setTimeout(function () {
      window.location.replace("/home");
    }, 40);
  </script>
</body>
</html>`;
}

export async function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (
    request.nextUrl.pathname === "/" &&
    userAgent.toLowerCase().includes(NATIVE_IOS_MARKER)
  ) {
    return new NextResponse(nativeBootHtml(), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0",
      },
    });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
