export const COMPONENT_PROFILE_NAMES = [
  "catalog",
  "resource",
  "price",
  "cpu",
  "ram",
  "drive",
  "controller",
  "network",
  "gpu",
  "transceiver",
  "psu",
  "service",
] as const;

export const SPECIALIZED_COMPONENT_PROFILE_NAMES = [
  "cpu",
  "ram",
  "drive",
  "controller",
  "network",
  "gpu",
  "transceiver",
  "psu",
  "service",
] as const;

export type ComponentProfileName = (typeof COMPONENT_PROFILE_NAMES)[number];
export type SpecializedComponentProfileName =
  (typeof SPECIALIZED_COMPONENT_PROFILE_NAMES)[number];

export interface ComponentProfileMetadata {
  component_type_key: string;
  profile_kind: SpecializedComponentProfileName | null;
  resource_kind: string;
  controller_type?: "RAID" | "HBA" | "eHBA" | "VROC";
  network_kind?: "nic" | "ocp";
}

const TYPE_METADATA: Record<string, ComponentProfileMetadata> = {
  "cpu-type-id": {
    component_type_key: "cpu",
    profile_kind: "cpu",
    resource_kind: "cpu",
  },
  "ram-type-id": {
    component_type_key: "ram",
    profile_kind: "ram",
    resource_kind: "ram",
  },
  "memory-type-id": {
    component_type_key: "drive",
    profile_kind: "drive",
    resource_kind: "drive",
  },
  "gpu-type-id": {
    component_type_key: "gpu",
    profile_kind: "gpu",
    resource_kind: "gpu",
  },
  "raid-controller-type-id": {
    component_type_key: "raid",
    profile_kind: "controller",
    resource_kind: "pcie_card",
    controller_type: "RAID",
  },
  "hba-type-id": {
    component_type_key: "hba",
    profile_kind: "controller",
    resource_kind: "pcie_card",
    controller_type: "HBA",
  },
  "ehba-type-id": {
    component_type_key: "ehba",
    profile_kind: "controller",
    resource_kind: "pcie_card",
    controller_type: "eHBA",
  },
  "network-card-type-id": {
    component_type_key: "nic",
    profile_kind: "network",
    resource_kind: "nic",
    network_kind: "nic",
  },
  "nic1-type-id": {
    component_type_key: "nic",
    profile_kind: "network",
    resource_kind: "nic",
    network_kind: "nic",
  },
  "nic2-type-id": {
    component_type_key: "nic",
    profile_kind: "network",
    resource_kind: "nic",
    network_kind: "nic",
  },
  "ocp-type-id": {
    component_type_key: "ocp",
    profile_kind: "network",
    resource_kind: "ocp",
    network_kind: "ocp",
  },
  "transiver-type-id": {
    component_type_key: "transceiver",
    profile_kind: "transceiver",
    resource_kind: "none",
  },
  "psu-type-id": {
    component_type_key: "psu",
    profile_kind: "psu",
    resource_kind: "psu",
  },
  "warranty-type-id": {
    component_type_key: "service",
    profile_kind: "service",
    resource_kind: "service",
  },
  "dac-cbl-type-id": {
    component_type_key: "dac_cable",
    profile_kind: null,
    resource_kind: "none",
  },
  "opt-cbl-type": {
    component_type_key: "optical_cable",
    profile_kind: null,
    resource_kind: "none",
  },
  "ethernet-cbl-type-id": {
    component_type_key: "ethernet_cable",
    profile_kind: null,
    resource_kind: "none",
  },
  "pwr-cbl-type-id": {
    component_type_key: "power_cable",
    profile_kind: null,
    resource_kind: "none",
  },
  "os-type-id": {
    component_type_key: "software",
    profile_kind: null,
    resource_kind: "none",
  },
  "av-type-id": {
    component_type_key: "software",
    profile_kind: null,
    resource_kind: "none",
  },
  "onec-type-id": {
    component_type_key: "software",
    profile_kind: null,
    resource_kind: "none",
  },
  "other-controllers-type-id": {
    component_type_key: "extra_option",
    profile_kind: null,
    resource_kind: "none",
  },
  "other-components-type-id": {
    component_type_key: "extra_option",
    profile_kind: null,
    resource_kind: "none",
  },
};

const containsVroc = (value: unknown) =>
  `${value || ""}`.toUpperCase().includes("VROC");

export const resolveComponentProfileMetadata = (
  component: { type_id?: string; subtype?: string; name?: string },
  profiles?: Record<string, any> | null,
): ComponentProfileMetadata => {
  const typeId = component?.type_id || "";
  const base = TYPE_METADATA[typeId] || {
    component_type_key: typeId,
    profile_kind: null,
    resource_kind: "none",
  };

  if (
    typeId === "raid-controller-type-id" &&
    [
      component.subtype,
      component.name,
      profiles?.catalog?.component_type_key,
      profiles?.controller?.controller_type,
    ].some(containsVroc)
  ) {
    return {
      component_type_key: "vroc",
      profile_kind: "controller",
      resource_kind: "controller",
      controller_type: "VROC",
    };
  }

  return { ...base };
};

const REQUIRED_FIELDS: Partial<
  Record<SpecializedComponentProfileName, string[]>
> = {
  cpu: ["ram_type"],
  ram: ["ram_type", "capacity_gb"],
  drive: ["drive_type", "form_factor", "capacity_gb"],
  controller: ["controller_type"],
  network: ["network_kind"],
  transceiver: ["interface_type"],
  psu: ["power_w"],
  service: ["service_level", "years", "formula"],
};

const isFilled = (value: unknown) =>
  value !== undefined && value !== null && value !== "";

export const getComponentProfileErrors = (
  metadata: ComponentProfileMetadata,
  profiles: Record<string, any>,
) => {
  const errors: string[] = [];

  if (!profiles.catalog) errors.push("Не заполнен catalog profile");
  if (!profiles.resource) errors.push("Не заполнен resource profile");
  if (!profiles.price) errors.push("Не заполнен price profile");
  if (
    profiles.catalog &&
    profiles.catalog.component_type_key !== metadata.component_type_key
  ) {
    errors.push("Catalog profile не соответствует типу компонента");
  }

  if (metadata.profile_kind) {
    const specializedProfile = profiles[metadata.profile_kind];
    if (!specializedProfile) {
      errors.push(`Не заполнен ${metadata.profile_kind} profile`);
    } else {
      for (const field of REQUIRED_FIELDS[metadata.profile_kind] || []) {
        if (!isFilled(specializedProfile[field])) {
          errors.push(`Не заполнено поле ${metadata.profile_kind}.${field}`);
        }
      }
    }
  }

  return errors;
};
