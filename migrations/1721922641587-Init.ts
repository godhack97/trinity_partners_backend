import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1721922641587 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET FOREIGN_KEY_CHECKS = 0;");
    await queryRunner.query("SET @@sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';\n");
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS users
        (
            id             INT unsigned                     NOT NULL AUTO_INCREMENT,
            password       VARCHAR(255) COLLATE utf8mb4_bin,
            salt           VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
            email          VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
            phone          VARCHAR(255) COLLATE utf8mb4_bin,
            is_activated   BOOLEAN                          NOT NULL DEFAULT 0 COMMENT 'Активирован ли аккаунт(подтверждение регистрации)',
            email_confirmed BOOLEAN                          NOT NULL DEFAULT 0 COMMENT 'Подтверждение почты',
            created_at     TIMESTAMP                                 DEFAULT CURRENT_TIMESTAMP,
            updated_at     TIMESTAMP                                 DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at     TIMESTAMP                        NULL     DEFAULT NULL,
            role_id        INT unsigned                     NOT NULL,
            token          VARCHAR(255) COLLATE utf8mb4_bin COMMENT 'токен авторизации пользователя',
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS reset_tokens
        (
            id          INT          NOT NULL AUTO_INCREMENT,
            user_id     INT unsigned NOT NULL,
            token       VARCHAR(255) COLLATE utf8mb4_bin COMMENT 'токен cброса пароля пользователя',
            expire_date TIMESTAMP,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS companies
        (
            id                    INT unsigned                     NOT NULL AUTO_INCREMENT,
            owner_id              INT unsigned                     NOT NULL,
            name                  VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'Имя компании',
            inn                   VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'ИНН компании',
            company_business_line TEXT COLLATE utf8mb4_bin COMMENT 'Направление деятельности',
            employees_count       INT(11) COMMENT 'Количество сотрудников',
            site_url              VARCHAR(255) COLLATE utf8mb4_bin COMMENT 'Адрес сайта',
            promoted_products     TEXT COLLATE utf8mb4_bin COMMENT 'Продвигаемые продукты',
            products_of_interest  TEXT COLLATE utf8mb4_bin COMMENT 'Интересующие продукты',
            main_customers        TEXT COLLATE utf8mb4_bin COMMENT 'Основные заказчики',
            status ENUM('pending', 'accept', 'reject') DEFAULT 'pending',
            created_at            TIMESTAMP                             DEFAULT CURRENT_TIMESTAMP,
            updated_at            TIMESTAMP                             DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at            TIMESTAMP                        NULL DEFAULT NULL,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS roles
        (
            id          INT unsigned                     NOT NULL AUTO_INCREMENT,
            name        VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
            description TEXT COLLATE utf8mb4_bin,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at  TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS company_employees
        (
            id          INT unsigned NOT NULL AUTO_INCREMENT,
            company_id  INT unsigned NOT NULL COMMENT 'владелец или ответственное лицо компании',
            employee_id INT unsigned NOT NULL COMMENT 'сотрудник компании',
            status ENUM('pending', 'accept', 'reject') DEFAULT 'pending', 
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at  TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS images
        (
            id         INT                              NOT NULL AUTO_INCREMENT,
            image_src  VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'ссылка на изображение',
            image_name VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'имя изображения',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS deals
                             (
                                 id               INT          NOT NULL AUTO_INCREMENT,
                                 company_id       INT unsigned NOT NULL COMMENT 'id партнера',
                                 customer_id      INT          NOT NULL,
                                 configuration_id INT,
                                 deal_sum         DOUBLE(10, 2) COMMENT 'сумма сделки',
                                 competition_link VARCHAR(255) COLLATE utf8mb4_bin COMMENT 'Ссылка на конкурс',
                                 purchase_date    DATETIME COMMENT 'дата закупки',
                                 distributor_id   INT COMMENT 'дистрибьютер',
                                 comment          TEXT COLLATE utf8mb4_bin COMMENT 'комментарий',
                                 status           ENUM (
                                     'registered', 'canceled', 'moderation',
                                     'win', 'loose'
                                     )                         NOT NULL DEFAULT 'moderation',
                                 special_discount DOUBLE(10, 2) COMMENT 'размер скидки',
                                 special_price    DOUBLE(10, 2) COMMENT 'специальная цена',
                                 discount_date    DATETIME COMMENT 'срок действия предложения от вендора',
                                 PRIMARY KEY (id)
                             ) ENGINE = InnoDB
                               DEFAULT CHARSET = utf8mb4
                               COLLATE = utf8mb4_bin
                               ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS customers
        (
            id           INT                              NOT NULL AUTO_INCREMENT,
            first_name   VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
            last_name    VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
            inn          VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'ИНН',
            company_name VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'имя компании',
            email        VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
            phone        VARCHAR(255) COLLATE utf8mb4_bin,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS distributors
        (
            id         INT NOT NULL AUTO_INCREMENT,
            name       VARCHAR(255) COLLATE utf8mb4_bin COMMENT 'название',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS configurations
        (
            id          INT           NOT NULL AUTO_INCREMENT,
            user_id     INT unsigned  NOT NULL,
            document_id INT,
            total_price DOUBLE(10, 2) NOT NULL DEFAULT '0',
            created_at  TIMESTAMP              DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at  TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS news
        (
            id          INT                              NOT NULL AUTO_INCREMENT,
            title       VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'заголовок',
            description TEXT COLLATE utf8mb4_bin         NOT NULL,
            image_id    INT,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at  TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS notifications
        (
            id         INT                              NOT NULL AUTO_INCREMENT,
            user_id    INT unsigned                     NOT NULL,
            title      VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'заголовок уведомления',
            text       TEXT COLLATE utf8mb4_bin         NOT NULL COMMENT 'текст уведомления',
            type       ENUM ('email', 'site')           NOT NULL COMMENT 'тип, уведомления на сайте или по почте',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            read_at    TIMESTAMP COMMENT 'дата прочтения. Если не прочитано то null',
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS user_settings
        (
            id         INT                              NOT NULL AUTO_INCREMENT,
            user_id    INT unsigned                     NOT NULL,
            type       ENUM (
                'notifications_web', 'notifications_email',
                'theme'
                )                                       NOT NULL COMMENT 'Тип настройки',
            value      VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'значение настройки',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS components
        (
            id          INT                      NOT NULL AUTO_INCREMENT,
            name        TEXT COLLATE utf8mb4_bin NOT NULL COMMENT 'Название компонента',
            description TEXT COLLATE utf8mb4_bin NOT NULL COMMENT 'Описание характеристик',
            price       DOUBLE(10, 2)            NOT NULL COMMENT 'цена',
            image_id    INT,
            type_id     INT                      NOT NULL COMMENT 'Тип компонента',
            subtype_id  INT                      NOT NULL COMMENT 'Подтипы для некоторых компонентов. Например SATA, SSDдля жестких дисков',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at  TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS files
        (
            id         INT                              NOT NULL AUTO_INCREMENT,
            file_src   VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
            file_name  VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS components_compatibility
        (
            component_id            INT NOT NULL COMMENT 'id компонента ',
            compatible_component_id INT NOT NULL COMMENT 'id компонента-подходящего к данному'
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS configuration_components
        (
            configuration_id INT     NOT NULL,
            component_id     INT     NOT NULL,
            count            INT(11) NOT NULL DEFAULT '1' COMMENT 'Количество компонентов в кофигурации',
            created_at       TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at       TIMESTAMP,
            PRIMARY KEY (component_id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS component_types
        (
            id         INT       NOT NULL AUTO_INCREMENT,
            name       CHAR(36)  NOT NULL COMMENT 'Название типа',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL,
            deleted_at TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS components_limits
        (
            id                INT       NOT NULL AUTO_INCREMENT,
            updated_at        TIMESTAMP NOT NULL,
            component_type_id INT       NOT NULL,
            max_count         INT(11)   NOT NULL DEFAULT '1' COMMENT 'Макс.количество компонента в конфигурации',
            created_at        TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
            deleted_at        TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS password_reset_logs
        (
            id         INT                              NOT NULL AUTO_INCREMENT,
            email      VARCHAR(255) COLLATE utf8mb4_bin,
            ip         VARCHAR(255) COLLATE utf8mb4_bin,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            code       VARCHAR(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'код восстановления',
            deleted_at TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS users_info
        (
            id           INT                              NOT NULL AUTO_INCREMENT,
            user_id      INT unsigned                     NOT NULL,
            company_name TEXT COLLATE utf8mb4_bin         NOT NULL,
            first_name   VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
            last_name    VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
            job_title    VARCHAR(255) COLLATE utf8mb4_bin COMMENT 'должность',
            phone        VARCHAR(255) COLLATE utf8mb4_bin,
            photo_id     INT,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS cnf_slots
        (
            id         varchar(36) COLLATE utf8mb4_bin DEFAULT '(UUID())',
            name       varchar(36) COLLATE utf8mb4_bin DEFAULT NULL,
            type_id    varchar(36) COLLATE utf8mb4_bin DEFAULT NULL,
            created_at timestamp        NOT NULL       DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp        NOT NULL       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS cnf_servers
        (
            id                  varchar(36) COLLATE utf8mb4_bin DEFAULT '(UUID())',
            name                varchar(36) COLLATE utf8mb4_bin NOT NULL,
            serverbox_height_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
            price               decimal(11, 0)            DEFAULT NULL,
            image_id            int(11) unsigned        DEFAULT NULL,
            created_at          timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at          timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS cnf_server_slots
        (
            id            int(11) unsigned NOT NULL AUTO_INCREMENT,
            server_id     varchar(36) COLLATE utf8mb4_bin NOT NULL,
            slot_id       varchar(36) COLLATE utf8mb4_bin NOT NULL,
            amount        decimal(11, 0) unsigned   DEFAULT NULL,
            on_back_panel tinyint(1)                DEFAULT NULL,
            created_at    timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at    timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS cnf_serverbox_height
        (
            id varchar(36) COLLATE utf8mb4_bin NOT NULL DEFAULT '(UUID())',
            name       varchar(11) CHARACTER SET utf8mb4 NOT NULL,
            created_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS cnf_components
        (
            id         varchar(36) COLLATE utf8mb4_bin DEFAULT '(UUID())',
            type_id    varchar(36) COLLATE utf8mb4_bin  NOT NULL,
            name       varchar(250) COLLATE utf8mb4_bin NOT NULL,
            price      int(250) unsigned NOT NULL,
            created_at timestamp        NOT NULL       DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp        NOT NULL       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS cnf_component_types
        (
            id         varchar(36) COLLATE utf8mb4_bin  DEFAULT '(UUID())',
            name       varchar(36) CHARACTER SET utf8mb4 NOT NULL,
            created_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin
          ROW_FORMAT = DYNAMIC;`);

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS cnf_multislots
        (
            id varchar(36) COLLATE utf8mb4_bin NOT NULL DEFAULT '(UUID())',
            name       varchar(250) CHARACTER SET utf8mb4 NOT NULL,
            created_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin;`);
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS cnf_server_multislots
        (
            id         int(11) unsigned NOT NULL AUTO_INCREMENT,
            server_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
            multislot_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
            amount int(36) unsigned          NOT NULL,
            on_back_panel tinyint(1)                DEFAULT NULL,
            created_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin;`);

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS cnf_multislot_slots
        (
            id varchar(36) COLLATE utf8mb4_bin NOT NULL DEFAULT '(UUID())',
            slot_id       varchar(36) COLLATE utf8mb4_bin NOT NULL,
            multislot_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
            created_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin;`);

    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS cnf_component_slots
        (
            id         int(36) unsigned NOT NULL AUTO_INCREMENT,
            slot_id       varchar(36) COLLATE utf8mb4_bin NOT NULL,
            component_id varchar(36) COLLATE utf8mb4_bin NOT NULL,
            amount int(36) unsigned          NOT NULL,
            increase tinyint(1)                DEFAULT NULL,
            created_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp                         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8mb4
          COLLATE = utf8mb4_bin;`);


    await queryRunner.query(`ALTER TABLE cnf_servers
        ADD FOREIGN KEY (serverbox_height_id) REFERENCES cnf_serverbox_height (id);`);
    await queryRunner.query(`ALTER TABLE cnf_server_slots
        ADD FOREIGN KEY (server_id) REFERENCES cnf_servers (id) ON DELETE CASCADE;`);
    await queryRunner.query(`ALTER TABLE cnf_server_slots
        ADD FOREIGN KEY (slot_id) REFERENCES cnf_slots (id);`);
    await queryRunner.query(`ALTER TABLE cnf_slots
        ADD FOREIGN KEY (type_id) REFERENCES cnf_component_types (id);`);
    await queryRunner.query(`ALTER TABLE users
        ADD FOREIGN KEY (role_id) REFERENCES roles (id);`);
    await queryRunner.query(`ALTER TABLE companies
        ADD FOREIGN KEY (owner_id) REFERENCES users (id);`);
    await queryRunner.query(`ALTER TABLE company_employees
        ADD FOREIGN KEY (employee_id) REFERENCES users (id);`);
    await queryRunner.query(`ALTER TABLE deals
        ADD FOREIGN KEY (company_id) REFERENCES users (id);`);
    await queryRunner.query(`ALTER TABLE deals
        ADD FOREIGN KEY (customer_id) REFERENCES customers (id);`);
    await queryRunner.query(`ALTER TABLE deals
        ADD FOREIGN KEY (configuration_id) REFERENCES configurations (id);`);
    await queryRunner.query(`ALTER TABLE deals
        ADD FOREIGN KEY (distributor_id) REFERENCES distributors (id);`);
    await queryRunner.query(`ALTER TABLE configurations
        ADD FOREIGN KEY (user_id) REFERENCES users (id);`);
    await queryRunner.query(`ALTER TABLE configurations
        ADD FOREIGN KEY (document_id) REFERENCES files (id);`);
    await queryRunner.query(`ALTER TABLE news
        ADD FOREIGN KEY (image_id) REFERENCES images (id);`);
    await queryRunner.query(`ALTER TABLE notifications
        ADD FOREIGN KEY (user_id) REFERENCES users (id);`);
    await queryRunner.query(`ALTER TABLE user_settings
        ADD FOREIGN KEY (user_id) REFERENCES users (id);`);
    await queryRunner.query(`ALTER TABLE components
        ADD FOREIGN KEY (image_id) REFERENCES images (id);`);
    await queryRunner.query(`ALTER TABLE components
        ADD FOREIGN KEY (type_id) REFERENCES component_types (id);`);
    await queryRunner.query(`ALTER TABLE components
        ADD FOREIGN KEY (subtype_id) REFERENCES component_types (id);`);
    await queryRunner.query(`ALTER TABLE components_compatibility
        ADD FOREIGN KEY (component_id) REFERENCES components (id);`);
    await queryRunner.query(`ALTER TABLE components_compatibility
        ADD FOREIGN KEY (compatible_component_id) REFERENCES components (id);`);
    await queryRunner.query(`ALTER TABLE configuration_components
        ADD FOREIGN KEY (configuration_id) REFERENCES configurations (id);`);
    await queryRunner.query(`ALTER TABLE configuration_components
        ADD FOREIGN KEY (component_id) REFERENCES components (id);`);
    await queryRunner.query(`ALTER TABLE components_limits
        ADD FOREIGN KEY (component_type_id) REFERENCES component_types (id);`);
    await queryRunner.query(`ALTER TABLE users_info
        ADD FOREIGN KEY (user_id) REFERENCES users (id);`);
    await queryRunner.query(`ALTER TABLE users_info
        ADD FOREIGN KEY (photo_id) REFERENCES images (id);`);
    await queryRunner.query(`ALTER TABLE cnf_server_multislots 
        ADD FOREIGN KEY (server_id) REFERENCES cnf_servers (id) on DELETE CASCADE;`);
    await queryRunner.query(`ALTER TABLE cnf_server_multislots 
        ADD FOREIGN KEY (multislot_id) REFERENCES cnf_multislots (id) on DELETE CASCADE;`);
    await queryRunner.query(`ALTER TABLE cnf_multislot_slots 
        ADD FOREIGN KEY (multislot_id) REFERENCES cnf_multislots (id) on DELETE CASCADE;`);
    await queryRunner.query(`ALTER TABLE cnf_multislot_slots 
        ADD FOREIGN KEY (slot_id) REFERENCES cnf_slots (id) on DELETE CASCADE;`);

    await queryRunner.query(`ALTER TABLE cnf_component_slots 
        ADD FOREIGN KEY (slot_id) REFERENCES cnf_slots (id);`);
    await queryRunner.query(`ALTER TABLE cnf_component_slots
        ADD FOREIGN KEY (component_id) REFERENCES cnf_components (id) on DELETE CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dbnameQuery = await queryRunner.query("SELECT DATABASE();");
    const dbname = Object.values(dbnameQuery[0])[0];
    await queryRunner.query("SET FOREIGN_KEY_CHECKS = 0;");
    const queryList = await queryRunner.query(`
        SELECT concat('DROP TABLE IF EXISTS \`', table_name, '\`;')
        FROM information_schema.tables
        WHERE table_schema = '${dbname}';`);

    const awaitArr = queryList
      .map(el => Object.values(el)[0] as string)
      .filter(el => !el.toLowerCase().includes("migrations"))
      .map(async el => await queryRunner.query(el));

    return Promise
      .all(awaitArr)
      .then(() => queryRunner.query("SET FOREIGN_KEY_CHECKS = 1;"));
  }
}
