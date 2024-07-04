export class IdGeneratorKey {
  readonly deviceAddress: string;
  readonly uuid: string;
  readonly id: number;

  constructor(deviceAddress: string, uuid: string, id: number) {
    this.deviceAddress = deviceAddress;
    this.uuid = uuid;
    this.id = id;
  }

  equals(other: any): boolean {
    if (this === other) {
      return true;
    }
    if (other === null || typeof other !== 'object' || !(other instanceof IdGeneratorKey)) {
      return false;
    }

    const that = other as IdGeneratorKey;

    if (this.id !== that.id) {
      return false;
    }
    if (this.deviceAddress !== that.deviceAddress) {
      return false;
    }
    return this.uuid === that.uuid;
  }

  hashCode(): number {
    let result = this.stringHashCode(this.deviceAddress);
    result = 31 * result + this.stringHashCode(this.uuid);
    result = 31 * result + this.id;
    return result;
  }

  stringHashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
}
