import { of, throwError } from "rxjs";
import { Bitrix24Service } from "./bitrix24.service";

describe("Bitrix24Service lead idempotency", () => {
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

  it("looks up and reuses a remote lead by the stable internal deal id", async () => {
    const { service, httpService } = createService();
    httpService.post.mockImplementation((url: string) => {
      if (url.endsWith("/crm.lead.list.json")) {
        return of({ data: { result: [{ ID: "456" }] } });
      }
      if (url.endsWith("/crm.lead.update.json")) {
        return of({ data: { result: true } });
      }
      throw new Error(`Unexpected Bitrix24 request: ${url}`);
    });

    await expect(
      service.createLead(
        {
          id: 41,
          deal_num: "D-41",
          partner: { id: 7, email: "partner@example.test" },
        } as any,
        null,
        "Distributor",
        90,
      ),
    ).resolves.toBe(456);

    expect(httpService.post).toHaveBeenNthCalledWith(
      1,
      "https://bitrix.test/crm.lead.list.json",
      {
        filter: { "=UF_CRM_1749553924": 41 },
        select: ["ID", "UF_CRM_1749553924"],
        order: { ID: "ASC" },
      },
    );
    expect(httpService.post).toHaveBeenNthCalledWith(
      2,
      "https://bitrix.test/crm.lead.update.json",
      expect.objectContaining({ id: 456 }),
    );
    expect(
      httpService.post.mock.calls.some(([url]) =>
        String(url).endsWith("/crm.lead.add.json"),
      ),
    ).toBe(false);
  });

  it("updates a locally linked lead without lookup or add", async () => {
    const { service, httpService } = createService();
    httpService.post.mockReturnValue(of({ data: { result: true } }));

    await expect(
      service.createLead(
        {
          id: 41,
          deal_num: "D-41",
          bitrix24_deal_id: 777,
          partner: { id: 7 },
        } as any,
        null,
      ),
    ).resolves.toBe(777);

    expect(httpService.post).toHaveBeenCalledTimes(1);
    expect(httpService.post).toHaveBeenCalledWith(
      "https://bitrix.test/crm.lead.update.json",
      expect.objectContaining({ id: 777 }),
    );
  });

  it("does not blindly retry an uncertain lead add", async () => {
    const { service, httpService } = createService();
    httpService.post.mockImplementation((url: string) => {
      if (url.endsWith("/crm.lead.list.json")) {
        return of({ data: { result: [] } });
      }
      if (url.endsWith("/crm.lead.add.json")) {
        return throwError(() => new Error("response timeout"));
      }
      throw new Error(`Unexpected Bitrix24 request: ${url}`);
    });

    await expect(
      service.createLead(
        {
          id: 41,
          deal_num: "D-41",
          partner: { id: 7 },
        } as any,
        null,
        undefined,
        90,
      ),
    ).resolves.toBeNull();

    const addCalls = httpService.post.mock.calls.filter(([url]) =>
      String(url).endsWith("/crm.lead.add.json"),
    );
    expect(addCalls).toHaveLength(1);
  });

  it("uses the contact created during this lead attempt", async () => {
    const { service, httpService } = createService();
    jest.spyOn(service, "createContact").mockResolvedValue(91);
    httpService.post.mockImplementation((url: string) => {
      if (url.endsWith("/crm.lead.list.json")) {
        return of({ data: { result: [] } });
      }
      if (url.endsWith("/crm.lead.add.json")) {
        return of({ data: { result: 555 } });
      }
      throw new Error(`Unexpected Bitrix24 request: ${url}`);
    });

    await expect(
      service.createLead(
        {
          id: 42,
          deal_num: "D-42",
          partner: { id: 8, email: "partner@example.test" },
        } as any,
        null,
      ),
    ).resolves.toBe(555);

    expect(httpService.post).toHaveBeenCalledWith(
      "https://bitrix.test/crm.lead.add.json",
      expect.objectContaining({
        fields: expect.objectContaining({ CONTACT_ID: 91 }),
      }),
    );
  });
});
