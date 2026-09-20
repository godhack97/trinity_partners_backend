import { DealEntity } from "./deal.entity";
import { UserIdentityEntity } from "./user-identity.entity";

describe("historical user identity", () => {
  it("keeps the deal creator readable after the account is removed", () => {
    const identity = Object.assign(new UserIdentityEntity(), {
      id: 42,
      email: "former.user@example.test",
      first_name: "Иван",
      last_name: "Иванов",
      job_title: "Архитектор",
      roles_snapshot: [
        { id: 3, name: "partner", display_name: "Партнёр" },
      ],
      permanently_deleted_at: new Date("2026-09-20T10:00:00Z"),
    });
    const deal = Object.assign(new DealEntity(), {
      creator_id: 42,
      partner: null,
      creator_identity: identity,
    });

    deal.useHistoricalCreator();

    expect(deal.partner).toMatchObject({
      id: 42,
      email: "former.user@example.test",
      is_activated: false,
      user_info: {
        first_name: "Иван",
        last_name: "Иванов",
        job_title: "Архитектор",
      },
      roles: [{ id: 3, name: "partner", display_name: "Партнёр" }],
    });
  });
});
