/**
 * Custom Node.js server for cPanel hosting.
 * Wraps Next.js and handles non-standard HTTP methods (PROPFIND, REPORT, MKCALENDAR)
 * required by CalDAV protocol — these methods are not natively supported by
 * Next.js App Router, so we route them manually to our CalDAV handler.
 */

const http = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// CalDAV custom methods that Next.js doesn't recognise
const CALDAV_METHODS = new Set(["PROPFIND", "REPORT", "MKCALENDAR", "PROPPATCH", "MKCOL"]);

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Intercept CalDAV custom methods on /api/caldav/* path.
      // Rewrite the method to POST so Next.js routes it to our handler,
      // and pass the original method via header so the handler can dispatch.
      if (
        CALDAV_METHODS.has(req.method) &&
        pathname &&
        pathname.startsWith("/api/caldav/")
      ) {
        req.headers["x-original-method"] = req.method;
        req.method = "POST";
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Server error:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  server.on("error", (err) => {
    console.error("Server listen error:", err);
    process.exit(1);
  });
});
