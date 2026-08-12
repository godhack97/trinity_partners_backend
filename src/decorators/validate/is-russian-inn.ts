import { isValidRussianInn } from "@app/utils/russian-inn";
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

export const IsRussianInn = (
  validationOptions?: ValidationOptions,
): PropertyDecorator =>
  (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: "isRussianInn",
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: {
        message: "ИНН должен содержать 10 или 12 цифр и иметь верную контрольную сумму",
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          return isValidRussianInn(value);
        },
        defaultMessage({ property }: ValidationArguments): string {
          return `${property} должен быть корректным ИНН`;
        },
      },
    });
  };
