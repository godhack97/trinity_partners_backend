import { MigrationInterface, QueryRunner } from "typeorm";

type SupportSeed = {
  id: string;
  catalogProfileId: string;
  resourceProfileId: string;
  priceProfileId: string;
  serviceProfileId: string;
  serviceLevel: string;
  name: string;
  years: number;
  formula: "fixed" | "percent_of_equipment" | "manual";
  percent: number | null;
};

const SUPPORT_TYPE_ID = "warranty-type-id";
const LEGACY_DISABLED_REASON =
  "Заменено актуальными вариантами техподдержки";

const SUPPORT_COMPONENTS: SupportSeed[] = [
  {
    id: "7c940001-2d4a-4d51-9000-000000000001",
    catalogProfileId: "7c941001-2d4a-4d51-9000-000000000001",
    resourceProfileId: "7c942001-2d4a-4d51-9000-000000000001",
    priceProfileId: "7c943001-2d4a-4d51-9000-000000000001",
    serviceProfileId: "7c944001-2d4a-4d51-9000-000000000001",
    serviceLevel: "standard",
    name: "Стандартная гарантия",
    years: 3,
    formula: "fixed",
    percent: null,
  },
  {
    id: "7c940001-2d4a-4d51-9000-000000000002",
    catalogProfileId: "7c941001-2d4a-4d51-9000-000000000002",
    resourceProfileId: "7c942001-2d4a-4d51-9000-000000000002",
    priceProfileId: "7c943001-2d4a-4d51-9000-000000000002",
    serviceProfileId: "7c944001-2d4a-4d51-9000-000000000002",
    serviceLevel: "extended-1",
    name: "Расширенная техническая поддержка 1 год",
    years: 1,
    formula: "percent_of_equipment",
    percent: 10,
  },
  {
    id: "7c940001-2d4a-4d51-9000-000000000003",
    catalogProfileId: "7c941001-2d4a-4d51-9000-000000000003",
    resourceProfileId: "7c942001-2d4a-4d51-9000-000000000003",
    priceProfileId: "7c943001-2d4a-4d51-9000-000000000003",
    serviceProfileId: "7c944001-2d4a-4d51-9000-000000000003",
    serviceLevel: "extended-3",
    name: "Расширенная техническая поддержка 3 года",
    years: 3,
    formula: "percent_of_equipment",
    percent: 17,
  },
  {
    id: "7c940001-2d4a-4d51-9000-000000000004",
    catalogProfileId: "7c941001-2d4a-4d51-9000-000000000004",
    resourceProfileId: "7c942001-2d4a-4d51-9000-000000000004",
    priceProfileId: "7c943001-2d4a-4d51-9000-000000000004",
    serviceProfileId: "7c944001-2d4a-4d51-9000-000000000004",
    serviceLevel: "extended-5",
    name: "Расширенная техническая поддержка 5 лет",
    years: 5,
    formula: "percent_of_equipment",
    percent: 25,
  },
  {
    id: "7c940001-2d4a-4d51-9000-000000000005",
    catalogProfileId: "7c941001-2d4a-4d51-9000-000000000005",
    resourceProfileId: "7c942001-2d4a-4d51-9000-000000000005",
    priceProfileId: "7c943001-2d4a-4d51-9000-000000000005",
    serviceProfileId: "7c944001-2d4a-4d51-9000-000000000005",
    serviceLevel: "premium",
    name: "Премиум",
    years: 1,
    formula: "manual",
    percent: null,
  },
];

export class SeedTechnicalSupportComponents1780318000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO cnf_component_types (id, name)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `,
      [SUPPORT_TYPE_ID, "Техподдержка"],
    );

    await queryRunner.query(
      `
        UPDATE cnf_component_catalog_profiles catalog
        INNER JOIN cnf_components component
          ON component.id = catalog.component_id
        SET
          catalog.is_active = 0,
          catalog.disabled_reason = ?
        WHERE component.type_id = ?
          AND component.id NOT IN (${SUPPORT_COMPONENTS.map(() => "?").join(", ")})
          AND catalog.is_active = 1
          AND catalog.disabled_reason IS NULL
      `,
      [
        LEGACY_DISABLED_REASON,
        SUPPORT_TYPE_ID,
        ...SUPPORT_COMPONENTS.map((support) => support.id),
      ],
    );

    for (const support of SUPPORT_COMPONENTS) {
      await queryRunner.query(
        `
          INSERT INTO cnf_components (id, type_id, name, price, subtype)
          VALUES (?, ?, ?, 0, ?)
          ON DUPLICATE KEY UPDATE
            type_id = VALUES(type_id),
            name = VALUES(name),
            subtype = VALUES(subtype)
        `,
        [support.id, SUPPORT_TYPE_ID, support.name, support.serviceLevel],
      );

      await queryRunner.query(
        `
          INSERT INTO cnf_component_catalog_profiles (
            id, component_id, component_type_key, part_number,
            client_display_mode, is_active
          )
          VALUES (?, ?, 'service', ?, 'full', 1)
          ON DUPLICATE KEY UPDATE
            component_type_key = 'service',
            part_number = VALUES(part_number),
            is_active = 1
        `,
        [
          support.catalogProfileId,
          support.id,
          `SUPPORT-${support.serviceLevel.toUpperCase()}`,
        ],
      );

      await queryRunner.query(
        `
          INSERT INTO cnf_component_resource_profiles (
            id, component_id, resource_kind, pcie_lanes, rear_pcie_lanes,
            physical_slots, ocp_slots, internal_ports, power_w, uses_power
          )
          VALUES (?, ?, 'service', 0, 0, 0, 0, 0, NULL, 0)
          ON DUPLICATE KEY UPDATE resource_kind = 'service', uses_power = 0
        `,
        [support.resourceProfileId, support.id],
      );

      await queryRunner.query(
        `
          INSERT INTO cnf_component_price_profiles (
            id, component_id, base_price, currency, coefficient,
            price_mode, price_required
          )
          VALUES (?, ?, NULL, 'USD', 1, 'component_price', 0)
          ON DUPLICATE KEY UPDATE coefficient = 1, price_required = 0
        `,
        [support.priceProfileId, support.id],
      );

      await queryRunner.query(
        `
          INSERT INTO cnf_service_profiles (
            id, component_id, service_level, years, formula, percent, fixed_price
          )
          VALUES (?, ?, ?, ?, ?, ?, NULL)
          ON DUPLICATE KEY UPDATE
            service_level = VALUES(service_level),
            years = VALUES(years),
            formula = VALUES(formula),
            percent = VALUES(percent)
        `,
        [
          support.serviceProfileId,
          support.id,
          support.serviceLevel,
          support.years,
          support.formula,
          support.percent,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const componentIds = SUPPORT_COMPONENTS.map((support) => support.id);

    await queryRunner.query(
      `DELETE FROM cnf_components WHERE id IN (${componentIds.map(() => "?").join(", ")})`,
      componentIds,
    );
    await queryRunner.query(
      `
        UPDATE cnf_component_catalog_profiles catalog
        INNER JOIN cnf_components component
          ON component.id = catalog.component_id
        SET catalog.is_active = 1, catalog.disabled_reason = NULL
        WHERE component.type_id = ? AND catalog.disabled_reason = ?
      `,
      [SUPPORT_TYPE_ID, LEGACY_DISABLED_REASON],
    );
    await queryRunner.query(
      "UPDATE cnf_component_types SET name = ? WHERE id = ?",
      ["Гарантия", SUPPORT_TYPE_ID],
    );
  }
}
