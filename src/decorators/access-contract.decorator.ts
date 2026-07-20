import { SetMetadata } from "@nestjs/common";
import { ApiExtension } from "@nestjs/swagger";

type AccessDecorator = ClassDecorator & MethodDecorator;

/**
 * Keeps runtime guard metadata and the public OpenAPI access contract in sync.
 * Nest Swagger does not propagate class-level ApiExtension metadata to routes,
 * so class-level values are copied to every handler without a local override.
 */
export const createAccessContractDecorator = (
  metadataKey: string,
  extensionKey: `x-${string}`,
  values: string[],
): AccessDecorator => {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    const setRuntimeMetadata = SetMetadata(metadataKey, values);
    const setOpenApiMetadata = ApiExtension(extensionKey, values);

    if (descriptor && propertyKey !== undefined) {
      setRuntimeMetadata(target, propertyKey, descriptor);
      setOpenApiMetadata(target, propertyKey, descriptor);
      return;
    }

    (setRuntimeMetadata as ClassDecorator)(target as Function);

    const controller = target as { prototype?: Record<string, unknown> };
    const prototype = controller.prototype;
    if (!prototype) return;

    Object.getOwnPropertyNames(prototype).forEach((methodName) => {
      if (methodName === "constructor") return;

      const handler = prototype[methodName];
      if (typeof handler !== "function") return;
      if (Reflect.hasOwnMetadata(metadataKey, handler)) return;

      const handlerDescriptor = Object.getOwnPropertyDescriptor(
        prototype,
        methodName,
      );
      if (!handlerDescriptor) return;

      setOpenApiMetadata(prototype, methodName, handlerDescriptor);
    });
  };
};
