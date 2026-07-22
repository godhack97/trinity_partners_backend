import { ForbiddenException } from "@nestjs/common";
import { RoleTypes } from "@app/types/RoleTypes";
import { CompanyManagementService } from "./company-management.service";
import { CompanyStatus } from "@orm/entities";

const service = new CompanyManagementService(
  {} as any,
  {} as any,
  {} as any,
  {} as any,
  {} as any,
);

const user = (id: number, role: RoleTypes) =>
  ({ id, role: { name: role }, roles: [] }) as any;

const company = (
  status: CompanyStatus,
  responsibleManagerId: number | null = null,
  reviewLocked = false,
) =>
  ({
    id: 10,
    owner_id: 90,
    status,
    responsible_manager_id: responsibleManagerId,
    review_locked_at: reviewLocked ? new Date() : null,
  }) as any;

describe("CompanyManagementService access policy", () => {
  const capabilities = (target: any, actor: any, own = false) =>
    (service as any).getCapabilities(target, actor, own);

  it("keeps technical specialist strictly read-only", () => {
    expect(
      capabilities(
        company(CompanyStatus.Pending),
        user(1, RoleTypes.TechnicalSpecialist),
      ),
    ).toEqual({
      can_approve: false,
      can_lock_review: false,
      can_unlock_review: false,
      can_suspend: false,
      can_resume: false,
      can_edit_contacts: false,
      can_assign_manager: false,
    });
  });

  it("lets a manager approve any unlocked pending company and manage only assigned active companies", () => {
    const manager = user(7, RoleTypes.PartnerManager);

    expect(
      capabilities(company(CompanyStatus.Pending), manager).can_approve,
    ).toBe(true);
    expect(
      capabilities(company(CompanyStatus.Accept, 7), manager).can_suspend,
    ).toBe(true);
    expect(
      capabilities(company(CompanyStatus.Accept, 8), manager).can_suspend,
    ).toBe(false);
    expect(
      capabilities(company(CompanyStatus.Suspended, 7), manager).can_resume,
    ).toBe(true);
  });

  it("gives super admin the matching lifecycle action and manager assignment", () => {
    const admin = user(1, RoleTypes.SuperAdmin);

    expect(
      capabilities(company(CompanyStatus.Pending), admin),
    ).toMatchObject({
      can_approve: true,
      can_lock_review: true,
      can_unlock_review: false,
      can_assign_manager: true,
    });
    expect(
      capabilities(company(CompanyStatus.Pending, null, true), admin),
    ).toMatchObject({
      can_approve: false,
      can_lock_review: false,
      can_unlock_review: true,
    });
  });

  it("allows contacts only in own active company for partner or company admin", () => {
    expect(
      capabilities(
        company(CompanyStatus.Accept),
        user(90, RoleTypes.Partner),
        true,
      ).can_edit_contacts,
    ).toBe(true);
    expect(
      capabilities(
        company(CompanyStatus.Accept),
        user(91, RoleTypes.CompanyAdmin),
        true,
      ).can_edit_contacts,
    ).toBe(true);
    expect(
      capabilities(
        company(CompanyStatus.Suspended),
        user(91, RoleTypes.CompanyAdmin),
        true,
      ).can_edit_contacts,
    ).toBe(false);
  });

  it("blocks a manager from opening a foreign active company by direct id", () => {
    expect(() =>
      (service as any).assertCanView(
        company(CompanyStatus.Accept, 8),
        user(7, RoleTypes.PartnerManager),
      ),
    ).toThrow(ForbiddenException);

    expect(() =>
      (service as any).assertCanView(
        company(CompanyStatus.Pending),
        user(7, RoleTypes.PartnerManager),
      ),
    ).not.toThrow();
  });

  it("does not hide companies whose owner has not confirmed email", () => {
    const query: any = {
      leftJoinAndMapOne: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
    };
    query.leftJoinAndMapOne.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.andWhere.mockReturnValue(query);
    const scopedService = new CompanyManagementService(
      { createQueryBuilder: jest.fn(() => query) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    (scopedService as any).createCompanyQuery(
      user(1, RoleTypes.SuperAdmin),
    );

    expect(query.where).not.toHaveBeenCalled();
    expect(query.andWhere).not.toHaveBeenCalled();
  });
});
