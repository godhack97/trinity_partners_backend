import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateConfiguratorProfiles1776178000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_platform_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        server_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        platform_code varchar(100) NOT NULL,
        family varchar(50) NOT NULL,
        mode varchar(30) NOT NULL DEFAULT 'standard',
        cpu_limit int NOT NULL DEFAULT 2,
        ram_type varchar(10) NOT NULL DEFAULT 'DDR5',
        pcie_generation varchar(10) DEFAULT NULL,
        pcie_lanes_per_cpu int NOT NULL DEFAULT 80,
        pcie_lanes_total int NOT NULL DEFAULT 160,
        rear_pcie_ocp_limit int NOT NULL DEFAULT 96,
        pcie_slots int NOT NULL DEFAULT 6,
        ocp_slots int NOT NULL DEFAULT 1,
        base_power_w int NOT NULL DEFAULT 360,
        direct_sata_limit int NOT NULL DEFAULT 0,
        internal_m2_bays int NOT NULL DEFAULT 0,
        is_active tinyint NOT NULL DEFAULT 1,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_platform_profiles_server_id (server_id),
        CONSTRAINT FK_cnf_platform_profiles_server_id FOREIGN KEY (server_id) REFERENCES cnf_servers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_platform_bays (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        platform_profile_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        placement varchar(20) NOT NULL,
        bay_kind varchar(20) NOT NULL,
        form_factor varchar(20) NOT NULL,
        capacity int NOT NULL,
        allowed_drive_types json NOT NULL,
        pcie_lanes_per_nvme int DEFAULT NULL,
        counts_to_rear_pcie tinyint NOT NULL DEFAULT 0,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_cnf_platform_bays_profile_id (platform_profile_id),
        CONSTRAINT FK_cnf_platform_bays_profile_id FOREIGN KEY (platform_profile_id) REFERENCES cnf_platform_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_platform_forbidden_component_types (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        platform_profile_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_type_key varchar(50) NOT NULL,
        reason text DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_platform_forbidden_type (platform_profile_id, component_type_key),
        CONSTRAINT FK_cnf_platform_forbidden_profile_id FOREIGN KEY (platform_profile_id) REFERENCES cnf_platform_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_component_catalog_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_type_key varchar(50) NOT NULL,
        part_number varchar(100) DEFAULT NULL,
        vendor varchar(100) DEFAULT NULL,
        client_display_mode varchar(30) NOT NULL DEFAULT 'full',
        generation_key varchar(30) DEFAULT NULL,
        server_generation_id varchar(36) COLLATE utf8mb4_bin DEFAULT NULL,
        processor_generation_id varchar(36) COLLATE utf8mb4_bin DEFAULT NULL,
        is_active tinyint NOT NULL DEFAULT 1,
        disabled_reason text DEFAULT NULL,
        s4b_status varchar(50) DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_component_catalog_component_id (component_id),
        KEY IDX_cnf_component_catalog_type_key (component_type_key),
        CONSTRAINT FK_cnf_component_catalog_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_component_resource_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        resource_kind varchar(50) NOT NULL DEFAULT 'none',
        pcie_lanes int NOT NULL DEFAULT 0,
        rear_pcie_lanes int NOT NULL DEFAULT 0,
        physical_slots int NOT NULL DEFAULT 0,
        ocp_slots int NOT NULL DEFAULT 0,
        internal_ports int NOT NULL DEFAULT 0,
        power_w int DEFAULT NULL,
        uses_power tinyint NOT NULL DEFAULT 1,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_component_resource_component_id (component_id),
        CONSTRAINT FK_cnf_component_resource_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_component_price_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        base_price decimal(14,2) DEFAULT NULL,
        currency varchar(10) NOT NULL DEFAULT 'USD',
        coefficient decimal(8,4) NOT NULL DEFAULT 3.6000,
        price_mode varchar(30) NOT NULL DEFAULT 'component_price',
        price_required tinyint NOT NULL DEFAULT 1,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_component_price_component_id (component_id),
        CONSTRAINT FK_cnf_component_price_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_cpu_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        socket_profile varchar(10) DEFAULT NULL,
        ram_type varchar(10) NOT NULL,
        tdp_w int DEFAULT NULL,
        memory_channels int NOT NULL DEFAULT 8,
        max_ram_modules_per_cpu int NOT NULL DEFAULT 16,
        max_ram_gb_per_cpu int DEFAULT NULL,
        memory_speed_1dpc int DEFAULT NULL,
        memory_speed_2dpc int DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_cpu_profiles_component_id (component_id),
        CONSTRAINT FK_cnf_cpu_profiles_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_ram_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        ram_type varchar(10) NOT NULL,
        capacity_gb int NOT NULL,
        frequency_mhz int DEFAULT NULL,
        rank varchar(30) DEFAULT NULL,
        form_factor varchar(30) DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_ram_profiles_component_id (component_id),
        CONSTRAINT FK_cnf_ram_profiles_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_drive_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        drive_type varchar(20) NOT NULL,
        interface_type varchar(30) DEFAULT NULL,
        media_kind varchar(20) DEFAULT NULL,
        form_factor varchar(20) NOT NULL,
        capacity_gb int NOT NULL,
        speed_class varchar(50) DEFAULT NULL,
        workload_class varchar(50) DEFAULT NULL,
        pcie_lanes int NOT NULL DEFAULT 0,
        power_w int DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_drive_profiles_component_id (component_id),
        CONSTRAINT FK_cnf_drive_profiles_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_controller_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        controller_type varchar(20) NOT NULL,
        pcie_lanes int NOT NULL DEFAULT 8,
        rear_pcie_lanes int NOT NULL DEFAULT 8,
        physical_slots int NOT NULL DEFAULT 1,
        internal_ports int NOT NULL DEFAULT 0,
        supports_sata tinyint NOT NULL DEFAULT 1,
        supports_sas tinyint NOT NULL DEFAULT 1,
        supports_nvme tinyint NOT NULL DEFAULT 0,
        power_w int DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_controller_profiles_component_id (component_id),
        CONSTRAINT FK_cnf_controller_profiles_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_network_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        network_kind varchar(20) NOT NULL,
        port_type varchar(30) DEFAULT NULL,
        port_speed varchar(30) DEFAULT NULL,
        ports_count int NOT NULL DEFAULT 1,
        pcie_lanes int NOT NULL DEFAULT 8,
        rear_pcie_lanes int NOT NULL DEFAULT 8,
        physical_slots int NOT NULL DEFAULT 1,
        ocp_slots int NOT NULL DEFAULT 0,
        power_w int DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_network_profiles_component_id (component_id),
        CONSTRAINT FK_cnf_network_profiles_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_gpu_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        pcie_lanes int NOT NULL DEFAULT 16,
        rear_pcie_lanes int NOT NULL DEFAULT 16,
        physical_slots int NOT NULL DEFAULT 2,
        memory_gb int DEFAULT NULL,
        power_w int DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_gpu_profiles_component_id (component_id),
        CONSTRAINT FK_cnf_gpu_profiles_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_transceiver_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        interface_type varchar(30) NOT NULL,
        speed varchar(30) DEFAULT NULL,
        media_type varchar(50) DEFAULT NULL,
        wavelength varchar(50) DEFAULT NULL,
        compatible_port_type varchar(30) DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_transceiver_profiles_component_id (component_id),
        CONSTRAINT FK_cnf_transceiver_profiles_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_psu_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        power_w int NOT NULL,
        efficiency_class varchar(50) DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_psu_profiles_component_id (component_id),
        CONSTRAINT FK_cnf_psu_profiles_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cnf_service_profiles (
        id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
        service_level varchar(30) NOT NULL,
        years int NOT NULL,
        formula varchar(50) NOT NULL,
        percent decimal(8,4) DEFAULT NULL,
        fixed_price decimal(14,2) DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UQ_cnf_service_profiles_component_id (component_id),
        CONSTRAINT FK_cnf_service_profiles_component_id FOREIGN KEY (component_id) REFERENCES cnf_components(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_service_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_psu_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_transceiver_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_gpu_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_network_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_controller_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_drive_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_ram_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_cpu_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_component_price_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_component_resource_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_component_catalog_profiles`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS cnf_platform_forbidden_component_types`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_platform_bays`);
    await queryRunner.query(`DROP TABLE IF EXISTS cnf_platform_profiles`);
  }
}
