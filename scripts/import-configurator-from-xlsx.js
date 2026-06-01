const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const XLSX = require("xlsx");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.dev") });

const EXECUTE = process.argv.includes("--execute");
const FILES = [
  "/home/godhack/Загрузки/Ген3.xlsx",
  "/home/godhack/Загрузки/Ген4.xlsx",
];

const TABLES_TO_BACKUP = [
  "cnf_servers",
  "cnf_server_slots",
  "cnf_server_multislots",
  "cnf_platform_profiles",
  "cnf_platform_bays",
  "cnf_platform_forbidden_component_types",
  "cnf_components",
  "cnf_component_slots",
  "cnf_component_catalog_profiles",
  "cnf_component_resource_profiles",
  "cnf_component_price_profiles",
  "cnf_cpu_profiles",
  "cnf_ram_profiles",
  "cnf_drive_profiles",
  "cnf_controller_profiles",
  "cnf_network_profiles",
  "cnf_gpu_profiles",
  "cnf_transceiver_profiles",
  "cnf_psu_profiles",
  "cnf_service_profiles",
  "cnf_server_generation",
  "cnf_processor_generation",
  "cnf_component_types",
];

const CLEANUP_TABLES = [
  "cnf_platform_forbidden_component_types",
  "cnf_platform_bays",
  "cnf_platform_profiles",
  "cnf_server_slots",
  "cnf_server_multislots",
  "cnf_servers",
  "cnf_component_catalog_profiles",
  "cnf_component_resource_profiles",
  "cnf_component_price_profiles",
  "cnf_cpu_profiles",
  "cnf_ram_profiles",
  "cnf_drive_profiles",
  "cnf_controller_profiles",
  "cnf_network_profiles",
  "cnf_gpu_profiles",
  "cnf_transceiver_profiles",
  "cnf_psu_profiles",
  "cnf_service_profiles",
  "cnf_component_slots",
  "cnf_components",
];

const COMPONENT_TYPES = {
  cpu: "cpu-type-id",
  ram: "ram-type-id",
  drive: "memory-type-id",
  raid: "raid-controller-type-id",
  hba: "hba-type-id",
  ehba: "ehba-type-id",
  vroc: "raid-controller-type-id",
  gpu: "gpu-type-id",
  nic: "network-card-type-id",
  ocp: "ocp-type-id",
  transceiver: "transiver-type-id",
  psu: "psu-type-id",
  service: "warranty-type-id",
};

const COMPONENT_TYPE_NAMES = {
  "psu-type-id": "PSU",
};

const GENERATION_META = {
  "Gen3/M7": {
    ramType: "DDR4",
    pcieGeneration: "4.0",
    pcieLanesPerCpu: 64,
    directSataLimit: 16,
    processorGenerationName: "Gen3/M7",
  },
  "Gen4/5/M8": {
    ramType: "DDR5",
    pcieGeneration: "5.0",
    pcieLanesPerCpu: 80,
    directSataLimit: 12,
    processorGenerationName: "Gen4/5/M8",
  },
};

function readSheet(file, sheetName) {
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  const headerIndex = rows.findIndex((row) => row.includes("Тип") || row.includes("Наименование"));
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map((value) => (value == null ? "" : String(value).trim()));
  return rows.slice(headerIndex + 1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = row[index];
    });
    return record;
  });
}

function readPlatforms(file) {
  const workbook = XLSX.readFile(file);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Платформы"], {
    header: 1,
    defval: null,
    blankrows: false,
  });
  const headerIndex = rows.findIndex((row) => row.includes("P/N"));
  const headers = rows[headerIndex].map((value) => (value == null ? "" : String(value).trim()));
  return rows.slice(headerIndex + 1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = row[index];
    });
    return record;
  });
}

function normalizeType(type) {
  const value = String(type || "").trim().toLowerCase();
  if (value === "cpu") return "cpu";
  if (value === "ram") return "ram";
  if (value === "raid") return "raid";
  if (value === "hba") return "hba";
  if (value === "ehba") return "ehba";
  if (value === "vroc") return "vroc";
  if (value === "gpu") return "gpu";
  if (value === "nic") return "nic";
  if (value === "ocp") return "ocp";
  if (value === "transceiver") return "transceiver";
  if (value === "psu") return "psu";
  return value;
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const normalized = typeof value === "string" ? value.replace(",", ".") : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
}

function parseCapacityGb(name) {
  const text = String(name || "");
  const tb = text.match(/(\d+(?:[.,]\d+)?)\s*TB/i);
  if (tb) return Math.round(toNumber(tb[1]) * 1024);
  const gb = text.match(/(\d+(?:[.,]\d+)?)\s*GB/i);
  if (gb) return Math.round(toNumber(gb[1]));
  return 0;
}

function parseFrequency(name) {
  const match = String(name || "").match(/DDR[45]-(\d{4})/i);
  return match ? Number(match[1]) : null;
}

function parsePortsCount(name) {
  const match = String(name || "").match(/(\d+)-port/i);
  return match ? Number(match[1]) : 1;
}

function parsePortType(name) {
  const text = String(name || "").toUpperCase();
  const known = ["SFP28", "QSFP56", "QSFP28", "QSFP+", "SFP+", "RJ-45"];
  return known.find((type) => text.includes(type)) || null;
}

function parseSpeed(name) {
  const match = String(name || "").match(/(\d+(?:\/\d+)?)\s*G(?:BPS|B\\S|B\/S|B)/i);
  return match ? `${match[1]}Gbps` : null;
}

function parsePsuPower(name, explicitPower) {
  const explicit = toNumber(explicitPower, 0);
  if (explicit > 0) return explicit;
  const match = String(name || "").match(/(\d{3,4})W/i);
  return match ? Number(match[1]) : 0;
}

function parseEfficiency(name) {
  const text = String(name || "");
  const match = text.match(/80\+\s*([A-Za-z]+)/i);
  return match ? match[1] : null;
}

function platformMode(code) {
  return code === "ER225HTR-M8" ? "ocp_only" : "standard";
}

function platformActive(code) {
  return code !== "ER225HTR-M8";
}

function frontAllowedDriveTypes(code) {
  if (code.includes("ER225HR")) return ["NVME"];
  if (code.includes("ER225HTR")) return ["SATA"];
  return ["SATA", "SAS", "NVME"];
}

function rearAllowedDriveTypes(code) {
  if (code.includes("ER225HTR")) return [];
  return ["SATA", "SAS", "NVME"];
}

function componentDisplayMode(typeKey) {
  return ["drive", "nic", "ocp", "transceiver"].includes(typeKey) ? "technical" : "full";
}

function componentKey(typeKey, partNumber, name, generation) {
  if (["cpu", "ram"].includes(typeKey)) return `${typeKey}:${generation}:${partNumber || name}`;
  return `${typeKey}:${partNumber || name}`;
}

function mapControllerType(typeKey, isVroc) {
  if (isVroc) return "VROC";
  if (typeKey === "raid") return "RAID";
  if (typeKey === "hba") return "HBA";
  if (typeKey === "ehba") return "eHBA";
  return typeKey.toUpperCase();
}

async function insert(connection, table, data) {
  const columns = Object.keys(data);
  const values = columns.map((column) => data[column]);
  const placeholders = columns.map(() => "?").join(", ");
  await connection.query(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
    values,
  );
}

async function ensureNamedRow(connection, table, name) {
  const [rows] = await connection.query(`SELECT id FROM ${table} WHERE name = ? LIMIT 1`, [name]);
  if (rows.length) return rows[0].id;
  const id = randomUUID();
  await insert(connection, table, { id, name });
  return id;
}

async function ensureComponentType(connection, id, name) {
  const [rows] = await connection.query("SELECT id FROM cnf_component_types WHERE id = ? LIMIT 1", [id]);
  if (rows.length) return;
  await insert(connection, "cnf_component_types", { id, name });
}

async function backupCurrentData(connection) {
  const backup = {
    created_at: new Date().toISOString(),
    tables: {},
  };

  for (const table of TABLES_TO_BACKUP) {
    const [rows] = await connection.query(`SELECT * FROM ${table}`);
    backup.tables[table] = rows;
  }

  const backupDir = path.resolve(process.cwd(), "../backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const file = path.join(
    backupDir,
    `configurator-xlsx-rebuild-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  return file;
}

function buildDataset() {
  const dataset = {
    platforms: [],
    components: [],
    componentKeys: new Set(),
  };

  for (const file of FILES) {
    for (const row of readPlatforms(file)) {
      const code = String(row["P/N"] || "").trim();
      if (!code) continue;
      dataset.platforms.push({
        name: String(row["Наименование"] || code).trim(),
        code,
        generation: String(row["Поколение"] || "").trim(),
        family: String(row["Семейство"] || "").trim(),
        price: toNumber(row["Цена, $"]),
        basePowerW: toNumber(row["Base W"], 360),
        pcieTotal: toNumber(row["PCIe total"]),
        rearPcie: toNumber(row["Rear PCIe/OCP"]),
        ocpSlots: toNumber(row["OCP slots"]),
        pcieSlots: toNumber(row["PCIe slots"]),
        front25: toNumber(row["Front 2.5"]),
        front35: toNumber(row["Front 3.5"]),
        rear25: toNumber(row["Rear 2.5"]),
        m2: toNumber(row["M.2"]),
      });
    }

    for (const row of readSheet(file, "CPU + RAM")) {
      const typeKey = normalizeType(row["Тип"]);
      if (!["cpu", "ram"].includes(typeKey)) continue;
      const name = String(row["Наименование"] || "").trim();
      const partNumber = String(row["P/N основной"] || row["P/N доп."] || "").trim();
      const generation = String(row["Поколение"] || "").trim();
      const key = componentKey(typeKey, partNumber, name, generation);
      if (dataset.componentKeys.has(key)) continue;
      dataset.componentKeys.add(key);

      dataset.components.push({
        typeKey,
        name,
        partNumber,
        generation,
        price: toNumber(row["Цена, $"]),
        ramType: String(row["RAM type"] || "").trim(),
        socketProfile: row["CPU sockets"] ? String(row["CPU sockets"]).trim() : null,
        memorySpeed1Dpc: row["1 DIMM/канал"] == null ? null : toNumber(row["1 DIMM/канал"]),
        memorySpeed2Dpc: row["2 DIMM/канал"] == null ? null : toNumber(row["2 DIMM/канал"]),
        memoryChannels: row["Каналов памяти"] == null ? null : toNumber(row["Каналов памяти"]),
        maxRamModulesPerCpu: row["Макс. планок / CPU"] == null ? null : toNumber(row["Макс. планок / CPU"]),
        maxRamGbPerCpu: row["Макс. память / CPU, TB"] == null ? null : Math.round(toNumber(row["Макс. память / CPU, TB"]) * 1024),
        capacityGb: parseCapacityGb(name),
        frequencyMhz: parseFrequency(name),
        powerW: toNumber(row["Power, W"], typeKey === "ram" ? 8 : null),
      });
    }

    for (const row of readSheet(file, "RAID_HBA")) {
      const typeKey = normalizeType(row["Тип"]);
      const isVroc = toNumber(row["VROC"]) === 1 || typeKey === "vroc";
      const effectiveType = isVroc ? "vroc" : typeKey;
      if (!["raid", "hba", "ehba", "vroc"].includes(effectiveType)) continue;
      addSharedComponent(dataset, {
        typeKey: effectiveType,
        name: String(row["Наименование"] || "").trim(),
        partNumber: String(row["P/N основной"] || row["P/N доп."] || "").trim(),
        price: toNumber(row["Цена, $"]),
        pcieLanes: toNumber(row["PCIe lines"]),
        rearPcieLanes: toNumber(row["Rear PCIe lines"]),
        physicalSlots: toNumber(row["Slots"]),
        internalPorts: toNumber(row["Internal ports"]),
        powerW: toNumber(row["Power, W"]),
        controllerType: mapControllerType(effectiveType, isVroc),
      });
    }

    for (const row of readSheet(file, "Диски")) {
      const typeKey = "drive";
      const name = String(row["Наименование"] || "").trim();
      addSharedComponent(dataset, {
        typeKey,
        sourceType: normalizeType(row["Тип"]),
        name,
        partNumber: String(row["P/N"] || "").trim(),
        price: toNumber(row["Цена, $"]),
        driveType: String(row["Drive type"] || "").trim().toUpperCase(),
        formFactor: String(row["Form factor"] || "").trim(),
        capacityGb: parseCapacityGb(name),
        pcieLanes: toNumber(row["NVMe PCIe lines"]),
        powerW: toNumber(row["Power, W"], 12),
      });
    }

    for (const row of readSheet(file, "GPU_NIC")) {
      const typeKey = normalizeType(row["Тип"]);
      if (!["gpu", "nic"].includes(typeKey)) continue;
      const name = String(row["Наименование"] || "").trim();
      addSharedComponent(dataset, {
        typeKey,
        name,
        partNumber: String(row["P/N"] || "").trim(),
        price: toNumber(row["Цена, $"]),
        pcieLanes: toNumber(row["PCIe lines"]),
        rearPcieLanes: toNumber(row["Rear PCIe lines"]),
        physicalSlots: toNumber(row["Slots"]),
        powerW: toNumber(row["Power, W"]),
        portsCount: parsePortsCount(name),
        portType: parsePortType(name),
        portSpeed: parseSpeed(name),
        networkKind: name.toUpperCase().startsWith("FC") ? "fc" : name.toUpperCase().startsWith("IB") ? "ib" : "nic",
      });
    }

    for (const row of readSheet(file, "OCP_Трансиверы")) {
      const typeKey = normalizeType(row["Тип"]);
      if (!["ocp", "transceiver"].includes(typeKey)) continue;
      const name = String(row["Наименование"] || "").trim();
      addSharedComponent(dataset, {
        typeKey,
        name,
        partNumber: String(row["P/N"] || "").trim(),
        price: toNumber(row["Цена, $"]),
        ocpSlots: toNumber(row["OCP slots"]),
        pcieLanes: toNumber(row["PCIe lines"]),
        rearPcieLanes: toNumber(row["Rear PCIe lines"]),
        powerW: toNumber(row["Power, W"]),
        portsCount: parsePortsCount(name),
        portType: parsePortType(name),
        portSpeed: parseSpeed(name),
        interfaceType: parsePortType(name) || "optical",
      });
    }

    for (const row of readSheet(file, "PSU_Сервис")) {
      const typeKey = normalizeType(row["Тип"]);
      if (typeKey !== "psu") continue;
      const name = String(row["Наименование"] || "").trim();
      addSharedComponent(dataset, {
        typeKey,
        name,
        partNumber: String(row["P/N"] || "").trim(),
        price: toNumber(row["Цена, $"]),
        coefficient: toNumber(row["Коэф."], 3.6),
        powerW: parsePsuPower(name, row["Power, W"]),
        efficiencyClass: parseEfficiency(name),
      });
    }
  }

  addServiceComponents(dataset);
  return dataset;
}

function addSharedComponent(dataset, component) {
  if (!component.name) return;
  const key = componentKey(component.typeKey, component.partNumber, component.name, null);
  if (dataset.componentKeys.has(key)) return;
  dataset.componentKeys.add(key);
  dataset.components.push(component);
}

function addServiceComponents(dataset) {
  const services = [
    { name: "Standard 1 год", years: 1, formula: "fixed", fixedPrice: 1, level: "standard" },
    { name: "Standard 3 года", years: 3, formula: "fixed", fixedPrice: 1, level: "standard" },
    { name: "Standard 5 лет", years: 5, formula: "percent_of_equipment", percent: 12, level: "standard" },
    { name: "Gold / Extended 1 год", years: 1, formula: "percent_of_equipment", percent: 10, level: "extended" },
    { name: "Gold / Extended 3 года", years: 3, formula: "percent_of_equipment", percent: 17, level: "extended" },
    { name: "Gold / Extended 5 лет", years: 5, formula: "percent_of_equipment", percent: 25, level: "extended" },
    { name: "Premium", years: 1, formula: "manual", fixedPrice: null, level: "premium" },
  ];

  for (const service of services) {
    addSharedComponent(dataset, {
      typeKey: "service",
      name: service.name,
      partNumber: service.name,
      price: service.fixedPrice || 0,
      coefficient: 1,
      ...service,
    });
  }
}

async function importDataset(connection, dataset) {
  await ensureComponentType(connection, COMPONENT_TYPES.psu, COMPONENT_TYPE_NAMES[COMPONENT_TYPES.psu]);
  const serverboxHeightId = await ensureNamedRow(connection, "cnf_serverbox_height", "2U");

  const serverGenerationIds = {};
  const processorGenerationIds = {};
  for (const generation of Object.keys(GENERATION_META)) {
    serverGenerationIds[generation] = await ensureNamedRow(connection, "cnf_server_generation", generation);
    processorGenerationIds[generation] = await ensureNamedRow(connection, "cnf_processor_generation", generation);
  }

  for (const table of CLEANUP_TABLES) {
    await connection.query(`DELETE FROM ${table}`);
  }

  let sort = 10;
  for (const platform of dataset.platforms) {
    const serverId = randomUUID();
    const generationMeta = GENERATION_META[platform.generation] || GENERATION_META["Gen4/5/M8"];
    await insert(connection, "cnf_servers", {
      id: serverId,
      name: platform.code,
      sort,
      description: platform.name,
      serverbox_height_id: serverboxHeightId,
      server_generation_id: serverGenerationIds[platform.generation],
      price: platform.price,
      image: null,
      guide: null,
      cert: null,
      gisp: null,
    });
    sort += 10;

    const profileId = randomUUID();
    await insert(connection, "cnf_platform_profiles", {
      id: profileId,
      server_id: serverId,
      platform_code: platform.code,
      family: platform.family,
      mode: platformMode(platform.code),
      cpu_limit: 2,
      ram_type: generationMeta.ramType,
      pcie_generation: generationMeta.pcieGeneration,
      pcie_lanes_per_cpu: generationMeta.pcieLanesPerCpu,
      pcie_lanes_total: platform.pcieTotal,
      rear_pcie_ocp_limit: platform.rearPcie,
      pcie_slots: platform.pcieSlots,
      ocp_slots: platform.ocpSlots,
      base_power_w: platform.basePowerW,
      direct_sata_limit: platform.code.includes("ER225HTR") ? 2 : platform.code.includes("ER220") ? generationMeta.directSataLimit : 0,
      internal_m2_bays: platform.m2,
      is_active: platformActive(platform.code),
    });

    await insertPlatformBays(connection, profileId, platform);
    await insertForbiddenRules(connection, profileId, platform.code);
  }

  for (const component of dataset.components) {
    await insertComponent(connection, component, serverGenerationIds, processorGenerationIds);
  }
}

async function insertPlatformBays(connection, profileId, platform) {
  const allowedFront = frontAllowedDriveTypes(platform.code);
  const frontCapacity = Math.max(platform.front25, platform.front35);
  if (frontCapacity > 0) {
    const formFactor = platform.front25 > 0 && platform.front35 > 0 ? "2.5/3.5" : platform.front35 > 0 ? "3.5" : "2.5";
    await insert(connection, "cnf_platform_bays", {
      id: randomUUID(),
      platform_profile_id: profileId,
      placement: "front",
      bay_kind: "drive",
      form_factor: formFactor,
      capacity: frontCapacity,
      allowed_drive_types: JSON.stringify(allowedFront),
      pcie_lanes_per_nvme: 4,
      counts_to_rear_pcie: false,
    });
  }

  const allowedRear = rearAllowedDriveTypes(platform.code);
  if (platform.rear25 > 0 && allowedRear.length) {
    await insert(connection, "cnf_platform_bays", {
      id: randomUUID(),
      platform_profile_id: profileId,
      placement: "rear",
      bay_kind: "drive",
      form_factor: "2.5",
      capacity: platform.rear25,
      allowed_drive_types: JSON.stringify(allowedRear),
      pcie_lanes_per_nvme: 4,
      counts_to_rear_pcie: true,
    });
  }
}

async function insertForbiddenRules(connection, profileId, code) {
  if (!code.includes("ER225HTR")) return;
  const forbidden = ["gpu", "nic", "raid", "hba", "ehba", "vroc"];
  for (const componentTypeKey of forbidden) {
    await insert(connection, "cnf_platform_forbidden_component_types", {
      id: randomUUID(),
      platform_profile_id: profileId,
      component_type_key: componentTypeKey,
      reason: "Запрещено для OCP-only платформы ER225HTR-M8",
    });
  }
}

async function insertComponent(connection, component, serverGenerationIds, processorGenerationIds) {
  const id = randomUUID();
  const typeId = COMPONENT_TYPES[component.typeKey] || COMPONENT_TYPES.drive;
  const generationId = component.generation ? serverGenerationIds[component.generation] : null;
  const processorGenerationId = component.generation ? processorGenerationIds[component.generation] : null;

  await insert(connection, "cnf_components", {
    id,
    type_id: typeId,
    subtype: componentSubtype(component),
    price: component.price || 0,
    name: component.name,
    server_generation_id: generationId,
    processor_generation_id: processorGenerationId,
  });

  await insert(connection, "cnf_component_catalog_profiles", {
    id: randomUUID(),
    component_id: id,
    component_type_key: component.typeKey,
    part_number: component.partNumber || null,
    vendor: null,
    client_display_mode: componentDisplayMode(component.typeKey),
    generation_key: component.generation || null,
    server_generation_id: generationId,
    processor_generation_id: processorGenerationId,
    is_active: true,
    disabled_reason: null,
    s4b_status: null,
  });

  await insert(connection, "cnf_component_price_profiles", {
    id: randomUUID(),
    component_id: id,
    base_price: component.price || 0,
    currency: "USD",
    coefficient: component.coefficient ?? (component.typeKey === "service" ? 1 : 3.6),
    price_mode: component.typeKey === "service" ? "service_formula" : "component_price",
    price_required: component.typeKey !== "service" || component.formula !== "manual",
  });

  await insertResourceProfile(connection, id, component);
  await insertSpecialProfile(connection, id, component);
}

function componentSubtype(component) {
  if (component.typeKey === "drive") return component.driveType || "drive";
  if (component.typeKey === "ram") return component.ramType || "RAM";
  if (component.typeKey === "cpu") return component.generation || "CPU";
  if (component.typeKey === "service") return component.level || "service";
  return component.typeKey;
}

async function insertResourceProfile(connection, componentId, component) {
  const isNone = ["transceiver", "service"].includes(component.typeKey);
  await insert(connection, "cnf_component_resource_profiles", {
    id: randomUUID(),
    component_id: componentId,
    resource_kind: isNone ? "none" : component.typeKey,
    pcie_lanes: component.typeKey === "vroc" ? 0 : component.pcieLanes || 0,
    rear_pcie_lanes: component.typeKey === "vroc" ? 0 : component.rearPcieLanes || 0,
    physical_slots: component.typeKey === "ocp" || component.typeKey === "vroc" ? 0 : component.physicalSlots || 0,
    ocp_slots: component.typeKey === "ocp" ? component.ocpSlots || 1 : 0,
    internal_ports: component.internalPorts || 0,
    power_w: isNone ? 0 : component.powerW ?? null,
    uses_power: !isNone && component.typeKey !== "psu",
  });
}

async function insertSpecialProfile(connection, componentId, component) {
  if (component.typeKey === "cpu") {
    await insert(connection, "cnf_cpu_profiles", {
      id: randomUUID(),
      component_id: componentId,
      socket_profile: component.socketProfile,
      ram_type: component.ramType,
      tdp_w: component.powerW,
      memory_channels: component.memoryChannels || 8,
      max_ram_modules_per_cpu: component.maxRamModulesPerCpu || 16,
      max_ram_gb_per_cpu: component.maxRamGbPerCpu || null,
      memory_speed_1dpc: component.memorySpeed1Dpc,
      memory_speed_2dpc: component.memorySpeed2Dpc,
    });
  }

  if (component.typeKey === "ram") {
    await insert(connection, "cnf_ram_profiles", {
      id: randomUUID(),
      component_id: componentId,
      ram_type: component.ramType,
      capacity_gb: component.capacityGb,
      frequency_mhz: component.frequencyMhz,
      rank: null,
      form_factor: "RDIMM",
    });
  }

  if (component.typeKey === "drive") {
    await insert(connection, "cnf_drive_profiles", {
      id: randomUUID(),
      component_id: componentId,
      drive_type: component.driveType,
      interface_type: component.driveType,
      form_factor: component.formFactor,
      capacity_gb: component.capacityGb,
      speed_class: null,
      workload_class: component.sourceType || null,
      pcie_lanes: component.pcieLanes || 0,
      power_w: component.powerW,
    });
  }

  if (["raid", "hba", "ehba", "vroc"].includes(component.typeKey)) {
    const isVroc = component.typeKey === "vroc";
    await insert(connection, "cnf_controller_profiles", {
      id: randomUUID(),
      component_id: componentId,
      controller_type: component.controllerType,
      pcie_lanes: isVroc ? 0 : component.pcieLanes || 0,
      rear_pcie_lanes: isVroc ? 0 : component.rearPcieLanes || 0,
      physical_slots: isVroc ? 0 : component.physicalSlots || 0,
      internal_ports: isVroc ? 0 : component.internalPorts || 0,
      supports_sata: !isVroc && component.typeKey !== "ehba",
      supports_sas: !isVroc,
      supports_nvme: isVroc,
      power_w: isVroc ? 0 : component.powerW,
    });
  }

  if (["nic", "ocp"].includes(component.typeKey)) {
    await insert(connection, "cnf_network_profiles", {
      id: randomUUID(),
      component_id: componentId,
      network_kind: component.typeKey === "ocp" ? "ocp" : component.networkKind || "nic",
      port_type: component.portType,
      port_speed: component.portSpeed,
      ports_count: component.portsCount || 1,
      pcie_lanes: component.pcieLanes || 0,
      rear_pcie_lanes: component.rearPcieLanes || 0,
      physical_slots: component.typeKey === "ocp" ? 0 : component.physicalSlots || 1,
      ocp_slots: component.typeKey === "ocp" ? component.ocpSlots || 1 : 0,
      power_w: component.powerW,
    });
  }

  if (component.typeKey === "gpu") {
    await insert(connection, "cnf_gpu_profiles", {
      id: randomUUID(),
      component_id: componentId,
      pcie_lanes: component.pcieLanes || 16,
      rear_pcie_lanes: component.rearPcieLanes || 16,
      physical_slots: component.physicalSlots || 1,
      power_w: component.powerW,
    });
  }

  if (component.typeKey === "transceiver") {
    await insert(connection, "cnf_transceiver_profiles", {
      id: randomUUID(),
      component_id: componentId,
      interface_type: component.interfaceType || "optical",
      speed: component.portSpeed,
      media_type: "optical",
      wavelength: null,
      compatible_port_type: component.interfaceType,
    });
  }

  if (component.typeKey === "psu") {
    await insert(connection, "cnf_psu_profiles", {
      id: randomUUID(),
      component_id: componentId,
      power_w: component.powerW,
      efficiency_class: component.efficiencyClass,
    });
  }

  if (component.typeKey === "service") {
    await insert(connection, "cnf_service_profiles", {
      id: randomUUID(),
      component_id: componentId,
      service_level: component.level,
      years: component.years,
      formula: component.formula,
      percent: component.percent ?? null,
      fixed_price: component.fixedPrice ?? null,
    });
  }
}

async function main() {
  for (const file of FILES) {
    if (!fs.existsSync(file)) throw new Error(`Файл не найден: ${file}`);
  }

  const dataset = buildDataset();
  console.log("Prepared dataset", {
    platforms: dataset.platforms.length,
    components: dataset.components.length,
    execute: EXECUTE,
  });

  if (!EXECUTE) {
    console.log("Dry-run only. Add --execute to rebuild database data.");
    return;
  }

  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    const backupFile = await backupCurrentData(connection);
    console.log("Backup created", backupFile);

    await connection.beginTransaction();
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    await importDataset(connection, dataset);
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    await connection.commit();

    console.log("Configurator data rebuilt from XLSX", {
      platforms: dataset.platforms.length,
      components: dataset.components.length,
      backupFile,
    });
  } catch (error) {
    await connection.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => undefined);
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
