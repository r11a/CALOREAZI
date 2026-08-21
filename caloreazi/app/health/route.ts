export function GET() {
  return Response.json({ status: "ok", service: "caloreazi", version: "1.7.6", build: process.env.CALOREAZI_BUILD_COMMIT || "development" });
}
