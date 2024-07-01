import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {

  // NativeModule methods

  addListener(eventName: string): void;

  removeListeners(count: number): void;

  createClient(restoreStateIdentifier?: string): void;

  destroyClient(): Promise<void>;

  cancelTransaction(transactionId: string): Promise<void>;

  setLogLevel(logLevel: string): Promise<Object>;

  logLevel(): Promise<Object>;

  enable(transactionId: string): Promise<void>;

  disable(transactionId: string): Promise<void>;

  state(): Promise<Object>;

  startDeviceScan(filteredUUIDs?: Array<string>, options?: Object): Promise<void>;

  stopDeviceScan(): Promise<void>;

  requestConnectionPriorityForDevice(deviceId: string, connectionPriority: number, transactionId: string): Promise<Object>;

  readRSSIForDevice(deviceId: string, transactionId: string): Promise<Object>;

  requestMTUForDevice(deviceId: string, mtu: number, transactionId: string): Promise<Object>;

  devices(deviceIdentifiers: Array<string>): Promise<Array<Object>>;

  connectedDevices(serviceUUIDs: Array<string>): Promise<Array<Object>>;

  connectToDevice(deviceId: string, options?: Object): Promise<Object>;

  cancelDeviceConnection(deviceId: string): Promise<Object>;

  isDeviceConnected(deviceId: string): Promise<boolean>;

  discoverAllServicesAndCharacteristicsForDevice(deviceId: string, transactionId: string): Promise<Object>;

  servicesForDevice(deviceId: string): Promise<Array<Object>>;

  characteristicsForDevice(deviceId: string, serviceUUID: string): Promise<Array<Object>>;

  characteristicsForService(serviceIdentifier: number): Promise<Array<Object>>;

  descriptorsForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string): Promise<Array<Object>>; //Object-->NativeDescriptor

  descriptorsForService(serviceIdentifier: number, characteristicUUID: string): Promise<Array<Object>>; //Object-->NativeDescriptor

  descriptorsForCharacteristic(characteristicIdentifier: number): Promise<Array<Object>>; //Object-->NativeDescriptor

  readCharacteristicForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string, transactionId: string): Promise<Object>; //Object-->NativeCharacteristic

  readCharacteristicForService(serviceIdentifier: number, characteristicUUID: string, transactionId: string): Promise<Object>; //Object-->NativeCharacteristic

  readCharacteristic(characteristicIdentifer: number, transactionId: string): Promise<Object>; //Object-->NativeCharacteristic

  writeCharacteristicForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string, valueBase64: string, response: boolean, transactionId: string): Promise<Object>; //Object-->NativeCharacteristic

  writeCharacteristicForService(serviceIdentifier: number, characteristicUUID: string, valueBase64: string, response: boolean, transactionId: string): Promise<Object>; //Object-->NativeCharacteristic

  writeCharacteristic(characteristicIdentifier: number, valueBase64: string, response: boolean, transactionId: string): Promise<Object>; //Object-->NativeCharacteristic

  monitorCharacteristicForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string, transactionId: string): Promise<void>;

  monitorCharacteristicForService(serviceIdentifier: number, characteristicUUID: string, transactionId: string): Promise<void>;

  monitorCharacteristic(characteristicIdentifier: number, transactionId: string): Promise<void>;

  readDescriptorForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string, descriptorUUID: string, transactionId: string): Promise<Object>; //Object-->NativeDescriptor

  readDescriptorForService(serviceIdentifier: number, characteristicUUID: string, descriptorUUID: string, transactionId: string): Promise<Object>; //Object-->NativeDescriptor

  readDescriptorForCharacteristic(characteristicIdentifier: number, descriptorUUID: string, transactionId: string): Promise<Object>; //Object-->NativeDescriptor

  readDescriptor(descriptorIdentifier: number, transactionId: string): Promise<Object>; //Object-->NativeDescriptor

  writeDescriptorForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string, descriptorUUID: string, valueBase64: string, transactionId: string): Promise<Object>; //Object-->NativeDescriptor

  writeDescriptorForService(serviceIdentifier: number, characteristicUUID: string, descriptorUUID: string, valueBase64: string, transactionId: string): Promise<Object>; //Object-->NativeDescriptor

  writeDescriptorForCharacteristic(characteristicIdentifier: number, descriptorUUID: string, valueBase64: string, transactionId: string): Promise<Object>; //Object-->NativeDescriptor

  writeDescriptor(descriptorIdentifier: number, valueBase64: string, transactionId: string): Promise<Object>; //Object-->NativeDescriptor
}

export default TurboModuleRegistry.getEnforcing<Spec>('BlePlx');
