import { RoleTypes } from "@app/types/RoleTypes";
import { STRICT_ROLES } from "@decorators/StrictRoles";
import { DealDuplicateReviewStatus } from "@orm/entities";
import { AdminDealController } from "./admin-deal.controller";
import { ReviewDealDuplicateDto } from "./dto/request/review-deal-duplicate.dto";

describe("AdminDealController duplicate review", () => {
  const dealsService = {
    reviewDuplicate: jest.fn(),
    getDuplicateReviewContext: jest.fn(),
  };
  const controller = new AdminDealController(dealsService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes the authenticated actor and complete review DTO to the service", () => {
    const actor = {
      id: 22,
      role: { name: RoleTypes.PartnerManager },
    } as any;
    const reviewDto: ReviewDealDuplicateDto = {
      status: DealDuplicateReviewStatus.NotDuplicate,
      comment: "Проверено вручную",
    };

    controller.reviewDuplicate("7", reviewDto, actor);

    expect(dealsService.reviewDuplicate).toHaveBeenCalledWith(
      7,
      reviewDto,
      actor,
    );
  });

  it("uses strict role metadata for super admins and partner managers", () => {
    expect(
      Reflect.getMetadata(
        STRICT_ROLES,
        AdminDealController.prototype.reviewDuplicate,
      ),
    ).toEqual([RoleTypes.SuperAdmin, RoleTypes.PartnerManager]);
  });

  it("passes the actor to the scoped duplicate comparison context", () => {
    const actor = {
      id: 22,
      role: { name: RoleTypes.PartnerManager },
    } as any;

    controller.duplicateReviewContext("7", actor);

    expect(dealsService.getDuplicateReviewContext).toHaveBeenCalledWith(
      7,
      actor,
    );
    expect(
      Reflect.getMetadata(
        STRICT_ROLES,
        AdminDealController.prototype.duplicateReviewContext,
      ),
    ).toEqual([RoleTypes.SuperAdmin, RoleTypes.PartnerManager]);
  });
});
