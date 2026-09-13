import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import withSerwistInit from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
    domains: ["res.cloudinary.com"],
  },
};

// @serwist/next's built-in public-folder scan can return backslash-separated
// URLs on Windows (glob doesn't normalize them), which breaks precaching in
// the browser. We scan `public/` ourselves and always emit forward slashes.
function getPublicPrecacheEntries() {
  const publicDir = path.join(process.cwd(), "public");
  const ignoredFiles = new Set(["sw.js", "sw.js.map"]);

  return fs
    .readdirSync(publicDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))
    .filter((absPath) => {
      const relPath = path.relative(publicDir, absPath).replace(/\\/g, "/");
      return !ignoredFiles.has(relPath) && !relPath.startsWith("swe-worker-");
    })
    .map((absPath) => {
      const url = `/${path.relative(publicDir, absPath).replace(/\\/g, "/")}`;
      const revision = crypto.createHash("md5").update(fs.readFileSync(absPath)).digest("hex");
      return { url, revision };
    });
}

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.js",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  additionalPrecacheEntries: getPublicPrecacheEntries(),
});

export default withSerwist(nextConfig);
