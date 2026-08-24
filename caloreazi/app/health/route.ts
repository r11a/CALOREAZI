export function GET() {
  return Response.json({ status: "ok", service: "caloreazi", version: "1.18.18", build: process.env.CALOREAZI_BUILD_COMMIT || "development" });
}
