import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { SaveConfigurationComponentRequestDto } from "./create-configurator-component.request.dto";
import { UpdateConfigurationComponentRequestDto } from "./update-configurator-component.request.dto";

describe("configuration component mutation DTO", () => {
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
  const validPayload = () => ({
    name: "GPU 48 GB",
    price: 1000,
    type_id: "gpu-type-id",
    subtype: null,
    slots: [{ slot_id: "pcie-slot", amount: 1, increase: false }],
    server_generation_id: null,
    processor_generation_id: null,
    profiles: {
      catalog: { component_type_key: "gpu", is_active: true },
      resource: { resource_kind: "gpu", pcie_lanes: 16 },
      price: { base_price: 1000 },
      gpu: { memory_gb: 48, power_w: 350 },
      drive: null,
      controller: null,
    },
  });

  it("accepts the atomic base/profile payload and explicit null profiles", async () => {
    const result = await pipe.transform(
      validPayload(),
      metadata(SaveConfigurationComponentRequestDto),
    );

    expect(result).toBeInstanceOf(SaveConfigurationComponentRequestDto);
    expect(result.profiles.gpu?.memory_gb).toBe(48);
    expect(result.profiles.drive).toBeNull();
  });

  it("accepts current drive and controller fields", async () => {
    const payload = validPayload();
    payload.type_id = "memory-type-id";
    payload.profiles.gpu = null;
    payload.profiles.drive = {
      drive_type: "NVME",
      media_kind: "NVME",
      form_factor: "2.5",
      capacity_gb: 1920,
    } as any;
    payload.profiles.controller = {
      controller_type: "VROC",
      m2_slot_count: 2,
    } as any;

    const result = await pipe.transform(
      payload,
      metadata(UpdateConfigurationComponentRequestDto),
    );

    expect(result.profiles.drive?.media_kind).toBe("NVME");
    expect(result.profiles.controller?.m2_slot_count).toBe(2);
  });

  it("accepts zero base price for percentage-based technical support", async () => {
    const payload: any = validPayload();
    payload.name = "Расширенная техническая поддержка";
    payload.price = 0;
    payload.type_id = "warranty-type-id";
    payload.slots = [];
    payload.profiles = {
      catalog: { component_type_key: "service", is_active: true },
      resource: { resource_kind: "service", uses_power: false },
      price: {
        base_price: null,
        coefficient: 1,
        price_mode: "component_price",
        price_required: false,
      },
      service: {
        service_level: "extended-1",
        years: 1,
        formula: "percent_of_equipment",
        percent: 10,
        fixed_price: null,
      },
    };

    const result = await pipe.transform(
      payload,
      metadata(SaveConfigurationComponentRequestDto),
    );

    expect(result.price).toBe(0);
    expect(result.profiles.service?.percent).toBe(10);
  });

  it("rejects a negative component price", async () => {
    const payload = validPayload();
    payload.price = -1;

    await expect(pipe.transform(
      payload,
      metadata(SaveConfigurationComponentRequestDto),
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a component mutation without profiles", async () => {
    const { profiles, ...payload } = validPayload();

    await expect(pipe.transform(
      payload,
      metadata(SaveConfigurationComponentRequestDto),
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects unknown base, slot and profile fields", async () => {
    const payload: any = validPayload();
    payload.legacyField = true;
    payload.slots[0].slotId = "legacy-slot";
    payload.profiles.gpu.memoryGb = 48;

    await expect(pipe.transform(
      payload,
      metadata(UpdateConfigurationComponentRequestDto),
    )).rejects.toBeInstanceOf(BadRequestException);
  });
});
