export class InstanceIdGenerator {
  static instanceMap: Map<string, number> = new Map();

  // 根据uuid生成instantId
  static generateInstanceId(uuid: string): number {
    let value = this.instanceMap.get(uuid);
    if (value == null) {
      value = new Date().getTime();
      this.instanceMap.set(uuid, value);
    }
    return value;
  }
}