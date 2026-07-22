import * as fs from "node:fs";
import * as path from "node:path";
import Handlebars from "handlebars";

const render = (template: string, context: Record<string, string>) => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "templates", `${template}--img-as-url.hbs`),
    "utf8",
  );
  return Handlebars.compile(source)(context);
};

describe("company notification templates", () => {
  it("escapes quotes and HTML-like content in a Unicode restriction reason", () => {
    const html = render("company-access-limited", {
      companyName: 'ООО «Тест & Партнёры»',
      accessState: "приостановлен",
      reason: '<script>alert("нет")</script> — причина',
      managerName: "Иван Иванов",
      managerPhone: "+7 999 000-00-00",
      managerEmail: "manager@example.com",
    });

    expect(html).toContain("ООО «Тест &amp; Партнёры»");
    expect(html).toContain("&lt;script&gt;alert(&quot;нет&quot;)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("renders the maximum allowed reason without truncating it", () => {
    const reason = "Я".repeat(2000);
    const html = render("company-access-limited", {
      companyName: "Компания",
      accessState: "заблокирован",
      reason,
      managerName: "Менеджер",
      managerPhone: "—",
      managerEmail: "support@trinity.ru",
    });

    expect(html).toContain(reason);
  });

  it("escapes restored-access content", () => {
    const html = render("company-access-restored", {
      companyName: "Компания <Тест>",
      message: "Доступ восстановлен & заявка открыта",
    });

    expect(html).toContain("Компания &lt;Тест&gt;");
    expect(html).toContain("Доступ восстановлен &amp; заявка открыта");
  });
});
