import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AdminImportantAlertService } from "./admin-important-alert.service";
import { CreateImportantAlertDto } from "./dto/create-important-alert.dto";
import { UpdateImportantAlertDto } from "./dto/update-important-alert.dto";

const validAlert = {
  title: "Targeted alert",
  message: "Important message",
  severity: "warning",
  is_active: true,
  target_company_id: 42,
};

const makeService = (overrides: any = {}) => {
  const alertRepository: any = {
    findById: jest.fn().mockResolvedValue({ id: 1, ...validAlert }),
    save: jest.fn(async value => ({ id: 1, ...value })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    findAll: jest.fn(),
    ...overrides.alertRepository,
  };
  const companyRepository: any = {
    findOneBy: jest.fn().mockResolvedValue({ id: 42, name: "Company" }),
    find: jest.fn().mockResolvedValue([{ id: 42, name: "Company" }]),
    ...overrides.companyRepository,
  };
  return {
    service: new AdminImportantAlertService(alertRepository, companyRepository),
    alertRepository,
    companyRepository,
  };
};

describe("important alert contract", () => {
  it("validates required text, target ID and nullable all-company audience", async () => {
    const targeted = plainToInstance(CreateImportantAlertDto, validAlert);
    const global = plainToInstance(UpdateImportantAlertDto, {
      target_company_id: null,
    });
    const invalid = plainToInstance(CreateImportantAlertDto, {
      ...validAlert,
      title: " ",
      target_company_id: 0,
    });

    expect(await validate(targeted)).toHaveLength(0);
    expect(await validate(global)).toHaveLength(0);
    expect((await validate(invalid)).length).toBeGreaterThan(0);
  });

  it("rejects an unknown target company before creating an alert", async () => {
    const { service, alertRepository } = makeService({
      companyRepository: { findOneBy: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.create(validAlert as any, 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(alertRepository.save).not.toHaveBeenCalled();
  });

  it("preserves an explicit null when changing a targeted alert to global", async () => {
    const { service, alertRepository, companyRepository } = makeService();

    await service.update(1, { target_company_id: null });

    expect(companyRepository.findOneBy).not.toHaveBeenCalled();
    expect(alertRepository.update).toHaveBeenCalledWith(1, {
      target_company_id: null,
    });
  });
});
