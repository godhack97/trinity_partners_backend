import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { SaveServerWithProfileRequestDto } from "./add-server.request.dto";

describe("SaveServerWithProfileRequestDto", () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata = {
    type: "body" as const,
    metatype: SaveServerWithProfileRequestDto,
    data: undefined,
  };

  const validPayload = () => ({
    name: "ER220",
    description: "Server platform",
    serverbox_height_id: "height-1",
    server_generation_id: "generation-1",
    price: 1000,
    image: "/public/server/front.webp",
    images: [
      "/public/server/front.webp",
      "/public/server/rear.webp",
    ],
    sort: 10,
    slots: [
      { slot_id: "slot-1", amount: 2, on_back_panel: false },
    ],
    multislots: [
      { multislot_id: "multislot-1", amount: 1, on_back_panel: true },
    ],
    profile: {
      platform_code: "ER220-M8",
      family: "ER220",
      pcie_layout_mode: "spaced",
      pcie_slots: 12,
      wide_pcie_slots: 8,
      psu_count: 4,
      ram_type: "DDR5",
      is_active: true,
    },
  });

  it("accepts the atomic server/profile payload and canonical panel fields", async () => {
    const result = await pipe.transform(validPayload(), metadata);

    expect(result).toBeInstanceOf(SaveServerWithProfileRequestDto);
    expect(result.profile.platform_code).toBe("ER220-M8");
    expect(result.profile.pcie_layout_mode).toBe("spaced");
    expect(result.profile.wide_pcie_slots).toBe(8);
    expect(result.profile.psu_count).toBe(4);
    expect(result.slots?.[0].on_back_panel).toBe(false);
    expect(result.multislots?.[0].on_back_panel).toBe(true);
    expect(result.images).toEqual([
      "/public/server/front.webp",
      "/public/server/rear.webp",
    ]);
  });

  it("rejects non-string values in the images array", async () => {
    const payload: any = validPayload();
    payload.images.push(42);

    await expect(pipe.transform(payload, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects a server without a platform profile", async () => {
    const { profile, ...payload } = validPayload();

    await expect(pipe.transform(payload, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects legacy camelCase panel fields instead of silently losing them", async () => {
    const payload: any = validPayload();
    delete payload.multislots[0].on_back_panel;
    Object.assign(payload.multislots[0], { onBackPanel: true });

    await expect(pipe.transform(payload, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects an active profile without required identity fields", async () => {
    const payload = validPayload();
    payload.profile.family = "";

    await expect(pipe.transform(payload, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects an unknown PCIe layout mode", async () => {
    const payload: any = validPayload();
    payload.profile.pcie_layout_mode = "tsgm-special-case";

    await expect(pipe.transform(payload, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects a non-positive PSU count", async () => {
    const payload = validPayload();
    payload.profile.psu_count = 0;

    await expect(pipe.transform(payload, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
