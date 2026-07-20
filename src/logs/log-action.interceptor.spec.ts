import { lastValueFrom, of } from "rxjs";
import { LogActionInterceptor } from "./log-action.interceptor";

describe("LogActionInterceptor", () => {
  it("stores the created entity id so create history is queryable", async () => {
    const log = jest.fn();
    const interceptor = new LogActionInterceptor(
      { get: jest.fn().mockReturnValue({ action: "document_create", entity: "documents" }) } as any,
      { log } as any,
      {} as any,
    );
    const request = {
      auth_user: { id: 7 },
      params: {},
      body: { name: "Document" },
      query: {},
    };
    const context: any = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    };

    await lastValueFrom(interceptor.intercept(context, { handle: () => of({ id: 42 }) }));

    expect(log).toHaveBeenCalledWith(
      7,
      "document_create",
      expect.objectContaining({
        entity: "documents",
        body: { name: "Document", id: 42 },
      }),
    );
  });

  it("stores the numeric snapshot id for delete routes addressed by slug", async () => {
    const log = jest.fn();
    const queryBuilder: any = {
      where: jest.fn(),
      getMany: jest.fn().mockResolvedValue([{ id: 9, name: "Article" }]),
    };
    queryBuilder.where.mockReturnValue(queryBuilder);
    const interceptor = new LogActionInterceptor(
      { get: jest.fn().mockReturnValue({ action: "news_delete", entity: "news" }) } as any,
      { log } as any,
      { getRepository: () => ({ createQueryBuilder: () => queryBuilder }) } as any,
    );
    const request = {
      auth_user: { id: 7 },
      params: { slug: "article" },
      body: {},
      query: {},
    };
    const context: any = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    };

    await lastValueFrom(interceptor.intercept(context, { handle: () => of(undefined) }));

    expect(log).toHaveBeenCalledWith(
      7,
      "news_delete",
      expect.objectContaining({ body: { id: 9 } }),
    );
  });
});
