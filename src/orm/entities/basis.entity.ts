import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Timestamp,
  UpdateDateColumn,
} from "typeorm";
import { Exclude } from "class-transformer";

type ctx = {
  [name: string]: any;
};

class AbstractEntity {
  static $accepted_columns = [];
  static $attrs_black = ["created_at", "updated_at", "deleted_at"];
  filterAttrs(ctx: ctx, data: object) {
    return Object.fromEntries(
      Object.entries(data).filter(([k]) => {
        if (ctx) {
          return ctx.$accepted_columns.includes(k);
        }
        return AbstractEntity.$accepted_columns.includes(k);
      }),
    );
  }
  filterAttrsBlack(ctx: ctx = null, data: object) {
    return Object.fromEntries(
      Object.entries(data).filter(([k]) => {
        if (ctx) {
          return !ctx.$attrs_black.includes(k);
        }
        return !AbstractEntity.$attrs_black.includes(k);
      }),
    );
  }
  _update(ctx: any, constructor, data: object) {
    console.warn(ctx.$accepted_columns, ctx.$attrs_black);
    let filtered = this.filterAttrsBlack(constructor, data);
    filtered = this.filterAttrs(constructor, filtered);

    Object.assign(ctx, filtered);
  }
}

export class BasisEntity extends AbstractEntity {
  constructor() {
    super();
  }
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  created_at: Timestamp;

  @UpdateDateColumn()
  updated_at: Timestamp;
}

export class BasisUUIDEntity extends AbstractEntity {
  constructor() {
    super();
  }
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn()
  created_at: Timestamp;

  @UpdateDateColumn()
  updated_at: Timestamp;
}
