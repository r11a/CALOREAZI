export function GET() {
  return Response.json({ status: "ok", service: "caloreazi", version: "1.5.2", build: process.env.CALOREAZI_BUILD_COMMIT || "development" });
}
