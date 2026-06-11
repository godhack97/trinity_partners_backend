import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import {
  CnfMultislotRepository,
  CnfProcessorGenerationRepository,
  CnfServerGenerationRepository,
} from "@orm/repositories";
import { CnfComponentTypeRepository } from "src/orm/repositories/cnf/cnf-component-type.repository";
import { CnfComponentRepository } from "src/orm/repositories/cnf/cnf-component.repository";
import { CnfServerSlotRepository } from "src/orm/repositories/cnf/cnf-server-slot.repository";
import { CnfServerRepository } from "src/orm/repositories/cnf/cnf-server.repository";
import { CnfServerboxHeightRepository } from "src/orm/repositories/cnf/cnf-serverbox-height.repository";
import { CnfSlotRepository } from "src/orm/repositories/cnf/cnf-slot.repository";
import {
  CnfComponentCatalogProfileEntity,
  CnfComponentPriceProfileEntity,
  CnfComponentResourceProfileEntity,
  CnfControllerProfileEntity,
  CnfCpuProfileEntity,
  CnfDriveProfileEntity,
  CnfGpuProfileEntity,
  CnfNetworkProfileEntity,
  CnfPlatformBayEntity,
  CnfPlatformForbiddenComponentTypeEntity,
  CnfPlatformProfileEntity,
  CnfPsuProfileEntity,
  CnfRamProfileEntity,
  CnfServiceProfileEntity,
} from "@orm/entities";
import { SearchComponentsDto } from "./dto/request/search-components.request.dto";
import { CreateComponentTypeDto } from "./dto/request/create-component-type.dto";
import { UpdateComponentTypeDto } from "./dto/request/update-component-type.dto";
import { ValidateConfiguratorRequestDto } from "./dto/request/validate-configurator.request.dto";
import { DataSource, In } from "typeorm";

@Injectable()
export class ConfiguratorService {
  constructor(
    private readonly cnfServerRepository: CnfServerRepository,
    private readonly cnfComponentRepository: CnfComponentRepository,
    private readonly cnfComponentTypeRepository: CnfComponentTypeRepository,
    private readonly cnfServerboxHeightRepository: CnfServerboxHeightRepository,
    private readonly cnfSlotRepository: CnfSlotRepository,
    private readonly cnfMultislotRepository: CnfMultislotRepository,
    private readonly cnfServerGenerationRepository: CnfServerGenerationRepository,
    private readonly cnfProcessorGenerationRepository: CnfProcessorGenerationRepository,
    private readonly dataSource: DataSource,
  ) {}

  // Методы для подсчета
  async getServerboxCount(): Promise<number> {
    return await this.cnfServerboxHeightRepository.count();
  }

  async getSlotsCount(): Promise<number> {
    return await this.cnfSlotRepository.count();
  }

  async getServerGenerationsCount(): Promise<number> {
    return await this.cnfServerGenerationRepository.count();
  }

  async getServersCount(): Promise<number> {
    return await this.cnfServerRepository.count();
  }

  async getProcessorGenerationsCount(): Promise<number> {
    return await this.cnfProcessorGenerationRepository.count();
  }

  async getComponentsCount(): Promise<number> {
    return await this.cnfComponentRepository.count();
  }

  async componentstypesCount(): Promise<number> {
    return await this.cnfComponentTypeRepository.count();
  }

  async validateConfiguration(dto: ValidateConfiguratorRequestDto) {
    const server = await this.cnfServerRepository.findOne({
      where: { id: dto.server_id },
    });

    if (!server) {
      throw new NotFoundException("Платформа не найдена");
    }

    const normalizedItems = (dto.items || [])
      .filter((item) => item?.component_id && item.qty > 0)
      .map((item) => ({
        component_id: item.component_id,
        qty: Number(item.qty || 0),
      }));

    const componentIds = [...new Set(normalizedItems.map((item) => item.component_id))];
    const components = componentIds.length
      ? await this.cnfComponentRepository.find({
          where: { id: In(componentIds) },
        })
      : [];

    const componentsById = new Map(components.map((component) => [component.id, component]));
    const componentQtyById = new Map(
      normalizedItems.map((item) => [item.component_id, item.qty]),
    );

    const warnings = [];
    const errors = [];

    const platformProfile = await this.safeFindOne(CnfPlatformProfileEntity, {
      server_id: dto.server_id,
    });

    const catalogProfiles = await this.safeFindByComponentIds(
      CnfComponentCatalogProfileEntity,
      componentIds,
    );
    const resourceProfiles = await this.safeFindByComponentIds(
      CnfComponentResourceProfileEntity,
      componentIds,
    );
    const priceProfiles = await this.safeFindByComponentIds(
      CnfComponentPriceProfileEntity,
      componentIds,
    );
    const gpuProfiles = await this.safeFindByComponentIds(
      CnfGpuProfileEntity,
      componentIds,
    );
    const networkProfiles = await this.safeFindByComponentIds(
      CnfNetworkProfileEntity,
      componentIds,
    );
    const serviceProfiles = await this.safeFindByComponentIds(
      CnfServiceProfileEntity,
      componentIds,
    );
    const cpuProfiles = await this.safeFindByComponentIds(
      CnfCpuProfileEntity,
      componentIds,
    );
    const ramProfiles = await this.safeFindByComponentIds(
      CnfRamProfileEntity,
      componentIds,
    );
    const driveProfiles = await this.safeFindByComponentIds(
      CnfDriveProfileEntity,
      componentIds,
    );
    const controllerProfiles = await this.safeFindByComponentIds(
      CnfControllerProfileEntity,
      componentIds,
    );
    const psuProfiles = await this.safeFindByComponentIds(
      CnfPsuProfileEntity,
      componentIds,
    );
    const platformBays = platformProfile
      ? await this.safeFindMany(CnfPlatformBayEntity, {
          platform_profile_id: platformProfile.id,
        })
      : [];
    const platformForbiddenTypes = platformProfile
      ? await this.safeFindMany(CnfPlatformForbiddenComponentTypeEntity, {
          platform_profile_id: platformProfile.id,
        })
      : [];
    const forbiddenTypesByKey = new Map(
      platformForbiddenTypes.map((rule) => [rule.component_type_key, rule]),
    );

    if (!platformProfile) {
      warnings.push({
        code: "RESOURCE_PROFILE_MISSING",
        message: "Для платформы не заполнен новый профиль ограничений, использованы базовые значения",
        details: { server_id: dto.server_id },
      });
    }

    if (platformProfile && platformProfile.is_active === false) {
      errors.push({
        code: "PLATFORM_DISABLED",
        message: "Платформа отключена",
        details: { server_id: dto.server_id },
      });
    }

    const resources = {
      pcie_total: {
        used: 0,
        limit: platformProfile?.pcie_lanes_total ?? this.inferPcieTotalLimit(server),
      },
      rear_pcie_ocp: {
        used: 0,
        limit: platformProfile?.rear_pcie_ocp_limit ?? 96,
      },
      pcie_slots: {
        used: 0,
        limit: platformProfile?.pcie_slots ?? 6,
      },
      ocp_slots: {
        used: 0,
        limit: platformProfile?.ocp_slots ?? 1,
      },
      front_bays: { used: 0, limit: null },
      rear_bays: { used: 0, limit: null },
      internal_m2: {
        used: 0,
        limit: platformProfile?.internal_m2_bays ?? 0,
      },
      power_w: {
        used: platformProfile?.base_power_w ?? 360,
        limit: null,
      },
    };

    let hasCpu = false;
    let hasRam = false;
    let hasDrive = false;
    let hasService = false;
    let hasPremiumServiceWithoutManualPrice = false;
    let equipmentSubtotal = Number(server.price || 0);
    let serviceTotal = 0;
    const selectedCpus = [];
    const selectedRam = [];
    const selectedDrives = [];
    const selectedControllers = [];
    const selectedPsu = [];
    const selectedServices = [];
    const virtualSupport = this.buildVirtualSupportService(dto.support);

    if (virtualSupport) {
      hasService = true;
      selectedServices.push(virtualSupport);

      if (
        virtualSupport.serviceProfile.service_level === "premium" &&
        virtualSupport.serviceProfile.formula === "manual" &&
        virtualSupport.serviceProfile.fixed_price == null
      ) {
        hasPremiumServiceWithoutManualPrice = true;
        warnings.push({
          code: "PREMIUM_SERVICE_MANAGER_REQUIRED",
          message: "Premium-сервис рассчитывается вручную ответственным менеджером",
          details: { support_id: dto.support?.id },
        });
      }
    }

    for (const item of normalizedItems) {
      const component = componentsById.get(item.component_id);

      if (!component) {
        errors.push({
          code: "COMPONENT_DISABLED",
          message: "Выбранный компонент не найден",
          details: { component_id: item.component_id },
        });
        continue;
      }

      const qty = componentQtyById.get(component.id) || 0;
      const catalogProfile = catalogProfiles.get(component.id);
      const resourceProfile = resourceProfiles.get(component.id);
      const priceProfile = priceProfiles.get(component.id);
      const serviceProfile = serviceProfiles.get(component.id);
      const cpuProfile = cpuProfiles.get(component.id);
      const ramProfile = ramProfiles.get(component.id);
      const driveProfile = driveProfiles.get(component.id);
      const controllerProfile = controllerProfiles.get(component.id);
      const gpuProfile = gpuProfiles.get(component.id);
      const networkProfile = networkProfiles.get(component.id);
      const psuProfile = psuProfiles.get(component.id);
      const typeKey = catalogProfile?.component_type_key || this.mapLegacyTypeKey(component.type_id);
      const effectiveResourceProfile = this.normalizeEffectiveResourceProfile({
        typeKey,
        platformProfile,
        resourceProfile:
          resourceProfile ||
          this.buildFallbackResourceProfile({
            typeKey,
            controllerProfile,
            gpuProfile,
            networkProfile,
            platformProfile,
          }),
      });

      const forbiddenRule = forbiddenTypesByKey.get(typeKey);

      if (forbiddenRule) {
        errors.push({
          code: "COMPONENT_FORBIDDEN_ON_PLATFORM",
          message: "Компонент запрещен для выбранной платформы",
          details: {
            component_id: component.id,
            name: component.name,
            component_type_key: typeKey,
            reason: forbiddenRule.reason || null,
          },
        });
      }

      if (catalogProfile?.is_active === false || catalogProfile?.disabled_reason) {
        errors.push({
          code: "COMPONENT_DISABLED",
          message: "Компонент отключен",
          details: {
            component_id: component.id,
            disabled_reason: catalogProfile?.disabled_reason,
          },
        });
      }

      if (catalogProfile?.s4b_status === "price_check_required") {
        warnings.push({
          code: "S4B_PRICE_CHECK_REQUIRED",
          message: "Цена компонента требует проверки",
          details: { component_id: component.id },
        });
      }

      if (!effectiveResourceProfile) {
        warnings.push({
          code: "RESOURCE_PROFILE_MISSING",
          message: "Для компонента не заполнен ресурсный профиль",
          details: { component_id: component.id, name: component.name },
        });
      } else {
        resources.pcie_total.used += Number(effectiveResourceProfile.pcie_lanes || 0) * qty;
        resources.rear_pcie_ocp.used +=
          Number(effectiveResourceProfile.rear_pcie_lanes || 0) * qty;
        resources.pcie_slots.used += Number(effectiveResourceProfile.physical_slots || 0) * qty;
        resources.ocp_slots.used += Number(effectiveResourceProfile.ocp_slots || 0) * qty;

        if (effectiveResourceProfile.power_w == null && effectiveResourceProfile.uses_power) {
          warnings.push({
            code: "POWER_PROFILE_MISSING",
            message: "Для ресурсоемкого компонента не задано потребление",
            details: { component_id: component.id, name: component.name },
          });
        } else if (effectiveResourceProfile.uses_power) {
          resources.power_w.used += Number(effectiveResourceProfile.power_w || 0) * qty;
        }
      }

      if (typeKey === "gpu" || gpuProfile) {
        warnings.push({
          code: "GPU_WARRANTY_MANAGER_REQUIRED",
          message:
            "Гарантия на GPU не распространяется, для расчета необходимо обратиться к ответственному менеджеру",
          details: { component_id: component.id, name: component.name },
        });
      }

      if (typeKey === "cpu") {
        hasCpu = true;
        selectedCpus.push({
          component,
          qty,
          catalogProfile,
          cpuProfile,
        });
      }

      if (typeKey === "ram") {
        hasRam = true;
        selectedRam.push({
          component,
          qty,
          catalogProfile,
          ramProfile,
        });
      }

      if (this.isDriveType(typeKey) || driveProfile) {
        hasDrive = true;
        selectedDrives.push({
          component,
          qty,
          typeKey,
          driveProfile,
          resourceProfile: effectiveResourceProfile,
        });
      }

      if (this.isControllerType(typeKey) || controllerProfile) {
        selectedControllers.push({
          component,
          qty,
          typeKey,
          controllerProfile,
          resourceProfile: effectiveResourceProfile,
        });
      }

      if (typeKey === "psu" || psuProfile) {
        selectedPsu.push({
          component,
          qty,
          psuProfile,
        });
      }

      if (typeKey === "service") hasService = true;

      const componentPrice = priceProfile?.base_price ?? component.price;
      const priceRequired = priceProfile?.price_required ?? true;

      if (priceRequired && (componentPrice === null || componentPrice === undefined)) {
        errors.push({
          code: "PRICE_MISSING",
          message: "У компонента не заполнена обязательная цена",
          details: { component_id: component.id, name: component.name },
        });
      }

      if (serviceProfile) {
        hasService = true;
        selectedServices.push({
          component,
          qty,
          serviceProfile,
          priceProfile,
          componentPrice,
        });

        if (serviceProfile.service_level === "premium" && serviceProfile.formula === "manual") {
          hasPremiumServiceWithoutManualPrice = serviceProfile.fixed_price == null;
          warnings.push({
            code: "PREMIUM_SERVICE_MANAGER_REQUIRED",
            message: "Premium-сервис рассчитывается вручную ответственным менеджером",
            details: { component_id: component.id },
          });
        }

      } else if (typeKey !== "service") {
        const coefficient = Number(priceProfile?.coefficient ?? this.defaultCoefficient(typeKey));
        equipmentSubtotal += Number(componentPrice || 0) * coefficient * qty;
      }
    }

    this.validateCpu({
      selectedCpus,
      platformProfile,
      server,
      errors,
      warnings,
    });

    this.validateRam({
      selectedCpus,
      selectedRam,
      platformProfile,
      errors,
      warnings,
    });

    this.validateDrivesAndControllers({
      selectedDrives,
      selectedControllers,
      platformProfile,
      platformBays,
      resources,
      errors,
      warnings,
    });

    this.validatePsu({
      selectedPsu,
      resources,
      errors,
      warnings,
    });

    serviceTotal = this.calculateServiceTotal({
      selectedServices,
      equipmentSubtotal,
      warnings,
    });

    if (resources.pcie_total.used > resources.pcie_total.limit) {
      errors.push({
        code: "PCIE_TOTAL_EXCEEDED",
        message: "Превышен общий Лимит PCIe-линий",
        details: resources.pcie_total,
      });
    }

    if (resources.rear_pcie_ocp.used > resources.rear_pcie_ocp.limit) {
      errors.push({
        code: "REAR_PCIE_EXCEEDED",
        message: "Превышен Лимит rear PCIe/OCP",
        details: resources.rear_pcie_ocp,
      });
    }

    if (resources.pcie_slots.used > resources.pcie_slots.limit) {
      errors.push({
        code: "PCIE_SLOTS_EXCEEDED",
        message: "Превышено количество физических PCIe-слотов",
        details: resources.pcie_slots,
      });
    }

    if (resources.ocp_slots.used > resources.ocp_slots.limit) {
      errors.push({
        code: "OCP_SLOTS_EXCEEDED",
        message: "Превышено количество OCP-слотов",
        details: resources.ocp_slots,
      });
    }

    const missingRequired = [];
    if (!hasCpu) missingRequired.push("cpu");
    if (!hasRam) missingRequired.push("ram");
    if (!hasDrive) missingRequired.push("drive");
    if (!hasService) missingRequired.push("service");

    if (missingRequired.length) {
      errors.push({
        code: "REQUIRED_COMPONENT_MISSING",
        message: "Для расчета стоимости выберите платформу, процессор, память, диск и сервис",
        details: { missing: missingRequired },
      });
    }

    const priceIsVisible =
      missingRequired.length === 0 && !hasPremiumServiceWithoutManualPrice;

    const price = {
      is_visible: priceIsVisible,
      visibility_reason: priceIsVisible
        ? null
        : hasPremiumServiceWithoutManualPrice
          ? "Premium-сервис требует ручного расчета ответственным менеджером"
          : "Для расчета стоимости выберите платформу, процессор, память, диск и сервис",
      equipment_subtotal: priceIsVisible ? equipmentSubtotal : null,
      service_total: priceIsVisible ? serviceTotal : null,
      total: priceIsVisible ? equipmentSubtotal + serviceTotal : null,
      currency: "USD",
    };

    return {
      is_valid: errors.length === 0,
      normalized_configuration: {
        server_id: dto.server_id,
        items: normalizedItems,
      },
      resources,
      price,
      errors,
      warnings,
      auto_added_items: [],
    };
  }

  private async safeFindOne(entity: any, where: Record<string, any>) {
    try {
      return await this.dataSource.getRepository(entity).findOne({ where });
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async safeFindByComponentIds(entity: any, componentIds: string[]) {
    const result = new Map<string, any>();

    if (!componentIds.length) {
      return result;
    }

    try {
      const rows = await this.dataSource.getRepository(entity).find({
        where: { component_id: In(componentIds) },
      });

      for (const row of rows) {
        result.set(row.component_id, row);
      }

      return result;
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return result;
      }
      throw error;
    }
  }

  private async safeFindMany(entity: any, where: Record<string, any>) {
    try {
      return await this.dataSource.getRepository(entity).find({ where });
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return [];
      }
      throw error;
    }
  }

  private isMissingTableError(error: any) {
    return error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146;
  }

  private buildFallbackResourceProfile({
    typeKey,
    controllerProfile,
    gpuProfile,
    networkProfile,
    platformProfile,
  }: {
    typeKey: string;
    controllerProfile?: any;
    gpuProfile?: any;
    networkProfile?: any;
    platformProfile?: any;
  }) {
    if (controllerProfile) {
      const controllerType = `${controllerProfile.controller_type || typeKey || ""}`.toUpperCase();

      if (controllerType === "VROC") {
        return {
          pcie_lanes: 0,
          rear_pcie_lanes: 0,
          physical_slots: 0,
          ocp_slots: 0,
          power_w: 0,
          uses_power: false,
        };
      }

      return {
        pcie_lanes: Number(controllerProfile.pcie_lanes || 0),
        rear_pcie_lanes: Number(controllerProfile.rear_pcie_lanes || 0),
        physical_slots: Number(controllerProfile.physical_slots || 0),
        ocp_slots: 0,
        power_w: controllerProfile.power_w,
        uses_power: true,
      };
    }

    if (gpuProfile) {
      return {
        pcie_lanes: Number(gpuProfile.pcie_lanes || 0),
        rear_pcie_lanes: Number(gpuProfile.rear_pcie_lanes || 0),
        physical_slots: Number(gpuProfile.physical_slots || 0),
        ocp_slots: 0,
        power_w: gpuProfile.power_w,
        uses_power: true,
      };
    }

    if (networkProfile) {
      const isOcp =
        typeKey === "ocp" ||
        `${networkProfile.network_kind || ""}`.toLowerCase() === "ocp";
      const isOcpOnly = platformProfile?.mode === "ocp_only";

      return {
        pcie_lanes: Number(networkProfile.pcie_lanes || 0),
        rear_pcie_lanes: isOcp && isOcpOnly
          ? 0
          : Number(networkProfile.rear_pcie_lanes || 0),
        physical_slots: isOcp ? 0 : Number(networkProfile.physical_slots || 0),
        ocp_slots: isOcp
          ? Number(networkProfile.ocp_slots || 1)
          : Number(networkProfile.ocp_slots || 0),
        power_w: networkProfile.power_w,
        uses_power: true,
      };
    }

    return null;
  }

  private normalizeEffectiveResourceProfile({
    typeKey,
    platformProfile,
    resourceProfile,
  }: {
    typeKey: string;
    platformProfile?: any;
    resourceProfile?: any;
  }) {
    if (!resourceProfile) {
      return null;
    }

    if (typeKey === "ocp" && platformProfile?.mode === "ocp_only") {
      return {
        ...resourceProfile,
        rear_pcie_lanes: 0,
        physical_slots: 0,
      };
    }

    return resourceProfile;
  }

  private validateCpu({
    selectedCpus,
    platformProfile,
    server,
    errors,
    warnings,
  }: {
    selectedCpus: any[];
    platformProfile: any;
    server: any;
    errors: any[];
    warnings: any[];
  }) {
    const cpuLimit = platformProfile?.cpu_limit ?? 2;
    const platformRamType = platformProfile?.ram_type || this.inferRamType(server);
    const cpuQtyTotal = selectedCpus.reduce((sum, item) => sum + item.qty, 0);

    if (cpuQtyTotal > cpuLimit) {
      errors.push({
        code: "CPU_QTY_EXCEEDED",
        message: "Количество CPU превышает лимит платформы",
        details: { selected: cpuQtyTotal, limit: cpuLimit },
      });
    }

    for (const selectedCpu of selectedCpus) {
      const { component, qty, catalogProfile, cpuProfile } = selectedCpu;

      if (!cpuProfile) {
        warnings.push({
          code: "CPU_PROFILE_UNKNOWN",
          message: "Для CPU не заполнен профиль",
          details: { component_id: component.id, name: component.name },
        });
        continue;
      }

      if (`${cpuProfile.socket_profile || ""}`.toUpperCase() === "1S" && qty > 1) {
        errors.push({
          code: "CPU_1S_QTY_EXCEEDED",
          message: "CPU с профилем 1S нельзя выбирать в количестве больше 1",
          details: { component_id: component.id, qty },
        });
      }

      if (cpuProfile.ram_type && platformRamType && cpuProfile.ram_type !== platformRamType) {
        errors.push({
          code: "CPU_GENERATION_MISMATCH",
          message: "CPU не соответствует поколению/типу памяти платформы",
          details: {
            component_id: component.id,
            cpu_ram_type: cpuProfile.ram_type,
            platform_ram_type: platformRamType,
          },
        });
      }

      if (
        catalogProfile?.server_generation_id &&
        server?.server_generation_id &&
        catalogProfile.server_generation_id !== server.server_generation_id
      ) {
        errors.push({
          code: "CPU_GENERATION_MISMATCH",
          message: "CPU не соответствует поколению платформы",
          details: {
            component_id: component.id,
            cpu_server_generation_id: catalogProfile.server_generation_id,
            platform_server_generation_id: server.server_generation_id,
          },
        });
      }
    }
  }

  private validateRam({
    selectedCpus,
    selectedRam,
    platformProfile,
    errors,
    warnings,
  }: {
    selectedCpus: any[];
    selectedRam: any[];
    platformProfile: any;
    errors: any[];
    warnings: any[];
  }) {
    if (!selectedRam.length) {
      return;
    }

    const platformRamType = platformProfile?.ram_type;
    const cpuQtyTotal = selectedCpus.reduce((sum, item) => sum + item.qty, 0) || 1;
    const primaryCpuProfile = selectedCpus.find((item) => item.cpuProfile)?.cpuProfile;

    let ramModulesTotal = 0;
    let ramCapacityTotalGb = 0;
    let maxSelectedRamSpeed = 0;

    for (const selectedModule of selectedRam) {
      const { component, qty, ramProfile } = selectedModule;
      ramModulesTotal += qty;

      if (!ramProfile) {
        warnings.push({
          code: "RESOURCE_PROFILE_MISSING",
          message: "Для RAM не заполнен профиль",
          details: { component_id: component.id, name: component.name },
        });
        continue;
      }

      ramCapacityTotalGb += Number(ramProfile.capacity_gb || 0) * qty;
      maxSelectedRamSpeed = Math.max(maxSelectedRamSpeed, Number(ramProfile.frequency_mhz || 0));

      if (platformRamType && ramProfile.ram_type !== platformRamType) {
        errors.push({
          code: "RAM_TYPE_MISMATCH",
          message: "Тип RAM не соответствует платформе",
          details: {
            component_id: component.id,
            ram_type: ramProfile.ram_type,
            platform_ram_type: platformRamType,
          },
        });
      }

      if (primaryCpuProfile?.ram_type && ramProfile.ram_type !== primaryCpuProfile.ram_type) {
        errors.push({
          code: "RAM_TYPE_MISMATCH",
          message: "Тип RAM не соответствует выбранному CPU",
          details: {
            component_id: component.id,
            ram_type: ramProfile.ram_type,
            cpu_ram_type: primaryCpuProfile.ram_type,
          },
        });
      }
    }

    if (!primaryCpuProfile) {
      return;
    }

    const memoryChannels = Number(primaryCpuProfile.memory_channels || 8);
    const maxModulesPerCpu = Math.min(
      memoryChannels * 2,
      16,
      Number(primaryCpuProfile.max_ram_modules_per_cpu || 16),
    );
    const maxModulesTotal = maxModulesPerCpu * cpuQtyTotal;

    if (ramModulesTotal > maxModulesTotal) {
      errors.push({
        code: "RAM_MODULES_LIMIT_EXCEEDED",
        message: "Количество RAM-модулей превышает лимит CPU/платформы",
        details: { selected: ramModulesTotal, limit: maxModulesTotal },
      });
    }

    const maxRamGbTotal =
      primaryCpuProfile.max_ram_gb_per_cpu != null
        ? Number(primaryCpuProfile.max_ram_gb_per_cpu) * cpuQtyTotal
        : null;

    if (maxRamGbTotal !== null && ramCapacityTotalGb > maxRamGbTotal) {
      errors.push({
        code: "RAM_CAPACITY_LIMIT_EXCEEDED",
        message: "Суммарный объем RAM превышает лимит CPU",
        details: { selected_gb: ramCapacityTotalGb, limit_gb: maxRamGbTotal },
      });
    }

    const modulesPerCpu = Math.ceil(ramModulesTotal / cpuQtyTotal);
    const is2Dpc = modulesPerCpu > memoryChannels;

    if (is2Dpc) {
      warnings.push({
        code: "RAM_2DPC",
        message: "Используется режим 2DPC, возможное снижение частоты памяти",
        details: { modules_per_cpu: modulesPerCpu, memory_channels: memoryChannels },
      });
    }

    const effectiveSpeed = is2Dpc
      ? primaryCpuProfile.memory_speed_2dpc
      : primaryCpuProfile.memory_speed_1dpc;

    if (effectiveSpeed && maxSelectedRamSpeed > Number(effectiveSpeed)) {
      warnings.push({
        code: "RAM_DOWNCLOCK",
        message: "Память будет работать на пониженной частоте",
        details: {
          selected_speed: maxSelectedRamSpeed,
          effective_speed: Number(effectiveSpeed),
        },
      });
    }
  }

  private validateDrivesAndControllers({
    selectedDrives,
    selectedControllers,
    platformProfile,
    platformBays,
    resources,
    errors,
    warnings,
  }: {
    selectedDrives: any[];
    selectedControllers: any[];
    platformProfile: any;
    platformBays: any[];
    resources: any;
    errors: any[];
    warnings: any[];
  }) {
    if (!selectedDrives.length && !selectedControllers.length) {
      return;
    }

    const directSataLimit = Number(platformProfile?.direct_sata_limit || 0);
    let sataQty = 0;
    let sasQty = 0;
    let vrocQty = 0;
    let hasSasHardwareController = false;

    const controllerPorts = {
      sata: 0,
      sas: 0,
    };

    for (const controller of selectedControllers) {
      const { component, qty, typeKey, controllerProfile } = controller;
      const controllerType = `${controllerProfile?.controller_type || typeKey || ""}`.toUpperCase();

      if (controllerType === "VROC") {
        vrocQty += qty;
        continue;
      }

      if (!controllerProfile) {
        warnings.push({
          code: "RESOURCE_PROFILE_MISSING",
          message: "Для контроллера не заполнен профиль",
          details: { component_id: component.id, name: component.name },
        });
        continue;
      }

      const ports = Number(controllerProfile.internal_ports || 0) * qty;
      const isSasHardwareController = ["RAID", "HBA"].includes(controllerType);

      if (controllerProfile.supports_sata) {
        controllerPorts.sata += ports;
      }

      if (isSasHardwareController && controllerProfile.supports_sas) {
        hasSasHardwareController = true;
        controllerPorts.sas += ports;
      }
    }

    if (vrocQty > 1) {
      errors.push({
        code: "VROC_QTY_EXCEEDED",
        message: "VROC можно выбрать только в количестве 1",
        details: { selected: vrocQty, limit: 1 },
      });
    }

    const drivePlacements = [];
    const drivesToPlace = [];
    const availableBays = this.cloneBays(platformBays);

    if (!availableBays.length && selectedDrives.length) {
      warnings.push({
        code: "RESOURCE_PROFILE_MISSING",
        message: "Для платформы не заполнены корзины дисков",
        details: { platform_profile_id: platformProfile?.id || null },
      });
    }

    for (const selectedDrive of selectedDrives) {
      const { component, qty, driveProfile, resourceProfile } = selectedDrive;

      if (!driveProfile) {
        warnings.push({
          code: "RESOURCE_PROFILE_MISSING",
          message: "Для диска не заполнен профиль",
          details: { component_id: component.id, name: component.name },
        });
        continue;
      }

      const driveType = `${driveProfile.drive_type || ""}`.toUpperCase();

      if (driveType === "SATA") {
        sataQty += qty;
      }

      if (driveType === "SAS") {
        sasQty += qty;
      }

      if (driveType === "M.2") {
        resources.internal_m2.used += qty;
        continue;
      }

      if (
        driveType === "NVME" &&
        (!resourceProfile || Number(resourceProfile.pcie_lanes || 0) === 0)
      ) {
        resources.pcie_total.used += Number(driveProfile.pcie_lanes || 4) * qty;
      }

      drivesToPlace.push({
        component_id: component.id,
        name: component.name,
        drive_type: driveType,
        form_factor: driveProfile.form_factor,
        qty,
      });
    }

    if (availableBays.length && drivesToPlace.length) {
      const placementResult = this.placeSelectedDrivesIntoBays({
        drives: drivesToPlace,
        availableBays,
        platformProfile,
      });

      drivePlacements.push(...placementResult.placements);

      for (const unplacedDrive of placementResult.unplaced) {
        errors.push({
          code: "DRIVE_BAYS_EXCEEDED",
          message: unplacedDrive.message || "Недостаточно дисковых корзин для выбранных дисков",
          details: unplacedDrive.details || unplacedDrive,
        });
      }
    }

    if (sasQty > 0 && !hasSasHardwareController) {
      errors.push({
        code: "SAS_REQUIRES_RAID",
        message: "SAS-диски требуют аппаратный RAID-контроллер или HBA; VROC не подходит",
        details: { sas_drives: sasQty },
      });
    }

    const sataRequiringController = Math.max(0, sataQty - directSataLimit);
    const sasPortsNeeded = sasQty;

    if (controllerPorts.sata < sataRequiringController) {
      errors.push({
        code: "CONTROLLER_PORTS_NOT_ENOUGH",
        message: "Недостаточно внутренних портов контроллера для SATA-дисков сверх direct-limit",
        details: {
          needed: sataRequiringController,
          available: controllerPorts.sata,
          direct_sata_limit: directSataLimit,
        },
      });
    }

    if (controllerPorts.sas < sasPortsNeeded) {
      errors.push({
        code: "CONTROLLER_PORTS_NOT_ENOUGH",
        message: "Недостаточно внутренних портов контроллера для SAS-дисков",
        details: { needed: sasPortsNeeded, available: controllerPorts.sas },
      });
    }

    const baySummary = this.summarizeBayUsage(platformBays, drivePlacements);
    resources.front_bays = baySummary.front;
    resources.rear_bays = baySummary.rear;

    if (resources.internal_m2.limit !== null && resources.internal_m2.used > resources.internal_m2.limit) {
      errors.push({
        code: "DRIVE_BAYS_EXCEEDED",
        message: "Превышен лимит внутренних M.2",
        details: resources.internal_m2,
      });
    }

    for (const placement of drivePlacements) {
      if (placement.drive_type === "NVME" && placement.counts_to_rear_pcie) {
        resources.rear_pcie_ocp.used += placement.pcie_lanes * placement.qty;
      }
    }
  }

  private validatePsu({
    selectedPsu,
    resources,
    errors,
    warnings,
  }: {
    selectedPsu: any[];
    resources: any;
    errors: any[];
    warnings: any[];
  }) {
    const psuQtyTotal = selectedPsu.reduce((sum, item) => sum + item.qty, 0);

    if (psuQtyTotal === 0) {
      resources.power_w.limit = null;
      return;
    }

    if (psuQtyTotal === 1) {
      warnings.push({
        code: "ONLY_ONE_PSU_SELECTED",
        message: "Для режима N+1 рекомендуется выбрать 2 PSU",
        details: { selected: psuQtyTotal, recommended: 2 },
      });
    }

    let onePsuLimit = null;

    for (const selected of selectedPsu) {
      const { component, psuProfile } = selected;

      if (!psuProfile) {
        warnings.push({
          code: "RESOURCE_PROFILE_MISSING",
          message: "Для PSU не заполнен профиль",
          details: { component_id: component.id, name: component.name },
        });
        continue;
      }

      const power = Number(psuProfile.power_w || 0);
      onePsuLimit = onePsuLimit === null ? power : Math.min(onePsuLimit, power);
    }

    resources.power_w.limit = onePsuLimit;

    if (onePsuLimit !== null && resources.power_w.used > onePsuLimit) {
      errors.push({
        code: "POWER_EXCEEDED",
        message: "Расчетное потребление превышает мощность одного PSU в режиме N+1",
        details: {
          used: resources.power_w.used,
          limit: onePsuLimit,
        },
      });
    }
  }

  private calculateServiceTotal({
    selectedServices,
    equipmentSubtotal,
    warnings,
  }: {
    selectedServices: any[];
    equipmentSubtotal: number;
    warnings: any[];
  }) {
    let serviceTotal = 0;

    for (const selected of selectedServices) {
      const { component, qty, serviceProfile, componentPrice } = selected;
      const formula = serviceProfile?.formula;

      if (formula === "fixed") {
        serviceTotal += Number(serviceProfile.fixed_price ?? componentPrice ?? 0) * qty;
        continue;
      }

      if (formula === "percent_of_equipment") {
        serviceTotal += equipmentSubtotal * (Number(serviceProfile.percent || 0) / 100) * qty;
        warnings.push({
          code: "SERVICE_PRICE_RECALCULATED",
          message: "Стоимость сервиса пересчитана от стоимости оборудования",
          details: {
            component_id: component?.id || null,
            percent: Number(serviceProfile.percent || 0),
            equipment_subtotal: equipmentSubtotal,
          },
        });
        continue;
      }

      if (formula === "manual") {
        if (serviceProfile.fixed_price != null) {
          serviceTotal += Number(serviceProfile.fixed_price || 0) * qty;
        }
        continue;
      }

      serviceTotal += Number(componentPrice || 0) * qty;
    }

    return serviceTotal;
  }

  private buildVirtualSupportService(support: any) {
    if (!support?.id) {
      return null;
    }

    const profile = this.mapSupportToServiceProfile(support);

    return {
      component: {
        id: `virtual-support-${support.id}`,
        name: support.name || support.id,
      },
      qty: 1,
      serviceProfile: profile,
      priceProfile: null,
      componentPrice: support.price ?? profile.fixed_price ?? 0,
    };
  }

  private mapSupportToServiceProfile(support: any) {
    const id = `${support.id}`;

    if (id === "standard") {
      return {
        service_level: "standard",
        years: support.years ?? 3,
        formula: "fixed",
        percent: null,
        fixed_price: Number(support.price || 0) > 0 ? Number(support.price) : 1,
      };
    }

    if (id === "extended-1") {
      return {
        service_level: "extended",
        years: 1,
        formula: "percent_of_equipment",
        percent: 10,
        fixed_price: null,
      };
    }

    if (id === "extended-3") {
      return {
        service_level: "extended",
        years: 3,
        formula: "percent_of_equipment",
        percent: 17,
        fixed_price: null,
      };
    }

    if (id === "extended-5") {
      return {
        service_level: "extended",
        years: 5,
        formula: "percent_of_equipment",
        percent: 25,
        fixed_price: null,
      };
    }

    if (id === "premium") {
      return {
        service_level: "premium",
        years: support.years ?? 1,
        formula: "manual",
        percent: null,
        fixed_price: support.price ?? null,
      };
    }

    return {
      service_level: "manual",
      years: support.years ?? 1,
      formula: support.price != null ? "fixed" : "manual",
      percent: null,
      fixed_price: support.price ?? null,
    };
  }

  private cloneBays(platformBays: any[]) {
    return (platformBays || []).map((bay) => ({
      ...bay,
      remaining: Number(bay.capacity || 0),
      allowed_drive_types: Array.isArray(bay.allowed_drive_types)
        ? bay.allowed_drive_types
        : [],
    }));
  }

  private placeSelectedDrivesIntoBays({
    drives,
    availableBays,
    platformProfile,
  }: {
    drives: Array<{
      component_id: string;
      name: string;
      drive_type: string;
      form_factor: string;
      qty: number;
    }>;
    availableBays: any[];
    platformProfile: any;
  }) {
    if (this.isHsrPlatform(platformProfile)) {
      return this.placeHsrDrivesIntoBackplanes(drives, availableBays);
    }

    const placements = [];
    const unplaced = [];

    for (const drive of drives) {
      const placementResult = this.placeDriveIntoBays(drive, availableBays);
      placements.push(...placementResult.placements);

      if (placementResult.unplaced > 0) {
        unplaced.push({
          component_id: drive.component_id,
          name: drive.name,
          unplaced: placementResult.unplaced,
          drive_type: drive.drive_type,
          form_factor: drive.form_factor,
        });
      }
    }

    return { placements, unplaced };
  }

  private isHsrPlatform(platformProfile: any) {
    const code = `${platformProfile?.platform_code || ""}`.toUpperCase();
    return code.includes("HSR");
  }

  private placeHsrDrivesIntoBackplanes(drives: any[], availableBays: any[]) {
    const unplaced = [];
    const rearBay = availableBays.find(
      (bay) => bay.placement === "rear" && Number(bay.capacity || 0) > 0,
    );
    const rearCapacity = Number(rearBay?.capacity || 4);
    const totals = {
      nvme: 0,
      sataSas: 0,
    };

    for (const drive of drives) {
      if (drive.drive_type === "NVME") {
        totals.nvme += drive.qty;
        continue;
      }

      if (["SATA", "SAS"].includes(drive.drive_type)) {
        totals.sataSas += drive.qty;
        continue;
      }

      unplaced.push({
        component_id: drive.component_id,
        name: drive.name,
        drive_type: drive.drive_type,
        form_factor: drive.form_factor,
        unplaced: drive.qty,
      });
    }

    let bestPlan = null;

    for (let nvmeBlocks = 0; nvmeBlocks <= 3; nvmeBlocks++) {
      const zones = this.createHsrBackplaneZones(nvmeBlocks, rearBay);
      const frontNvmeLimit = zones
        .filter((zone) => zone.placement === "front" && zone.mode === "NVME")
        .reduce((sum, zone) => sum + zone.capacity, 0);
      const frontSataSasLimit = zones
        .filter((zone) => zone.placement === "front" && zone.mode === "SATA_SAS")
        .reduce((sum, zone) => sum + zone.capacity, 0);
      const rearZone = zones.find((zone) => zone.placement === "rear");
      const frontNvme = Math.min(totals.nvme, frontNvmeLimit);
      const frontSataSas = Math.min(totals.sataSas, frontSataSasLimit);
      const rearNvmeNeeded = totals.nvme - frontNvme;
      const rearSataSasNeeded = totals.sataSas - frontSataSas;
      const rearNeeded = rearNvmeNeeded + rearSataSasNeeded;
      const unplacedCount = Math.max(0, rearNeeded - rearCapacity);
      const rearNvme = Math.min(rearNvmeNeeded, rearCapacity);
      const rearSataSas = Math.min(rearSataSasNeeded, rearCapacity - rearNvme);
      this.fillHsrZones(zones, {
        frontNvme,
        frontSataSas,
        rearNvme,
        rearSataSas,
      });

      const plan = {
        zones,
        rearZone,
        nvmeBlocks,
        sataSasBlocks: 3 - nvmeBlocks,
        frontNvme,
        frontSataSas,
        rearNvme,
        rearSataSas,
        unplacedCount,
        rearNeeded,
      };

      if (
        !bestPlan ||
        plan.unplacedCount < bestPlan.unplacedCount ||
        (plan.unplacedCount === bestPlan.unplacedCount &&
          plan.rearNeeded < bestPlan.rearNeeded)
      ) {
        bestPlan = plan;
      }
    }

    if (!bestPlan) {
      return { placements: [], unplaced };
    }

    const placements = this.hsrZonesToPlacements(bestPlan.zones);

    if (bestPlan.unplacedCount > 0) {
      unplaced.push({
        message: "Недостаточно HSR-бэкплейнов нужного типа для выбранных дисков",
        details: {
          platform_rule: "HSR_FRONT_3X8_BACKPLANES",
          front_nvme_backplanes: bestPlan.nvmeBlocks,
          front_sata_sas_backplanes: bestPlan.sataSasBlocks,
          rear_bays_limit: rearCapacity,
          selected_nvme: totals.nvme,
          selected_sata_sas: totals.sataSas,
          zones: this.summarizeHsrZones(bestPlan.zones),
          unplaced: bestPlan.unplacedCount,
        },
      });
    }

    return { placements, unplaced };
  }

  private createHsrBackplaneZones(nvmeFrontBlocks: number, rearBay: any) {
    const zones = [];

    for (let index = 1; index <= 3; index++) {
      zones.push({
        id: `front_bp${index}`,
        name: `Front BP${index}`,
        placement: "front",
        capacity: 8,
        mode: index <= nvmeFrontBlocks ? "NVME" : "SATA_SAS",
        used: 0,
        counts_to_rear_pcie: false,
        pcie_lanes_per_nvme: 4,
      });
    }

    zones.push({
      id: "rear_bp",
      name: "Rear BP",
      placement: "rear",
      capacity: Number(rearBay?.capacity || 4),
      mode: "MIXED",
      used: 0,
      counts_to_rear_pcie: Boolean(rearBay?.counts_to_rear_pcie),
      pcie_lanes_per_nvme: Number(rearBay?.pcie_lanes_per_nvme || 4),
    });

    return zones;
  }

  private fillHsrZones(
    zones: any[],
    counts: {
      frontNvme: number;
      frontSataSas: number;
      rearNvme: number;
      rearSataSas: number;
    },
  ) {
    let frontNvmeLeft = counts.frontNvme;
    let frontSataSasLeft = counts.frontSataSas;

    for (const zone of zones.filter((item) => item.placement === "front")) {
      if (zone.mode === "NVME") {
        const used = Math.min(frontNvmeLeft, zone.capacity);
        zone.used = used;
        frontNvmeLeft -= used;
      }

      if (zone.mode === "SATA_SAS") {
        const used = Math.min(frontSataSasLeft, zone.capacity);
        zone.used = used;
        frontSataSasLeft -= used;
      }
    }

    const rearZone = zones.find((zone) => zone.placement === "rear");
    if (rearZone) {
      rearZone.used = counts.rearNvme + counts.rearSataSas;
      rearZone.nvme_used = counts.rearNvme;
      rearZone.sata_sas_used = counts.rearSataSas;
    }
  }

  private hsrZonesToPlacements(zones: any[]) {
    const placements = [];

    for (const zone of zones) {
      if (!zone.used) {
        continue;
      }

      if (zone.placement === "rear" && zone.mode === "MIXED") {
        if (zone.nvme_used > 0) {
          placements.push({
            placement: "rear",
            drive_type: "NVME",
            form_factor: "2.5",
            qty: zone.nvme_used,
            counts_to_rear_pcie: Boolean(zone.counts_to_rear_pcie),
            pcie_lanes: Number(zone.pcie_lanes_per_nvme || 4),
          });
        }

        if (zone.sata_sas_used > 0) {
          placements.push({
            placement: "rear",
            drive_type: "SATA_SAS",
            form_factor: "2.5",
            qty: zone.sata_sas_used,
            counts_to_rear_pcie: false,
            pcie_lanes: 0,
          });
        }

        continue;
      }

      placements.push({
        placement: zone.placement,
        drive_type: zone.mode,
        form_factor: "2.5",
        qty: zone.used,
        counts_to_rear_pcie: Boolean(zone.counts_to_rear_pcie),
        pcie_lanes: Number(zone.pcie_lanes_per_nvme || 4),
      });
    }

    return placements;
  }

  private summarizeHsrZones(zones: any[]) {
    return zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      placement: zone.placement,
      mode: zone.mode,
      used: zone.used,
      capacity: zone.capacity,
      nvme_used: zone.nvme_used || 0,
      sata_sas_used: zone.sata_sas_used || 0,
    }));
  }

  private placeDriveIntoBays(
    drive: { drive_type: string; form_factor: string; qty: number },
    availableBays: any[],
  ) {
    let unplaced = drive.qty;
    const placements = [];
    const orderedPlacements = ["front", "rear", "internal"];

    for (const placement of orderedPlacements) {
      for (const bay of availableBays) {
        if (unplaced <= 0) {
          break;
        }

        if (bay.placement !== placement || bay.remaining <= 0) {
          continue;
        }

        if (!this.bayAcceptsDrive(bay, drive)) {
          continue;
        }

        const qty = Math.min(unplaced, bay.remaining);
        bay.remaining -= qty;
        unplaced -= qty;

        placements.push({
          placement: bay.placement,
          drive_type: drive.drive_type,
          form_factor: drive.form_factor,
          qty,
          counts_to_rear_pcie: Boolean(bay.counts_to_rear_pcie),
          pcie_lanes: Number(bay.pcie_lanes_per_nvme || 4),
        });
      }
    }

    return { placements, unplaced };
  }

  private bayAcceptsDrive(
    bay: any,
    drive: { drive_type: string; form_factor: string },
  ) {
    const allowedTypes = (bay.allowed_drive_types || []).map((type) =>
      `${type}`.toUpperCase(),
    );

    if (!allowedTypes.includes(drive.drive_type)) {
      return false;
    }

    const bayFormFactors = `${bay.form_factor}`
      .toUpperCase()
      .split("/")
      .map((value) => value.trim());

    return bayFormFactors.includes(`${drive.form_factor}`.toUpperCase());
  }

  private summarizeBayUsage(platformBays: any[], drivePlacements: any[]) {
    const summary = {
      front: {
        used: 0,
        limit: this.sumBayLimit(platformBays, "front"),
      },
      rear: {
        used: 0,
        limit: this.sumBayLimit(platformBays, "rear"),
      },
    };

    for (const placement of drivePlacements) {
      if (placement.placement === "front") {
        summary.front.used += placement.qty;
      }

      if (placement.placement === "rear") {
        summary.rear.used += placement.qty;
      }
    }

    return summary;
  }

  private sumBayLimit(platformBays: any[], placement: string) {
    if (!platformBays?.length) {
      return null;
    }

    return platformBays
      .filter((bay) => bay.placement === placement)
      .reduce((sum, bay) => sum + Number(bay.capacity || 0), 0);
  }

  private inferPcieTotalLimit(server: any) {
    const name = `${server?.name || ""}`.toUpperCase();
    return name.includes("M7") || name.includes("GEN3") ? 128 : 160;
  }

  private inferRamType(server: any) {
    const name = `${server?.name || ""}`.toUpperCase();
    return name.includes("M7") || name.includes("GEN3") ? "DDR4" : "DDR5";
  }

  private mapLegacyTypeKey(typeId: string) {
    const map = {
      "cpu-type-id": "cpu",
      "ram-type-id": "ram",
      "memory-type-id": "drive",
      "gpu-type-id": "gpu",
      "raid-controller-type-id": "raid",
      "hba-type-id": "hba",
      "ehba-type-id": "ehba",
      "network-card-type-id": "nic",
      "ocp-type-id": "ocp",
      "transiver-type-id": "transceiver",
      "dac-cbl-type-id": "dac_cable",
      "opt-cbl-type": "optical_cable",
      "ethernet-cbl-type-id": "ethernet_cable",
      "pwr-cbl-type-id": "power_cable",
      "warranty-type-id": "service",
      "os-type-id": "software",
      "av-type-id": "software",
      "onec-type-id": "software",
      "other-controllers-type-id": "extra_option",
      "other-components-type-id": "extra_option",
    };

    return map[typeId] || typeId;
  }

  private isDriveType(typeKey: string) {
    return [
      "drive",
      "hdd_sata",
      "hdd_sas",
      "ssd_sata",
      "ssd_sas",
      "ssd_nvme",
      "m2_nvme",
    ].includes(typeKey);
  }

  private isControllerType(typeKey: string) {
    return ["raid", "hba", "ehba", "vroc"].includes(typeKey);
  }

  private defaultCoefficient(typeKey: string) {
    return ["platform", "psu", "service", "software", "raidix_license", "power_cable"].includes(
      typeKey,
    )
      ? 1
      : 3.6;
  }

  // Существующие методы
  async serverHeight() {
    return this.cnfServerboxHeightRepository.find();
  }

  async serverGeneration() {
    return await this.cnfServerGenerationRepository.find();
  }

  async processorGeneration() {
    return await this.cnfProcessorGenerationRepository.find();
  }

  async getSlots() {
    return await this.cnfSlotRepository.find();
  }

  async getSlotsAndMultislots() {
    const slots = await this.cnfSlotRepository.find();
    const multislots = await this.cnfMultislotRepository.find();

    return [
      ...slots,
      ...multislots.map((el) => ({ ...el, isMultiSlot: true })),
    ];
  }

  async getServers(includeInactive = false) {
    const queryBuilder = this.cnfServerRepository
      .createQueryBuilder("srv")
      .leftJoinAndMapOne(
        "srv.platform_profile",
        "cnf_platform_profiles",
        "cpp",
        "cpp.server_id = srv.id",
      )
      .leftJoinAndMapMany(
        "cpp.bays",
        "cnf_platform_bays",
        "cpb",
        "cpb.platform_profile_id = cpp.id",
      )
      .leftJoinAndMapMany(
        "srv.serverbox_height",
        "cnf_serverbox_height",
        "sbh",
        "sbh.id = srv.serverbox_height_id",
      )
      .leftJoinAndMapMany(
        "srv.multislots",
        "cnf_server_multislots",
        "csm",
        "csm.server_id = srv.id",
      )
      .leftJoinAndMapMany(
        "csm.multislot_slots",
        "cnf_multislot_slots",
        "cms",
        "cms.multislot_id = csm.multislot_id",
      )
      .leftJoinAndMapMany(
        "csm.slots",
        "cnf_slots",
        "mcs",
        "cms.slot_id = mcs.id",
      )
      .leftJoinAndMapMany(
        "srv.server_slots",
        "cnf_server_slots",
        "cssr",
        "cssr.server_id = srv.id",
      )
      .leftJoinAndMapMany(
        "cssr.slots",
        "cnf_slots",
        "css",
        "cssr.slot_id = css.id",
      )
      .orderBy("srv.sort", "ASC");

    if (!includeInactive) {
      queryBuilder.andWhere("(cpp.id IS NULL OR cpp.is_active = 1)");
    }

    const data = await queryBuilder.getMany();

    function transformData(data = []) {
      const result = [];

      for (const server of data) {
        if (!server?.multislots) {
          continue;
        }

        const slots = [];
        const multislots = [];

        for (const multislot of server.multislots) {
          const slotIds = [];
          const slotNames = [];

          multislot.slots.forEach((slot) => {
            slotIds.push(slot.id);
            slotNames.push(slot.name);
          });

          multislots.push({
            ...multislot,
            slotIds,
            slotNames: slotNames.join("/"),
            onBackPanel: multislot.on_back_panel,
            on_back_panel: undefined,
            multislot_slots: undefined,
            created_at: undefined,
            updated_at: undefined,
            server_id: undefined,
          });
        }

        for (const el of server.server_slots) {
          slots.push({
            amount: el.amount,
            onBackPanel: el.on_back_panel,
            slotId: el.slots[0].id,
            typeId: el.slots[0]?.type_id,
            name: el.slots[0].name,
          });
        }

        result.push({
          ...server,
          serverboxHeightId: server.serverbox_height_id,
          serverboxHeightName: server.serverbox_height[0].name,
          platformProfile: server.platform_profile
            ? {
                id: server.platform_profile.id,
                platform_code: server.platform_profile.platform_code,
                family: server.platform_profile.family,
                mode: server.platform_profile.mode,
                cpu_limit: server.platform_profile.cpu_limit,
                ram_type: server.platform_profile.ram_type,
                pcie_generation: server.platform_profile.pcie_generation,
                pcie_lanes_per_cpu: server.platform_profile.pcie_lanes_per_cpu,
                pcie_lanes_total: server.platform_profile.pcie_lanes_total,
                rear_pcie_ocp_limit: server.platform_profile.rear_pcie_ocp_limit,
                pcie_slots: server.platform_profile.pcie_slots,
                ocp_slots: server.platform_profile.ocp_slots,
                base_power_w: server.platform_profile.base_power_w,
                direct_sata_limit: server.platform_profile.direct_sata_limit,
                internal_m2_bays: server.platform_profile.internal_m2_bays,
                is_active: server.platform_profile.is_active,
                bays: (server.platform_profile.bays || []).map((bay) => ({
                  id: bay.id,
                  placement: bay.placement,
                  bay_kind: bay.bay_kind,
                  form_factor: bay.form_factor,
                  capacity: bay.capacity,
                  allowed_drive_types: bay.allowed_drive_types,
                  pcie_lanes_per_nvme: bay.pcie_lanes_per_nvme,
                  counts_to_rear_pcie: bay.counts_to_rear_pcie,
                })),
              }
            : null,
          serverbox_height: undefined,
          platform_profile: undefined,
          multislots,
          slots,
        });
      }

      return result;
    }

    return transformData(data);
  }

  async getComponents(entry?: SearchComponentsDto) {
    const queryBuilder = this.cnfComponentRepository
      .createQueryBuilder("cmp")
      .leftJoinAndMapMany(
        "cmp.component_slots",
        "cnf_component_slots",
        "cms",
        "cms.component_id = cmp.id",
      )
      .leftJoinAndMapMany(
        "cms.slots",
        "cnf_slots",
        "cs",
        "cms.slot_id = cs.id",
      )
      .leftJoinAndMapOne(
        "cmp.cpu_profile",
        "cnf_cpu_profiles",
        "ccp",
        "ccp.component_id = cmp.id",
      )
      .leftJoinAndMapOne(
        "cmp.ram_profile",
        "cnf_ram_profiles",
        "crp",
        "crp.component_id = cmp.id",
      )
      .leftJoinAndMapOne(
        "cmp.drive_profile",
        "cnf_drive_profiles",
        "cdp",
        "cdp.component_id = cmp.id",
      )
      .leftJoinAndMapOne(
        "cmp.network_profile",
        "cnf_network_profiles",
        "cnp",
        "cnp.component_id = cmp.id",
      )
      .leftJoinAndMapOne(
        "cmp.controller_profile",
        "cnf_controller_profiles",
        "cctrlp",
        "cctrlp.component_id = cmp.id",
      )
      .leftJoinAndMapOne(
        "cmp.gpu_profile",
        "cnf_gpu_profiles",
        "cgpp",
        "cgpp.component_id = cmp.id",
      )
      .leftJoinAndMapOne(
        "cmp.psu_profile",
        "cnf_psu_profiles",
        "cpsup",
        "cpsup.component_id = cmp.id",
      )
      .leftJoinAndMapOne(
        "cmp.transceiver_profile",
        "cnf_transceiver_profiles",
        "ctrp",
        "ctrp.component_id = cmp.id",
      )
      .leftJoinAndMapOne(
        "cmp.resource_profile",
        "cnf_component_resource_profiles",
        "crsp",
        "crsp.component_id = cmp.id",
      );

    if (entry?.componentType) {
      queryBuilder.andWhere("cmp.type_id = :componentType", {
        componentType: entry.componentType,
      });
    }

    const data = await queryBuilder.getMany();

    function transformData(data = []) {
      const result = [];

      for (const component of data) {
        const mappedComponent = component as any;
        const slots = [];

        for (const el of mappedComponent.component_slots) {
          slots.push({
            slot_id: el.slot_id,
            slotId: el.slot_id,
            amount: el.amount,
            increase: el.increase,
            name: el.slots[0].name,
          });
        }

        result.push({
          ...component,
          typeId: component.type_id,
          profile: {
            cpu: mappedComponent.cpu_profile
              ? {
                  socket_profile: mappedComponent.cpu_profile.socket_profile,
                  ram_type: mappedComponent.cpu_profile.ram_type,
                  tdp_w: mappedComponent.cpu_profile.tdp_w,
                  memory_channels: mappedComponent.cpu_profile.memory_channels,
                  max_ram_modules_per_cpu:
                    mappedComponent.cpu_profile.max_ram_modules_per_cpu,
                  max_ram_gb_per_cpu:
                    mappedComponent.cpu_profile.max_ram_gb_per_cpu,
                  memory_speed_1dpc:
                    mappedComponent.cpu_profile.memory_speed_1dpc,
                  memory_speed_2dpc:
                    mappedComponent.cpu_profile.memory_speed_2dpc,
                }
              : null,
            ram: mappedComponent.ram_profile
              ? {
                  ram_type: mappedComponent.ram_profile.ram_type,
                  capacity_gb: mappedComponent.ram_profile.capacity_gb,
                  frequency_mhz: mappedComponent.ram_profile.frequency_mhz,
                  rank: mappedComponent.ram_profile.rank,
                  form_factor: mappedComponent.ram_profile.form_factor,
                }
              : null,
            drive: mappedComponent.drive_profile
              ? {
                  drive_type: mappedComponent.drive_profile.drive_type,
                  interface_type: mappedComponent.drive_profile.interface_type,
                  media_kind: mappedComponent.drive_profile.media_kind,
                  form_factor: mappedComponent.drive_profile.form_factor,
                  capacity_gb: mappedComponent.drive_profile.capacity_gb,
                  speed_class: mappedComponent.drive_profile.speed_class,
                  workload_class: mappedComponent.drive_profile.workload_class,
                  pcie_lanes: mappedComponent.drive_profile.pcie_lanes,
                  power_w: mappedComponent.drive_profile.power_w,
                }
              : null,
            network: mappedComponent.network_profile
              ? {
                  network_kind: mappedComponent.network_profile.network_kind,
                  port_type: mappedComponent.network_profile.port_type,
                  port_speed: mappedComponent.network_profile.port_speed,
                  ports_count: mappedComponent.network_profile.ports_count,
                  pcie_lanes: mappedComponent.network_profile.pcie_lanes,
                  rear_pcie_lanes: mappedComponent.network_profile.rear_pcie_lanes,
                  physical_slots: mappedComponent.network_profile.physical_slots,
                  ocp_slots: mappedComponent.network_profile.ocp_slots,
                  power_w: mappedComponent.network_profile.power_w,
                }
              : null,
            controller: mappedComponent.controller_profile
              ? {
                  controller_type:
                    mappedComponent.controller_profile.controller_type,
                  pcie_lanes: mappedComponent.controller_profile.pcie_lanes,
                  rear_pcie_lanes:
                    mappedComponent.controller_profile.rear_pcie_lanes,
                  physical_slots:
                    mappedComponent.controller_profile.physical_slots,
                  internal_ports:
                    mappedComponent.controller_profile.internal_ports,
                  supports_sata:
                    mappedComponent.controller_profile.supports_sata,
                  supports_sas: mappedComponent.controller_profile.supports_sas,
                  supports_nvme:
                    mappedComponent.controller_profile.supports_nvme,
                  power_w: mappedComponent.controller_profile.power_w,
                }
              : null,
            gpu: mappedComponent.gpu_profile
              ? {
                  pcie_lanes: mappedComponent.gpu_profile.pcie_lanes,
                  rear_pcie_lanes: mappedComponent.gpu_profile.rear_pcie_lanes,
                  physical_slots: mappedComponent.gpu_profile.physical_slots,
                  memory_gb: mappedComponent.gpu_profile.memory_gb,
                  power_w: mappedComponent.gpu_profile.power_w,
                }
              : null,
            psu: mappedComponent.psu_profile
              ? {
                  power_w: mappedComponent.psu_profile.power_w,
                  efficiency_class:
                    mappedComponent.psu_profile.efficiency_class,
                }
              : null,
            transceiver: mappedComponent.transceiver_profile
              ? {
                  interface_type:
                    mappedComponent.transceiver_profile.interface_type,
                  speed: mappedComponent.transceiver_profile.speed,
                  media_type: mappedComponent.transceiver_profile.media_type,
                  wavelength: mappedComponent.transceiver_profile.wavelength,
                  compatible_port_type:
                    mappedComponent.transceiver_profile.compatible_port_type,
                }
              : null,
            resource: mappedComponent.resource_profile
              ? {
                  resource_kind: mappedComponent.resource_profile.resource_kind,
                  pcie_lanes: mappedComponent.resource_profile.pcie_lanes,
                  rear_pcie_lanes:
                    mappedComponent.resource_profile.rear_pcie_lanes,
                  physical_slots:
                    mappedComponent.resource_profile.physical_slots,
                  ocp_slots: mappedComponent.resource_profile.ocp_slots,
                  internal_ports:
                    mappedComponent.resource_profile.internal_ports,
                  power_w: mappedComponent.resource_profile.power_w,
                  uses_power: mappedComponent.resource_profile.uses_power,
                }
              : null,
          },
          slots,
          cpu_profile: undefined,
          ram_profile: undefined,
          drive_profile: undefined,
          network_profile: undefined,
          controller_profile: undefined,
          gpu_profile: undefined,
          psu_profile: undefined,
          transceiver_profile: undefined,
          resource_profile: undefined,
        });
      }

      return result;
    }

    return transformData(data);
  }

  async getComponentTypes() {
    return await this.cnfComponentTypeRepository.find();
  }

  async getComponentType(id: string) {
    return await this.cnfComponentTypeRepository.findOne({
      where: { id },
    });
  }

  async getComponent(id: string) {
    return await this.cnfComponentRepository.findOne({
      where: { id },
      relations: ["slots"],
    });
  }

  // CRUD операции для ComponentType
  async createComponentType(dto: CreateComponentTypeDto) {
    const existingType = await this.cnfComponentTypeRepository.findOne({
      where: { name: dto.name },
    });

    if (existingType) {
      throw new BadRequestException(`Тип компонента с именем "${dto.name}" уже существует`);
    }

    const componentType = this.cnfComponentTypeRepository.create(dto);
    return await this.cnfComponentTypeRepository.save(componentType);
  }

  async updateComponentType(id: string, dto: UpdateComponentTypeDto) {
    const componentType = await this.cnfComponentTypeRepository.findOne({
      where: { id },
    });

    if (!componentType) {
      throw new NotFoundException(`Тип компонента с id "${id}" не найден`);
    }

    if (dto.name && dto.name !== componentType.name) {
      const existingType = await this.cnfComponentTypeRepository.findOne({
        where: { name: dto.name },
      });

      if (existingType) {
        throw new BadRequestException(`Тип компонента с именем "${dto.name}" уже существует`);
      }
    }

    Object.assign(componentType, dto);
    return await this.cnfComponentTypeRepository.save(componentType);
  }

  async deleteComponentType(id: string) {
    const componentType = await this.cnfComponentTypeRepository.findOne({
      where: { id },
    });

    if (!componentType) {
      throw new NotFoundException(`Тип компонента с id "${id}" не найден`);
    }

    // Проверяем, используется ли тип в компонентах
    const componentsCount = await this.cnfComponentRepository.count({
      where: { type_id: id },
    });

    if (componentsCount > 0) {
      throw new BadRequestException(
        `Невозможно удалить тип компонента "${componentType.name}", так как он используется в ${componentsCount} компонентах`,
      );
    }

    await this.cnfComponentTypeRepository.remove(componentType);
    return { message: `Тип компонента "${componentType.name}" успешно удален` };
  }
}
