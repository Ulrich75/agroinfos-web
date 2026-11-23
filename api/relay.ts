// Relais Vercel : équivalent en production du proxy Vite (vite.config.ts).
// Le navigateur appelle /api/v1/..., vercel.json réécrit vers /api/relay?__path=...,
// et cette fonction transmet à la passerelle en ajoutant la clé. La clé reste côté serveur.

declare const process: { env: Record<string, string | undefined> };

function envelopeError(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, data: null, meta: { timestamp: new Date().toISOString() }, error: { code, message } },
    { status },
  );
}

export async function GET(request: Request): Promise<Response> {
  const key = process.env.AGRI_API_KEY;
  const base = process.env.AGRI_API_URL;
  if (!key || !base) {
    return envelopeError(500, "RELAY_NOT_CONFIGURED", "AGRI_API_KEY ou AGRI_API_URL manquante sur Vercel.");
  }

  const incoming = new URL(request.url);
  const path = incoming.searchParams.get("__path") ?? "";
  incoming.searchParams.delete("__path");
  if (path.includes("..")) {
    return envelopeError(400, "INVALID_PATH", "Chemin invalide.");
  }

  const target = new URL(`/api/v1/${path}`, base.replace(/\/+$/, "") + "/");
  target.search = incoming.searchParams.toString();

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { "X-API-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return envelopeError(502, "GATEWAY_UNREACHABLE", "La passerelle de l'API est injoignable.");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
