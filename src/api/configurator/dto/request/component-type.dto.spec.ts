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
      {
        name: "CPU",
        move_selected_to_top: false,
        default_selected_quantity: "2",
      },
      metadata(CreateComponentTypeDto),
    );

    expect(result).toBeInstanceOf(CreateComponentTypeDto);
    expect(result.move_selected_to_top).toBe(false);
    expect(result.default_selected_quantity).toBe(2);
  });

  it("rejects a non-boolean ordering setting", async () => {
    await expect(
      pipe.transform(
        { move_selected_to_top: "false" },
        metadata(UpdateComponentTypeDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an invalid default selected quantity", async () => {
    await expect(
      pipe.transform(
        { default_selected_quantity: 0 },
        metadata(UpdateComponentTypeDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
