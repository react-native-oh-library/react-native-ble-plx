import { IdGeneratorKey } from './IdGeneratorKey';

export class IdGenerator {
  private static idMap = new Map<IdGeneratorKey, number>();
  private static nextKey = 0;

  static getIdForKey(idGeneratorKey: IdGeneratorKey): number {
    const id = this.idMap.get(idGeneratorKey);
    if (id !== undefined) {
      return id;
    }
    this.idMap.set(idGeneratorKey, ++this.nextKey);
    return this.nextKey;
  }

  static clear(): void {
    this.idMap.clear();
    this.nextKey = 0;
  }
}