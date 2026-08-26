import { ConfiguratorService } from "./configurator.service";

const createQueryBuilder = (rows: any[]) => {
  const builder: any = {
    leftJoinAndMapMany: jest.fn(() => builder),
    leftJoinAndMapOne: jest.fn(() => builder),
    andWhere: jest.fn(() => builder),
    getMany: jest.fn().mockResolvedValue(rows),
  };
  return builder;
};

describe("ConfiguratorService component public projection", () => {
  it("returns the saved profile fields, metadata, activity and errors", async () => {
    const builder = createQueryBuilder([{
      id: "gpu-1",
      type_id: "gpu-type-id",
      subtype: "",
      name: "GPU 48 GB",
      price: 1000,
      component_type: {
        move_selected_to_top: false,
      },
      component_slots: [{
        slot_id: "pcie-slot",
        amount: 1,
        increase: false,
        slots: [{ name: "PCIe x16" }],
      }],
      catalog_profile: {
        component_type_key: "gpu",
        is_active: true,
      },
      resource_profile: {
        resource_kind: "gpu",
        pcie_lanes: 16,
      },
      price_profile: {
        base_price: 1000,
        currency: "RUB",
      },
      gpu_profile: {
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 1,
        memory_gb: 48,
        power_w: 350,
      },
    }]);
    const service = new ConfiguratorService(
      {} as any,
      { createQueryBuilder: jest.fn(() => builder) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const [component] = await service.getComponents();

    expect(component).toEqual(expect.objectContaining({
      typeId: "gpu-type-id",
      component_type_key: "gpu",
      profile_kind: "gpu",
      resource_kind: "gpu",
      move_selected_to_top: false,
      profile_is_active: true,
      profile_errors: [],
    }));
    expect(component.profile.catalog.component_type_key).toBe("gpu");
    expect(component.profile.price.base_price).toBe(1000);
    expect(component.profile.resource.pcie_lanes).toBe(16);
    expect(component.profile.gpu.memory_gb).toBe(48);
    expect(component.slots).toEqual([
      expect.objectContaining({ slot_id: "pcie-slot", name: "PCIe x16" }),
    ]);
  });
});
