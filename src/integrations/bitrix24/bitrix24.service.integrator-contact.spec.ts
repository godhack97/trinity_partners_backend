import { of, throwError } from "rxjs";
import { Bitrix24Service } from "./bitrix24.service";

describe("Bitrix24Service integrator contact identity", () => {
  const createService = () => {
    const httpService = { post: jest.fn() };
    const service = new Bitrix24Service(
      httpService as any,
      { get: jest.fn().mockReturnValue("https://bitrix.test") } as any,
      {} as any,
      {} as any,
    );
    return { service, httpService };
  };

  it("reuses the first contact found by exact partner INN", async () => {
    const { service, httpService } = createService();
    httpService.post.mockReturnValue(
      of({ data: { result: [{ ID: "321" }] } }),
    );

    await expect(
      service.findOrCreateIntegratorContact({
        name: "ООО Интегратор",
        inn: "7707083893",
      }),
    ).resolves.toBe(321);

    expect(httpService.post).toHaveBeenCalledTimes(1);
    expect(httpService.post).toHaveBeenCalledWith(
      "https://bitrix.test/crm.contact.list.json",
      {
        filter: { "=UF_CRM_68500D3603B21": "7707083893" },
        select: [
          "ID",
          "NAME",
          "LAST_NAME",
          "COMPANY_TITLE",
          "UF_CRM_68500D3603B21",
        ],
        order: { ID: "ASC" },
      },
    );
  });

  it("propagates lookup errors and does not add a contact", async () => {
    const { service, httpService } = createService();
    httpService.post.mockReturnValue(
      throwError(() => new Error("contact lookup timeout")),
    );
    jest.spyOn(service as any, "delay").mockResolvedValue(undefined);

    await expect(
      service.findOrCreateIntegratorContact({
        name: "ООО Интегратор",
        inn: "7707083893",
      }),
    ).rejects.toThrow("contact lookup timeout");

    expect(httpService.post).toHaveBeenCalledTimes(3);
    expect(
      httpService.post.mock.calls.some(([url]) =>
        String(url).endsWith("/crm.contact.add.json"),
      ),
    ).toBe(false);
  });

  it("does not blindly retry an uncertain contact add", async () => {
    const { service, httpService } = createService();
    httpService.post.mockImplementation((url: string) => {
      if (url.endsWith("/crm.contact.list.json")) {
        return of({ data: { result: [] } });
      }
      if (url.endsWith("/crm.contact.add.json")) {
        return throwError(() => new Error("contact add timeout"));
      }
      throw new Error(`Unexpected Bitrix24 request: ${url}`);
    });

    await expect(
      service.findOrCreateIntegratorContact({
        name: "ООО Интегратор",
        inn: "7707083893",
      }),
    ).resolves.toBeNull();

    expect(
      httpService.post.mock.calls.filter(([url]) =>
        String(url).endsWith("/crm.contact.add.json"),
      ),
    ).toHaveLength(1);
  });
});
