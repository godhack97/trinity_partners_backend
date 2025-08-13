import { EntityClassOrSchema } from "@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type";
import * as entities from "./entities";

export const entityList = createEntities();

function createEntities(): EntityClassOrSchema[] {
  const entityList = [];
  for (const entity of Object.values(entities)) {
    entityList.push(entity);
  }
  return entityList;
}
