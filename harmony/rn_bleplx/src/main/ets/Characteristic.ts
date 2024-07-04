import ble from '@ohos.bluetooth.ble';
import Logger from './common/Logger';
import { Service } from './Service';
import { arrayBufferToBase64 } from './common/BleUtils'
import { Descriptor } from './Descriptor'
import { IdGenerator } from './common/IdGenerator';
import { IdGeneratorKey } from './common/IdGeneratorKey';
import { ValuesBucket } from '@kit.ArkData';
import { InstanceIdGenerator } from './common/InstanceIdGenerator';

export class Characteristic {
  private id: number;
  private serviceID: number;
  private serviceUUID: string;
  private deviceID: string;
  private value: ArrayBuffer;
  public gattCharacteristic: ble.BLECharacteristic;

  public writeType: ble.GattWriteType;

  public setValue(value: ArrayBuffer) {
    this.value = value;
  }

  constructor(id: number, deviceID: string, serviceID: number, serviceUUID: string,
              gattCharacteristic: ble.BLECharacteristic) {
    this.id = id;
    this.deviceID = deviceID;
    this.serviceUUID = serviceUUID;
    this.serviceID = serviceID;
    this.gattCharacteristic = gattCharacteristic;
  }

  static constructorWithId(id: number, service: Service, gattCharacteristic: ble.BLECharacteristic): Characteristic {
    return new Characteristic(id, service.getDeviceID(), service.getId(), service.getUuid(), gattCharacteristic);
  }

  static constructorWithNative(service: Service, gattCharacteristic: ble.BLECharacteristic): Characteristic {
    let id: number =
      IdGenerator.getIdForKey(new IdGeneratorKey(service.getDeviceID(), gattCharacteristic.characteristicUuid,
        InstanceIdGenerator.generateInstanceId(gattCharacteristic.characteristicUuid)))
    return new Characteristic(id, service.getDeviceID(), service.getId(), service.getUuid(), gattCharacteristic);
  }

  static constructorWithOther(other: Characteristic): Characteristic {
    return new Characteristic(other.id, other.deviceID, other.serviceID, other.serviceUUID, other.gattCharacteristic);
  }

  public getId(): number {
    return this.id;
  }

  public getUuid(): string {
    return this.gattCharacteristic.characteristicUuid;
  }

  public getServiceID(): number {
    return this.serviceID;
  }

  public getServiceUUID(): string {
    return this.serviceUUID;
  }

  public getDeviceId(): string {
    return this.deviceID;
  }

  public getInstanceId(): number {
    return InstanceIdGenerator.generateInstanceId(this.gattCharacteristic.characteristicUuid);
  }

  public getGattDescriptor(uuid: string): ble.BLEDescriptor | null {
    let descriptor: ble.BLEDescriptor = null;
    this.gattCharacteristic.descriptors.forEach(value => {
      if (value.descriptorUuid == uuid) {
        descriptor = value;
      }
    })

    return descriptor;
  }

  public setWriteType(writeType: number) {
    this.writeType = writeType;
  }

  public isReadable(): boolean {
    return this.gattCharacteristic.properties.read ?? false;
  }

  public isWritableWithResponse(): boolean {
    if (this.gattCharacteristic.properties) {
      if (this.gattCharacteristic.properties.writeNoResponse) {
        return false
      }
      return true;
    }
    return false;
  }

  public isWritableWithoutResponse(): boolean {
    return this.gattCharacteristic.properties.writeNoResponse ?? false;
  }

  public isNotifiable(): boolean {
    return this.gattCharacteristic.properties.notify ?? false;
  }

  public getDescriptors(): Descriptor[] {
    var descriptors: Descriptor[] = []
    this.gattCharacteristic.descriptors.forEach(value => {
      let obj = Descriptor.constructorWithNative(this, value);
      descriptors.push(obj);
    });
    return descriptors;
  }

  public isNotifying(): boolean {
    return false;
  }

  public isIndicatable(): boolean {
    return this.gattCharacteristic.properties.indicate;
  }

  public getValue(): ArrayBuffer {
    return this.value;
  }

  public getDescriptorByUUID(uuid: string): Descriptor {
    let descriptor: Descriptor = null;
    this.gattCharacteristic.descriptors.forEach(value => {
      if (value.descriptorUuid == uuid) {
        descriptor = Descriptor.constructorWithNative(this, value);
      }
    })
    return descriptor;
  }

  public logValue(message: string, value: ArrayBuffer) {
    Logger.debug(message);
  }

  public asJSObject(): ValuesBucket {
    return {
      "id": this.getId(),
      "uuid": this.getUuid(),
      "deviceID": this.getDeviceId(),
      "serviceID": this.getServiceID(),
      "serviceUUID": this.getServiceUUID(),
      "isReadable": this.isReadable(),
      "isWritableWithResponse": this.isWritableWithResponse(),
      "isWritableWithoutResponse": this.isWritableWithoutResponse(),
      "isNotifiable": this.isNotifiable(),
      "isNotifying": this.isNotifying(),
      "isIndicatable": this.isIndicatable(),
      "value": arrayBufferToBase64(this.value),
    };
  }
}
