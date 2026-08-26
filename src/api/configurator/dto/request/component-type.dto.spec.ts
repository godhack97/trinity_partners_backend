import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { CreateComponentTypeDto } from "./create-component-type.dto";
import { UpdateComponentTypeDto } from "./update-component-type.dto";

describe("component type DTO", () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata = (metatype: any) => ({
    type: "body" as const,
    metatype,
    data: undefined,
  });

  it("accepts the selected-component ordering setting", async () => {
    const result = await pipe.transform(
      { name: "CPU", move_selected_to_top: false },
      metadata(CreateComponentTypeDto),
    );

    expect(result).toBeInstanceOf(CreateComponentTypeDto);
    expect(result.move_selected_to_top).toBe(false);
  });

  it("rejects a non-boolean ordering setting", async () => {
    await expect(
      pipe.transform(
        { move_selected_to_top: "false" },
        metadata(UpdateComponentTypeDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
