// Upload generated product images (PATCH products.image via multipart).
//   node upload-images.mjs <baseUrl> <imageDir>
import { readFile, readdir } from "node:fs/promises";
import { join, basename } from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:8090";
const DIR = process.argv[3] || "/tmp/prodimg";
const API = `${BASE}/api`;

const login = await fetch(`${API}/collections/employees/auth-with-password`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identity: "admin", password: "password" }),
}).then((r) => r.json());
const token = login.token;
if (!token) throw new Error("login failed");

let ok = 0, missing = 0;
for (const file of await readdir(DIR)) {
  if (!file.endsWith(".png")) continue;
  const code = basename(file, ".png");
  const found = await fetch(
    `${API}/collections/products/records?perPage=1&filter=${encodeURIComponent(`product_code='${code}'`)}`,
    { headers: { Authorization: token } }
  ).then((r) => r.json());
  if (!found.items?.length) { console.log("no product for", code); missing++; continue; }

  const form = new FormData();
  const buf = await readFile(join(DIR, file));
  form.append("image", new Blob([buf], { type: "image/png" }), `${code}.png`);
  const res = await fetch(`${API}/collections/products/records/${found.items[0].id}`, {
    method: "PATCH", headers: { Authorization: token }, body: form,
  });
  if (!res.ok) { console.log("upload failed", code, res.status, (await res.text()).slice(0, 150)); continue; }
  ok++;
}
console.log(`uploaded ${ok} images, ${missing} without product`);
