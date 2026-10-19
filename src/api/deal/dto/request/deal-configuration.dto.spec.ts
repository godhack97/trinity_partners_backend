import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DealConfigurationDto } from "./deal-configuration.dto";

describe("DealConfigurationDto", () => {
  it("accepts configurator options and component selection sources", async () => {
    const dto = plainToInstance(DealConfigurationDto, {
      id: "configuration-1",
      serverId: "server-1",
      amount: 2,
      options: { rear_to_pcie: true },
      components: [
        {
          id: "component-1",
          typeId: "cpu-type-id",
          amount: 2,
          source: "manual",
        },
        {
          id: "component-2",
          typeId: "ram-type-id",
          amount: 8,
          source: "auto_added",
        },
      ],
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([]);
  });

  it("accepts the technical support snapshot produced by a saved configuration", async () => {
    const dto = plainToInstance(DealConfigurationDto, {
      id: "configuration-1",
      support: {
        id: "extended-3",
        componentId: "support-component-1",
        name: "Расширенная техническая поддержка",
        years: 3,
        price: 0,
        description: "Поддержка оборудования",
        formula: "percent_of_equipment",
        percent: 10,
        warningText: "Стоимость рассчитывается от цены оборудования",
        warningColor: "#f59e0b",
      },
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([]);
  });
});
