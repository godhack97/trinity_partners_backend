const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const XLSX = require("xlsx");

const execute = process.argv.includes("--execute");
const fileArg = process.argv
  .slice(2)
  .find((argument) => !argument.startsWith("--"));

if (!fileArg) {
  console.error(
    "Usage: node scripts/import-recommended-configs-from-xlsx.js <file.xlsx> [--execute]",
  );
  process.exit(1);
}

const sourceFile = path.resolve(fileArg);
if (!fs.existsSync(sourceFile)) {
  console.error(`File not found: ${sourceFile}`);
  process.exit(1);
}

const CATEGORY_MAP = {
  "ИИ + МО": { slug: "ai-ml", label: "ИИ и машинное обучение" },
  HPC: { slug: "hpc", label: "HPC" },
  Render: { slug: "render", label: "Рендеринг" },
  VDI: { slug: "vdi", label: "VDI" },
  Data: { slug: "data", label: "Работа с данными" },
  Block: { slug: "blockchain", label: "Блокчейн" },
};

const COMPONENT_ALIASES = {
  "480 Gb SSD SATA 1DWPD": '2.5" | 480 GB SSD SATA 1DWPD',
  "3.84 Tb SSD SAS 1DWPD": '2.5" | 3.84 TB SSD SAS 1DWPD',
  "7.68 Tb NVMe U.2 1DWPD": '2.5" | 7.68 TB NVMe U.2 1DWPD',
  "3.84 Tb NVMe U.2 1DWPD": '2.5" | 3.84 TB NVMe U.2 1DWPD',
  "15.36 Tb NVMe U.2 1DWPD": '2.5" | 15.36 TB NVMe U.2 1DWPD',
  "1.92 Tb NVMe U.2 1DWPD": '2.5" | 1.92 TB NVMe U.2 1DWPD',
  '8TB 3.5" 7200 RPM NL-SAS': '3.5" | 8TB 3.5" 7200 RPM NL-SAS',
  '12TB 3.5" 7200 RPM NL-SAS': '3.5" | 12TB 3.5" 7200 RPM NL-SAS',
  '20TB 3.5" 7200 RPM NL-SAS': '3.5" | 20TB 3.5" 7200 RPM NL-SAS',
  "Tesla A10 24 Gb": "NVIDIA A10 24 Gb",
  "Tesla H100 80 Gb": "NVIDIA H100 PCIe 80GB",
  "Tesla H100 NVL 94 Gb": "NVIDIA H100 NVL 94GB",
  "Tesla H200 NVL 141GB": "NVIDIA H200 NVL 141GB",
  "Tesla L4 24 Gb": "NVIDIA L4 24GB",
  "Tesla L40s 48 Gb": "NVIDIA L40S 48GB",
  "RTX 6000 Ada 48 Gb": "NVIDIA RTX 6000 Ada 48GB",
  "Уровень Standart на три года": "Standard 3 года",
};

const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const isBaseConfigurationItem = (name) =>
  name.startsWith("Платформа ") ||
  name.startsWith("Cable, ") ||
  name.startsWith("Кабель электропитания ") ||
  name === "Уровень Standart на три года";

const parseWorkbook = (filename) => {
  const workbook = XLSX.readFile(filename);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  const result = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const title = normalize(rows[rowIndex][0]);
    const titleMatch = title.match(
      /^(ИИ \+ МО|HPC|Render|VDI|Data|Block) (min|max)$/i,
    );
    if (!titleMatch) continue;

    let serverRowIndex = rowIndex + 1;
    while (
      serverRowIndex < rows.length &&
      !normalize(rows[serverRowIndex][0]).startsWith("Сервер ")
    ) {
      serverRowIndex += 1;
    }
    if (serverRowIndex >= rows.length) continue;

    const serverLine = normalize(rows[serverRowIndex][0]);
    const serverMatch = serverLine.match(/^Сервер ([A-Z0-9-]+) в составе:$/i);
    if (!serverMatch) {
      throw new Error(`Cannot determine server model for "${title}"`);
    }

    const components = [];
    for (
      let componentRowIndex = serverRowIndex + 1;
      componentRowIndex < rows.length;
      componentRowIndex += 1
    ) {
      const name = normalize(rows[componentRowIndex][0]);
      if (!name) break;
      const amount = Number(rows[componentRowIndex][1]);
      if (!Number.isInteger(amount) || amount < 1) {
        throw new Error(`Invalid quantity for "${name}" in "${title}"`);
      }
      if (!isBaseConfigurationItem(name)) {
        components.push({ sourceName: name, amount });
      }
    }

    const category = CATEGORY_MAP[titleMatch[1]];
    const tier =
      titleMatch[2].toLowerCase() === "min" ? "Минимальная" : "Максимальная";
    const price = normalize(rows[serverRowIndex][2]);
    result.push({
      sourceTitle: title,
      category: category.slug,
      categoryLabel: category.label,
      serverName: serverMatch[1],
      description: `${tier} конфигурация · РРЦ по спецификации: ${price}`,
      components,
    });
  }

  return result;
};

const main = async () => {
  const env = dotenv.parse(fs.readFileSync(path.resolve(__dirname, "../.env")));
  const connection = await mysql.createConnection({
    host: env.DATABASE_HOST,
    port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    charset: "utf8mb4",
  });

  try {
    const configs = parseWorkbook(sourceFile);
    const [servers] = await connection.query("SELECT id, name FROM cnf_servers");
    const [dbComponents] = await connection.query(
      "SELECT id, name FROM cnf_components",
    );
    const serverByName = new Map(
      servers.map((server) => [normalize(server.name), server]),
    );
    const componentByName = new Map(
      dbComponents.map((component) => [normalize(component.name), component]),
    );

    const prepared = configs.map((config) => {
      const server = serverByName.get(config.serverName);
      if (!server) throw new Error(`Server not found: ${config.serverName}`);

      const components = config.components.map((component) => {
        const targetName =
          COMPONENT_ALIASES[component.sourceName] || component.sourceName;
        const matched = componentByName.get(normalize(targetName));
        if (!matched) {
          throw new Error(
            `Component not found for "${config.sourceTitle}": ${component.sourceName}`,
          );
        }
        return { componentId: matched.id, amount: component.amount };
      });

      return { ...config, serverId: server.id, components };
    });

    console.log(`Prepared ${prepared.length} recommended configurations:`);
    prepared.forEach((config) => {
      console.log(
        `- ${config.sourceTitle}: ${config.serverName}, ${config.components.length} components`,
      );
    });

    if (!execute) {
      console.log("Dry run complete. Add --execute to write changes.");
      return;
    }

    await connection.beginTransaction();
    for (const config of prepared) {
      const [existing] = await connection.execute(
        `SELECT id FROM recommended_configs
         WHERE category = ? AND description = ? AND deleted_at IS NULL
         ORDER BY id LIMIT 1`,
        [config.category, config.description],
      );
      const updateValues = [
        config.categoryLabel,
        config.serverId,
        config.serverName,
        config.description,
        JSON.stringify(config.components),
      ];

      if (existing.length) {
        await connection.execute(
          `UPDATE recommended_configs
           SET category_label = ?, server_id = ?, server_name = ?,
               description = ?, components = ?, is_active = 1, updated_at = NOW()
           WHERE id = ?`,
          [...updateValues, existing[0].id],
        );
      } else {
        await connection.execute(
          `INSERT INTO recommended_configs
           (category, category_label, server_id, server_name, description,
            components, image, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NULL, 1, NOW(), NOW())`,
          [config.category, ...updateValues],
        );
      }
    }
    await connection.commit();
    console.log(`Imported ${prepared.length} recommended configurations.`);
  } catch (error) {
    if (execute) await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
