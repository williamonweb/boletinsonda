import { access } from "node:fs/promises";

await access(new URL("./dist/index.html", import.meta.url));
console.log("Boletins Onda Animal prontos para publicação.");
