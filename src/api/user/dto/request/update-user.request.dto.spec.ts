import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { ArgumentMetadata } from "@nestjs/common/interfaces";
import { UpdateUserRequestDto } from "./update-user.request.dto";

describe("UpdateUserRequestDto whitelist", () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata: ArgumentMetadata = {
    type: "body",
    metatype: UpdateUserRequestDto,
  };

  it("accepts documented administrative user fields", async () => {
    await expect(
      pipe.transform(
        { email: "user@example.com", is_activated: false, manager_id: 3 },
        metadata,
      ),
    ).resolves.toMatchObject({
      email: "user@example.com",
      is_activated: false,
      manager_id: 3,
    });
  });

  it.each(["password", "salt", "role_id", "deleted_at"])(
    "rejects forbidden field %s",
    async (field) => {
      await expect(
        pipe.transform({ is_activated: true, [field]: "forbidden" }, metadata),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
