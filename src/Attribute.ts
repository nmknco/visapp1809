import { AttrType } from './commons/types';


class Attribute {
  readonly name: string;
  readonly type: AttrType;
  constructor(name: string, type: AttrType) {
    this.name = name;
    this.type = type;
  }
}

export { Attribute };
