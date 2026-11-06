import { RoleTypes } from "@app/types/RoleTypes";
import { DealService } from "./deal.service";
import { DealChannelType, UserEntity } from "@orm/entities";
import { PartnershipType } from "@orm/entities/company.entity";

const user = (id: number, role: RoleTypes) =>
  ({ id, role: { name: role }, roles: [] } as unknown as UserEntity);

describe("DealService collaboration channel access", () => {
  const deal = {
    id: 10,
    responsible_manager_id: 7,
    creator_company_id: 20,
    integrator_company_id: 20,
    distributor_company_id: 30,
    distributor_sent_at: new Date("2026-11-01T10:00:00Z"),
    distributor_revoked_at: null,
  };

  const channel = (channel_type: DealChannelType) => ({ channel_type });

  it("keeps the partner-distributor channel hidden from the vendor manager", async () => {
    const service = Object.create(DealService.prototype) as DealService;
    const actor = user(7, RoleTypes.PartnerManager);

    await expect(
      (service as any).canAccessDealChannel(
        deal,
        channel(DealChannelType.VendorPartner),
        actor,
      ),
    ).resolves.toBe(true);
    await expect(
      (service as any).canAccessDealChannel(
        deal,
        channel(DealChannelType.PartnerDistributor),
        actor,
      ),
    ).resolves.toBe(false);
  });

  it("shows a partner only general and partner-side channels", async () => {
    const service = Object.create(DealService.prototype) as DealService;
    (service as any).getUserCompany = jest.fn().mockResolvedValue({
      id: 20,
      partnership_type: PartnershipType.Integrator,
    });
    const actor = user(11, RoleTypes.CompanyAdmin);

    await expect(
      (service as any).canAccessDealChannel(
        deal,
        channel(DealChannelType.VendorPartner),
        actor,
      ),
    ).resolves.toBe(true);
    await expect(
      (service as any).canAccessDealChannel(
        deal,
        channel(DealChannelType.PartnerDistributor),
        actor,
      ),
    ).resolves.toBe(true);
    await expect(
      (service as any).canAccessDealChannel(
        deal,
        channel(DealChannelType.VendorDistributor),
        actor,
      ),
    ).resolves.toBe(false);
  });

  it("denies every distributor channel until explicit send and after revoke", async () => {
    const service = Object.create(DealService.prototype) as DealService;
    (service as any).getUserCompany = jest.fn().mockResolvedValue({
      id: 30,
      partnership_type: PartnershipType.Distributor,
    });
    const actor = user(12, RoleTypes.CompanyAdmin);

    for (const inaccessibleDeal of [
      { ...deal, distributor_sent_at: null },
      { ...deal, distributor_revoked_at: new Date() },
    ]) {
      await expect(
        (service as any).canAccessDealChannel(
          inaccessibleDeal,
          channel(DealChannelType.General),
          actor,
        ),
      ).resolves.toBe(false);
      await expect(
        (service as any).canAccessDealChannel(
          inaccessibleDeal,
          channel(DealChannelType.VendorDistributor),
          actor,
        ),
      ).resolves.toBe(false);
    }
  });
});
