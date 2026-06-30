// src\utils\server\parseForm.js

import formidable from "formidable";
import { Readable } from "stream";
import os from "os";

// Wrapper to convert Web ReadableStream to Node-like stream
class ReadableStreamWrapper extends Readable {
  constructor(stream) {
    super();
    const reader = stream.getReader();
    this._reader = reader;
  }

  async _read() {
    const { done, value } = await this._reader.read();
    if (done) this.push(null);
    else this.push(Buffer.from(value));
  }
}

export async function parseForm(req) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const jsonBody = await req.json();
      return {
        fields: typeof jsonBody === "object" && jsonBody !== null ? jsonBody : {},
        files: {},
      };
    } catch {
      return { fields: {}, files: {} };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    return {
      fields: Object.fromEntries(params.entries()),
      files: {},
    };
  }

  const form = formidable({
    multiples: false,
    uploadDir: os.tmpdir(), // ✅ Local temp path
    keepExtensions: true,
  });

  const contentLength = req.headers.get("content-length");
  const stream = req.body;

  if (!stream) {
    return { fields: {}, files: {} };
  }

  const readable = new ReadableStreamWrapper(stream);
  readable.headers = {
    "content-type": contentType,
    "content-length": contentLength,
  };

  return new Promise((resolve, reject) => {
    form.parse(readable, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}
