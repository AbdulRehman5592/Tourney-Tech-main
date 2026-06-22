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
  const form = formidable({
    multiples: false,
    uploadDir: os.tmpdir(), // ✅ Local temp path
    keepExtensions: true,
  });

  const contentType = req.headers.get("content-type");
  const contentLength = req.headers.get("content-length");
  const stream = req.body;

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
