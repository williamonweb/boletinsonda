import { access, copyFile, mkdir } from "node:fs/promises";

await access(new URL("./dist/index.html", import.meta.url));
await mkdir(new URL("./dist/vendor/", import.meta.url), { recursive: true });
await copyFile(
  new URL("./node_modules/html2canvas/dist/html2canvas.min.js", import.meta.url),
  new URL("./dist/vendor/html2canvas.min.js", import.meta.url)
);
console.log("Boletins Onda Animal prontos para publicação.");
