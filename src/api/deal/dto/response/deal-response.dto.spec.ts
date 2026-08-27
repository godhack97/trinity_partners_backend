import { plainToInstance } from "class-transformer";
import {
  Bitrix24SyncStatus,
  DealDuplicateReviewStatus,
  PartnershipType,
} from "@orm/entities";
import { DealResponseDto } from "./deal-response.dto";

describe("DealResponseDto current portal contract", () => {
  it("exposes duplicate, Bitrix and structural deal fields", () => {
    const response = plainToInstance(
      DealResponseDto,
      {
        id: 4,
        special_discount: "10%",
        special_price: 900,
        registration_expires_at: "2026-09-30T20:00:00.000Z",
        duplicate_of_deal_id: 2,
        duplicate_review_status: DealDuplicateReviewStatus.Pending,
        responsible_manager_id: 17,
        duplicate_reviewed_by_user_id: 19,
        duplicate_reviewed_at: "2026-08-12T10:30:00.000Z",
        duplicate_review_comment: "Проверено вручную",
        bitrix24_deal_id: 123,
        bitrix24_sync_status: Bitrix24SyncStatus.SYNCED,
        bitrix24_synced_at: "2026-07-17T10:00:00.000Z",
        configurations: [{ id: "cfg-1" }],
        attachments: [{ id: "file-1" }],
        comments: [{ id: "comment-1" }],
        distributor_company: {
          id: 7,
          name: "Дистрибьютор",
          inn: "7801000000",
          partnership_type: PartnershipType.Distributor,
          owner_id: 100,
          responsible_manager_id: 17,
          contact_email: "private@example.test",
          main_customers: "Внутренние данные",
        },
        integrator_company: {
          id: 8,
          name: "Интегратор",
          inn: "7701000000",
          partnership_type: PartnershipType.Integrator,
          owner_id: 101,
          contact_phone: "+79990000000",
        },
        creator_company: {
          id: 9,
          name: "Компания автора",
          contact_email: "must not leak",
        },
        responsible_manager: {
          id: 17,
          email: "manager@example.test",
          password: "must not leak",
          salt: "must not leak",
          user_info: {
            first_name: "Мария",
            last_name: "Менеджер",
            phone: "must not leak",
          },
        },
        duplicate_reviewed_by_user: { id: 19, password: "must not leak" },
        partner: {
          id: 44,
          email: "creator@example.test",
          password: "must not leak",
          salt: "must not leak",
          is_activated: true,
          email_confirmed: true,
          role: { id: 1, name: "partner" },
          roles: [{ id: 2, name: "company_admin" }],
          manager: { id: 17, email: "manager@example.test" },
          user_info: {
            first_name: "Иван",
            last_name: "Создатель",
            job_title: "Менеджер",
            phone: "+79990000000",
            photo_url: "must not leak",
            company_name: "must not leak",
          },
          owner_company: {
            id: 9,
            name: "Компания автора",
            inn: "7707083893",
            partnership_type: PartnershipType.Integrator,
            owner_id: 44,
            main_customers: "must not leak",
          },
        },
        can_comment: true,
        can_view_configuration: true,
        can_decide: false,
        hidden_field: "must not leak",
      },
      { strategy: "excludeAll" },
    );

    expect(response).toMatchObject({
      id: 4,
      special_discount: "10%",
      special_price: 900,
      registration_expires_at: "2026-09-30T20:00:00.000Z",
      duplicate_of_deal_id: 2,
      duplicate_review_status: DealDuplicateReviewStatus.Pending,
      responsible_manager_id: 17,
      responsible_manager: {
        id: 17,
        email: "manager@example.test",
        user_info: { first_name: "Мария", last_name: "Менеджер" },
      },
      duplicate_reviewed_by_user_id: 19,
      duplicate_reviewed_at: "2026-08-12T10:30:00.000Z",
      duplicate_review_comment: "Проверено вручную",
      bitrix24_deal_id: 123,
      bitrix24_sync_status: Bitrix24SyncStatus.SYNCED,
      configurations: [{ id: "cfg-1" }],
      attachments: [{ id: "file-1" }],
      comments: [{ id: "comment-1" }],
      distributor_company: {
        id: 7,
        name: "Дистрибьютор",
        inn: "7801000000",
        partnership_type: PartnershipType.Distributor,
      },
      integrator_company: {
        id: 8,
        name: "Интегратор",
        inn: "7701000000",
        partnership_type: PartnershipType.Integrator,
      },
      can_comment: true,
      can_view_configuration: true,
      can_decide: false,
    });
    expect(response).not.toHaveProperty("hidden_field");
    expect(response.responsible_manager).not.toHaveProperty("password");
    expect(response.responsible_manager).not.toHaveProperty("salt");
    expect(response.responsible_manager.user_info).not.toHaveProperty("phone");
    expect(response).not.toHaveProperty("duplicate_reviewed_by_user");
    expect(response).not.toHaveProperty("creator_company");
    expect(response.distributor_company).not.toHaveProperty("owner_id");
    expect(response.distributor_company).not.toHaveProperty(
      "responsible_manager_id",
    );
    expect(response.distributor_company).not.toHaveProperty("contact_email");
    expect(response.distributor_company).not.toHaveProperty("main_customers");
    expect(response.integrator_company).not.toHaveProperty("owner_id");
    expect(response.integrator_company).not.toHaveProperty("contact_phone");
    expect(response.partner).toMatchObject({
      id: 44,
      email: "creator@example.test",
    });
    expect(response.partner).not.toHaveProperty("password");
    expect(response.partner).not.toHaveProperty("salt");
    expect(response.partner).not.toHaveProperty("is_activated");
    expect(response.partner).not.toHaveProperty("email_confirmed");
    expect(response.partner).not.toHaveProperty("role");
    expect(response.partner).not.toHaveProperty("roles");
    expect(response.partner).not.toHaveProperty("manager");
    expect(response.partner.user_info).toMatchObject({
      first_name: "Иван",
      last_name: "Создатель",
      job_title: "Менеджер",
      phone: "+79990000000",
    });
    expect(response.partner.user_info).not.toHaveProperty("photo_url");
    expect(response.partner.user_info).not.toHaveProperty("company_name");
    expect(response.partner.owner_company).toMatchObject({
      id: 9,
      name: "Компания автора",
      inn: "7707083893",
      partnership_type: PartnershipType.Integrator,
    });
    expect(response.partner.owner_company).not.toHaveProperty("owner_id");
    expect(response.partner.owner_company).not.toHaveProperty("main_customers");
  });
});
