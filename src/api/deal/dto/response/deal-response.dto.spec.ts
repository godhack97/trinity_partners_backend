import { plainToInstance } from "class-transformer";
import {
  Bitrix24SyncStatus,
  DealDuplicateReviewStatus,
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
        duplicate_of_deal_id: 2,
        duplicate_review_status: DealDuplicateReviewStatus.Pending,
        bitrix24_deal_id: 123,
        bitrix24_sync_status: Bitrix24SyncStatus.SYNCED,
        bitrix24_synced_at: "2026-07-17T10:00:00.000Z",
        configurations: [{ id: "cfg-1" }],
        attachments: [{ id: "file-1" }],
        comments: [{ id: "comment-1" }],
        integrator_company: { id: 8, name: "Интегратор", inn: "7701000000" },
        hidden_field: "must not leak",
      },
      { strategy: "excludeAll" },
    );

    expect(response).toMatchObject({
      id: 4,
      special_discount: "10%",
      special_price: 900,
      duplicate_of_deal_id: 2,
      duplicate_review_status: DealDuplicateReviewStatus.Pending,
      bitrix24_deal_id: 123,
      bitrix24_sync_status: Bitrix24SyncStatus.SYNCED,
      configurations: [{ id: "cfg-1" }],
      attachments: [{ id: "file-1" }],
      comments: [{ id: "comment-1" }],
      integrator_company: { id: 8, name: "Интегратор", inn: "7701000000" },
    });
    expect(response).not.toHaveProperty("hidden_field");
  });
});
