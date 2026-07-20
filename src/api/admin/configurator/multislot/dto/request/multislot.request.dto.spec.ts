import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateMultislotRequestDto } from "./create-multislot.request.dto";
import { UpdateMultislotRequestDto } from "./update-multislot.request.dto";

const slot1 = "11111111-1111-4111-8111-111111111111";
const slot2 = "22222222-2222-4222-8222-222222222222";

const validateDto = (Type: any, payload: any) =>
  validate(plainToInstance(Type, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe("multislot request DTO", () => {
  it.each([CreateMultislotRequestDto, UpdateMultislotRequestDto])(
    "%p accepts the same canonical multislot_slots payload",
    async (Type) => {
      await expect(validateDto(Type, {
        name: "Rear riser",
        multislot_slots: [{ slot_id: slot1 }, { slot_id: slot2 }],
      })).resolves.toHaveLength(0);
    },
  );

  it("rejects legacy slotIds, duplicate slots and malformed ids", async () => {
    const legacyErrors = await validateDto(CreateMultislotRequestDto, {
      name: "Rear riser",
      slotIds: [slot1],
    });
    const duplicateErrors = await validateDto(CreateMultislotRequestDto, {
      name: "Rear riser",
      multislot_slots: [{ slot_id: slot1 }, { slot_id: slot1 }],
    });
    const invalidIdErrors = await validateDto(CreateMultislotRequestDto, {
      name: "Rear riser",
      multislot_slots: [{ slot_id: "not-a-uuid" }],
    });

    expect(legacyErrors.length).toBeGreaterThan(0);
    expect(duplicateErrors.length).toBeGreaterThan(0);
    expect(invalidIdErrors.length).toBeGreaterThan(0);
  });
});
