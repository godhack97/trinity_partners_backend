import {
  getComponentProfileErrors,
  resolveComponentProfileMetadata,
} from "./component-profile-kind";

describe("component profile kind mapping", () => {
  it.each([
    ["cpu-type-id", "cpu", "cpu"],
    ["ram-type-id", "ram", "ram"],
    ["memory-type-id", "drive", "drive"],
    ["gpu-type-id", "gpu", "gpu"],
    ["raid-controller-type-id", "raid", "controller"],
    ["hba-type-id", "hba", "controller"],
    ["ehba-type-id", "ehba", "controller"],
    ["network-card-type-id", "nic", "network"],
    ["ocp-type-id", "ocp", "network"],
    ["transiver-type-id", "transceiver", "transceiver"],
    ["psu-type-id", "psu", "psu"],
    ["warranty-type-id", "service", "service"],
    ["dac-cbl-type-id", "dac_cable", null],
    ["opt-cbl-type", "optical_cable", null],
    ["ethernet-cbl-type-id", "ethernet_cable", null],
    ["pwr-cbl-type-id", "power_cable", null],
    ["os-type-id", "software", null],
    ["av-type-id", "software", null],
    ["onec-type-id", "software", null],
    ["other-controllers-type-id", "extra_option", null],
    ["other-components-type-id", "extra_option", null],
  ])("maps %s to %s/%s", (typeId, typeKey, profileKind) => {
    expect(resolveComponentProfileMetadata({ type_id: typeId })).toEqual(
      expect.objectContaining({
        component_type_key: typeKey,
        profile_kind: profileKind,
      }),
    );
  });

  it("keeps the VROC exception distinct from a regular RAID controller", () => {
    expect(resolveComponentProfileMetadata({
      type_id: "raid-controller-type-id",
      subtype: "Intel VROC",
    })).toEqual({
      component_type_key: "vroc",
      profile_kind: "controller",
      resource_kind: "controller",
      controller_type: "VROC",
    });
  });

  it("reports missing and incomplete profiles using the canonical kind", () => {
    const metadata = resolveComponentProfileMetadata({
      type_id: "memory-type-id",
    });

    expect(getComponentProfileErrors(metadata, {
      catalog: { component_type_key: "gpu" },
      resource: { resource_kind: "drive" },
      price: { base_price: 100 },
      drive: { drive_type: "NVME", form_factor: "2.5" },
    })).toEqual([
      "Catalog profile не соответствует типу компонента",
      "Не заполнено поле drive.capacity_gb",
    ]);
  });
});
