import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNormalizedNetworkTransceiverFields1780315600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(
      queryRunner,
      "cnf_network_profiles",
      "connector_type",
      "varchar(30) DEFAULT NULL AFTER port_type",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "cnf_network_profiles",
      "port_speed_gbps",
      "float DEFAULT NULL AFTER port_speed",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "cnf_network_profiles",
      "port_count",
      "int DEFAULT NULL AFTER ports_count",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "cnf_network_profiles",
      "supported_media",
      "varchar(100) DEFAULT NULL AFTER port_count",
    );

    await this.addColumnIfMissing(
      queryRunner,
      "cnf_transceiver_profiles",
      "connector_type",
      "varchar(30) DEFAULT NULL AFTER interface_type",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "cnf_transceiver_profiles",
      "speed_gbps",
      "float DEFAULT NULL AFTER speed",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "cnf_transceiver_profiles",
      "wavelength_or_length",
      "varchar(50) DEFAULT NULL AFTER wavelength",
    );

    await queryRunner.query(`
      UPDATE cnf_network_profiles
      SET
        connector_type = COALESCE(connector_type, port_type),
        port_count = COALESCE(port_count, ports_count),
        supported_media = COALESCE(
          supported_media,
          CASE
            WHEN UPPER(COALESCE(port_type, '')) LIKE '%RJ45%'
              OR UPPER(COALESCE(port_type, '')) LIKE '%BASE-T%' THEN 'copper'
            WHEN port_type IS NOT NULL THEN 'optical,dac'
            ELSE NULL
          END
        ),
        port_speed_gbps = COALESCE(
          port_speed_gbps,
          CASE
            WHEN UPPER(COALESCE(port_speed, '')) LIKE '%400%' THEN 400
            WHEN UPPER(COALESCE(port_speed, '')) LIKE '%200%' THEN 200
            WHEN UPPER(COALESCE(port_speed, '')) LIKE '%100%' THEN 100
            WHEN UPPER(COALESCE(port_speed, '')) LIKE '%56%' THEN 56
            WHEN UPPER(COALESCE(port_speed, '')) LIKE '%40%' THEN 40
            WHEN UPPER(COALESCE(port_speed, '')) LIKE '%25%' THEN 25
            WHEN UPPER(COALESCE(port_speed, '')) LIKE '%10%' THEN 10
            WHEN UPPER(COALESCE(port_speed, '')) LIKE '%1%' THEN 1
            ELSE NULL
          END
        )
    `);

    await queryRunner.query(`
      UPDATE cnf_transceiver_profiles
      SET
        connector_type = COALESCE(connector_type, compatible_port_type, interface_type),
        wavelength_or_length = COALESCE(wavelength_or_length, wavelength),
        speed_gbps = COALESCE(
          speed_gbps,
          CASE
            WHEN UPPER(COALESCE(speed, '')) LIKE '%400%' THEN 400
            WHEN UPPER(COALESCE(speed, '')) LIKE '%200%' THEN 200
            WHEN UPPER(COALESCE(speed, '')) LIKE '%100%' THEN 100
            WHEN UPPER(COALESCE(speed, '')) LIKE '%56%' THEN 56
            WHEN UPPER(COALESCE(speed, '')) LIKE '%40%' THEN 40
            WHEN UPPER(COALESCE(speed, '')) LIKE '%25%' THEN 25
            WHEN UPPER(COALESCE(speed, '')) LIKE '%10%' THEN 10
            WHEN UPPER(COALESCE(speed, '')) LIKE '%1%' THEN 1
            ELSE NULL
          END
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropColumnIfExists(
      queryRunner,
      "cnf_transceiver_profiles",
      "wavelength_or_length",
    );
    await this.dropColumnIfExists(
      queryRunner,
      "cnf_transceiver_profiles",
      "speed_gbps",
    );
    await this.dropColumnIfExists(
      queryRunner,
      "cnf_transceiver_profiles",
      "connector_type",
    );
    await this.dropColumnIfExists(
      queryRunner,
      "cnf_network_profiles",
      "supported_media",
    );
    await this.dropColumnIfExists(queryRunner, "cnf_network_profiles", "port_count");
    await this.dropColumnIfExists(
      queryRunner,
      "cnf_network_profiles",
      "port_speed_gbps",
    );
    await this.dropColumnIfExists(
      queryRunner,
      "cnf_network_profiles",
      "connector_type",
    );
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    definition: string,
  ) {
    const columns = await queryRunner.query(
      `SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`,
    );

    if (!columns?.length) {
      await queryRunner.query(`
        ALTER TABLE ${tableName}
        ADD COLUMN ${columnName} ${definition}
      `);
    }
  }

  private async dropColumnIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ) {
    const columns = await queryRunner.query(
      `SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`,
    );

    if (columns?.length) {
      await queryRunner.query(`
        ALTER TABLE ${tableName}
        DROP COLUMN ${columnName}
      `);
    }
  }
}
