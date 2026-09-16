import { ForbiddenException } from "@nestjs/common";
import { UserRepository } from "./user.repository";

describe("UserRepository built-in administrator protection", () => {
  const typeormRepository = {
    findOne: jest.fn(),
    softDelete: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };
  const repository = new UserRepository(
    typeormRepository as any,
    {} as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    typeormRepository.findOne.mockResolvedValue({
      id: 143,
      email: "sancho97.2011@mail.ru",
    });
  });

  it.each(["softDelete", "delete"] as const)(
    "rejects %s for the built-in administrator",
    async (method) => {
      await expect(repository[method](143)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(typeormRepository[method]).not.toHaveBeenCalled();
    },
  );

  it("rejects role and activation changes", async () => {
    await expect(
      repository.update(143, { role_id: 5, is_activated: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(typeormRepository.update).not.toHaveBeenCalled();
  });

  it("allows non-identity updates", async () => {
    typeormRepository.update.mockResolvedValue({ affected: 1 });

    await repository.update(143, { failed_login_attempts: 0 });

    expect(typeormRepository.findOne).not.toHaveBeenCalled();
    expect(typeormRepository.update).toHaveBeenCalledWith(143, {
      failed_login_attempts: 0,
    });
  });
});
