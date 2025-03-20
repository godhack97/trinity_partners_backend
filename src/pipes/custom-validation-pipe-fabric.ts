import {
  BadRequestException,
  ValidationError,
  ValidationPipe
} from "@nestjs/common";

const options = {
  exceptionFactory: (errors: ValidationError[]) => {
    const flattenErrors = (errors: ValidationError[], parentPath = ''): ValidationError[] => {
      return errors.flatMap(error => {
        const currentPath = parentPath ? `${parentPath}.${error.property}` : error.property;
        if (error.children?.length) {
          return flattenErrors(error.children, currentPath);
        }
        // Strip parent path and keep only the leaf property
        const leafProperty = currentPath.split('.').pop();
        return [{
          ...error,
          property: leafProperty,
        }];
      });
    };

    const flattenedErrors = flattenErrors(errors);

    const messages = flattenedErrors.flatMap(error =>
      Object.values(error.constraints).map(constraint =>
        `${constraint}`
      )
    );

    return new BadRequestException(messages);
  },
};

export const CustomValidationPipeFabric = () => new ValidationPipe(options)