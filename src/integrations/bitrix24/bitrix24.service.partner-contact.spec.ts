import { throwError } from "rxjs";
import { Bitrix24Service } from "./bitrix24.service";

describe("Bitrix24Service partner contact creation", () => {
  it("uses the accepted owner/employee company identity and never retries add", async () => {
    const httpService = {
      post: jest
        .fn()
        .mockReturnValue(throwError(() => new Error("response timeout"))),
    };
    const companyRepository = {
      findUniqueAcceptedByUserId: jest.fn().mockResolvedValue({
        id: 22,
        name: "ООО Партнёр",
        inn: "7707083893",
      }),
    };
    const service = new Bitrix24Service(
      httpService as any,
      { get: jest.fn().mockReturnValue("https://bitrix.test") } as any,
      companyRepository as any,
      {} as any,
    );

    await expect(
      service.createContact({
        id: 7,
        email: "employee@example.test",
        info: { first_name: "Иван", last_name: "Иванов" },
      } as any),
    ).resolves.toBeNull();

    expect(companyRepository.findUniqueAcceptedByUserId).toHaveBeenCalledWith(
      7,
    );
    expect(httpService.post).toHaveBeenCalledTimes(1);
    expect(httpService.post).toHaveBeenCalledWith(
      "https://bitrix.test/crm.contact.add.json",
      {
        fields: expect.objectContaining({
          UF_CRM_68500D3603B21: "7707083893",
          EMAIL: [
            { VALUE: "employee@example.test", VALUE_TYPE: "WORK" },
          ],
        }),
      },
    );
  });

  it("uses an already-loaded owner company without another database lookup", async () => {
    const httpService = {
      post: jest
        .fn()
        .mockReturnValue(throwError(() => new Error("response timeout"))),
    };
    const companyRepository = {
      findUniqueAcceptedByUserId: jest.fn(),
    };
    const service = new Bitrix24Service(
      httpService as any,
      { get: jest.fn().mockReturnValue("https://bitrix.test") } as any,
      companyRepository as any,
      {} as any,
    );

    await service.createContact({
      id: 7,
      email: "owner@example.test",
      owner_company: { id: 22, name: "ООО Партнёр", inn: "7707083893" },
    } as any);

    expect(companyRepository.findUniqueAcceptedByUserId).not.toHaveBeenCalled();
    expect(httpService.post).toHaveBeenCalledTimes(1);
  });
});
