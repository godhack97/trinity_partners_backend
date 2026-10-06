import * as fs from "node:fs";
import * as path from "node:path";
import * as Handlebars from "handlebars";

describe("recovery email templates", () => {
  const link =
    "https://xn--80akxggcl.xn--h1aaasnle.xn--p1ai/recovery" +
    "?email=user%2Btest%40example.com&verify=" +
    "a".repeat(64);

  for (const template of [
    "recover--img-as-url.hbs",
    "recover--img-as-base64.hbs",
  ]) {
    it(`keeps the recovery query string clickable in ${template}`, () => {
      const source = fs.readFileSync(
        path.join(process.cwd(), "templates", template),
        "utf8",
      );
      const html = Handlebars.compile(source)({ link });

      expect(html).toContain(`href="${link}"`);
      expect(html).not.toContain("&#x3D;");
      expect(html).toContain("Ссылка действует 1 час");
    });
  }
});
