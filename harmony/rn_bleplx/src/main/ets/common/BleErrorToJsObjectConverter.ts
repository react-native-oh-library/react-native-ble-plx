import { BleError } from './BleError';

export class BleErrorToJsObjectConverter {
  public toJSCallback(error: BleError): any[] {
    const result: any[] = [];
    result.push(this.toJs(error));
    result.push(null);
    return result;
  }

  public toJs(error: BleError): string {
    const obj: any = {};

    obj["errorCode"] = error.errorCode;

    obj["attErrorCode"] =
      error.harmonyCode != null && error.harmonyCode >= 0 && error.harmonyCode < 0x80 ? error.harmonyCode : null;

    obj["iosErrorCode"] = null;

    obj["harmonyErrorCode"] = error.harmonyCode != null && error.harmonyCode >= 0x80 ? error.harmonyCode : null;

    this.appendString(obj, "reason", error.reason);
    this.appendString(obj, "deviceID", error.deviceID);
    this.appendString(obj, "serviceUUID", error.serviceUUID);
    this.appendString(obj, "characteristicUUID", error.characteristicUUID);
    this.appendString(obj, "descriptorUUID", error.descriptorUUID);
    this.appendString(obj, "internalMessage", error.internalMessage);
    return JSON.stringify(obj);
  }

  private appendString(obj: any, key: string, value: string | undefined): void {
    if (value !== undefined) {
      obj[key] = value === null ? null : value;
    } else {
      obj[key] = null;
    }
  }
}