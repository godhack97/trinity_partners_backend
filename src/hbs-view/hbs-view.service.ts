import { Injectable } from "@nestjs/common";
import * as fs from "node:fs";
import * as process from "node:process";
import { join } from "path";
import * as Handlebars from "handlebars";

@Injectable()
export class HbsViewService {
  hbs: typeof Handlebars;
  templatesDir = join(process.cwd(), 'templates')

  constructor() {
    this.hbs = Handlebars.create();

    // Регистрируем helper для сравнения
    this.hbs.registerHelper('eq', function(a, b) {
      return a === b;
    });
  }

  createHtml({ template, context }) {
    // Компиляция шаблона страницы
    const compileTemplate = this.compileTemplate(template);

    return this.render(compileTemplate, context);
  }

  // не сработало
  private registerPartial(name: string, filePath: string): void {
    let path = join(this.templatesDir, filePath);
    console.log(path)
    const template = fs.readFileSync(path, 'utf-8');
    return this.hbs.registerPartial(name, template);
  }

  // Компиляция шаблона
  private compileTemplate(templatePath: string): Handlebars.TemplateDelegate {
    let path = join(this.templatesDir, templatePath);
    console.log(path)
    const template = fs.readFileSync(path, 'utf-8');
    return this.hbs.compile(template);
  }

  // Рендеринг
  private render(template: Handlebars.TemplateDelegate, context: object): string {
    return template(context);
  }
}