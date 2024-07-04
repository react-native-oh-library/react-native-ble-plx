import { TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { TM } from '@rnoh/react-native-openharmony/generated/ts';
import { BleClientManager } from './BleModule'
import { BlePlxInterface } from './BlePlxInterface'
import { ValueType } from '@kit.ArkData';
import { PermissionHandler } from './common/PermissionHandler'

export class BlePlxModule extends TurboModule implements TM.BlePlx.Spec, BlePlxInterface {
  static NAME = 'BlePlx';

  private manager: BleClientManager;

  constructor(ctx: TurboModuleContext) {
    super(ctx);

    let permissionHandler = new PermissionHandler();
    permissionHandler.checkPermission('ohos.permission.ACCESS_BLUETOOTH', ctx.uiAbilityContext);
  }

  public dispatchEvent(name: string, value: any) {
    this.ctx.rnInstance.emitDeviceEvent(name, value);
  }

  addListener(eventName: string): void {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  removeListeners(count: number): void {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  createClient(restoreStateIdentifier?: string): void {
    this.manager = new BleClientManager(restoreStateIdentifier);
    this.manager.delegate = this;
  }

  destroyClient(): Promise<void> {
    this.manager.invalidate();
    this.manager = null;
    return Promise.resolve();
  }

  cancelTransaction(transactionId: string): Promise<void> {
    return this.manager.cancelTransaction(transactionId);
  }

  setLogLevel(logLevel: string): Promise<Object> {
    return this.manager.setLogLevel(logLevel);
  }

  logLevel(): Promise<Object> {
    return this.manager.getLogLevel();
  }

  enable(transactionId: string): Promise<void> {
    return this.manager.enable(transactionId);
  }

  disable(transactionId: string): Promise<void> {
    return this.manager.disable(transactionId);
  }

  state(): Promise<Object> {
    return this.manager.state();
  }

  startDeviceScan(filteredUUIDs: string[], options: Object): Promise<void> {
    return this.manager.startDeviceScan(filteredUUIDs, options);
  }

  stopDeviceScan(): Promise<void> {
    return this.manager.stopDeviceScan();
  }

  requestConnectionPriorityForDevice(deviceId: string, connectionPriority: number,
                                     transactionId: string): Promise<Object> {
    return this.manager.requestConnectionPriorityForDevice(deviceId, connectionPriority, transactionId);
  }

  readRSSIForDevice(deviceId: string, transactionId: string): Promise<Object> {
    return this.manager.readRSSIForDevice(deviceId, transactionId);
  }

  requestMTUForDevice(deviceId: string, mtu: number, transactionId: string): Promise<Object> {
    return this.manager.requestMTUForDevice(deviceId, mtu, transactionId);
  }

  devices(deviceIdentifiers: string[]): Promise<Object[]> {
    return this.manager.devices(deviceIdentifiers);
  }

  connectedDevices(serviceUUIDs: string[]): Promise<Object[]> {
    return this.manager.getConnectedDevices(serviceUUIDs);
  }

  connectToDevice(deviceId: string, options?: Object): Promise<Object> {
    return this.manager.connectToDevice(deviceId, options as Map<string, ValueType>);
  }

  cancelDeviceConnection(deviceId: string): Promise<Object> {
    return this.manager.cancelDeviceConnection(deviceId);
  }

  isDeviceConnected(deviceId: string): Promise<boolean> {
    return this.manager.isDeviceConnected(deviceId);
  }

  discoverAllServicesAndCharacteristicsForDevice(deviceId: string, transactionId: string): Promise<Object> {
    return this.manager.discoverAllServicesAndCharacteristicsForDevice(deviceId, transactionId);
  }

  servicesForDevice(deviceId: string): Promise<Object[]> {
    return this.manager.servicesForDevice(deviceId);
  }

  characteristicsForDevice(deviceId: string, serviceUUID: string): Promise<Object[]> {
    return this.manager.characteristicsForDevice(deviceId, serviceUUID);
  }

  characteristicsForService(serviceIdentifier: number): Promise<Object[]> {
    return this.manager.characteristicsForService(serviceIdentifier);
  }

  descriptorsForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string): Promise<Object[]> {
    return this.manager.descriptorsForDevice(deviceId, serviceUUID, characteristicUUID);
  }

  descriptorsForService(serviceIdentifier: number, characteristicUUID: string): Promise<Object[]> {
    return this.manager.descriptorsForService(serviceIdentifier, characteristicUUID);
  }

  descriptorsForCharacteristic(characteristicIdentifier: number): Promise<Object[]> {
    return this.manager.descriptorsForCharacteristic(characteristicIdentifier);
  }

  readCharacteristicForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string,
                              transactionId: string): Promise<Object> {
    return this.manager.readCharacteristicForDevice(deviceId, serviceUUID, characteristicUUID, transactionId);
  }

  readCharacteristicForService(serviceIdentifier: number, characteristicUUID: string,
                               transactionId: string): Promise<Object> {
    return this.manager.readCharacteristicForService(serviceIdentifier, characteristicUUID, transactionId);
  }

  readCharacteristic(characteristicIdentifier: number, transactionId: string): Promise<Object> {
    return this.manager.readCharacteristic(characteristicIdentifier, transactionId);
  }

  writeCharacteristicForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string, valueBase64: string,
                               response: boolean, transactionId: string): Promise<Object> {
    return this.manager.writeCharacteristicForDevice(deviceId, serviceUUID, characteristicUUID, valueBase64, response,
      transactionId);
  }

  writeCharacteristicForService(serviceIdentifier: number, characteristicUUID: string, valueBase64: string,
                                response: boolean, transactionId: string): Promise<Object> {
    return this.manager.writeCharacteristicForService(serviceIdentifier, characteristicUUID, valueBase64, response,
      transactionId);
  }

  writeCharacteristic(characteristicIdentifier: number, valueBase64: string, response: boolean,
                      transactionId: string): Promise<Object> {
    return this.manager.writeCharacteristic(characteristicIdentifier, valueBase64, response, transactionId);
  }

  monitorCharacteristicForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string,
                                 transactionId: string): Promise<void> {
    return this.manager.monitorCharacteristicForDevice(deviceId, serviceUUID, characteristicUUID, transactionId);
  }

  monitorCharacteristicForService(serviceIdentifier: number, characteristicUUID: string,
                                  transactionId: string): Promise<void> {
    return this.manager.monitorCharacteristicForService(serviceIdentifier, characteristicUUID, transactionId);
  }

  monitorCharacteristic(characteristicIdentifier: number, transactionId: string): Promise<void> {
    return this.manager.monitorCharacteristic(characteristicIdentifier, transactionId);
  }

  readDescriptorForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string, descriptorUUID: string,
                          transactionId: string): Promise<Object> {
    return this.manager.readDescriptorForDevice(deviceId, serviceUUID, characteristicUUID, descriptorUUID,
      transactionId);
  }

  readDescriptorForService(serviceIdentifier: number, characteristicUUID: string, descriptorUUID: string,
                           transactionId: string): Promise<Object> {
    return this.manager.readDescriptorForService(serviceIdentifier, characteristicUUID, descriptorUUID, transactionId);
  }

  readDescriptorForCharacteristic(characteristicIdentifier: number, descriptorUUID: string,
                                  transactionId: string): Promise<Object> {
    return this.manager.readDescriptorForCharacteristic(characteristicIdentifier, descriptorUUID, transactionId);
  }

  readDescriptor(descriptorIdentifier: number, transactionId: string): Promise<Object> {
    return this.manager.readDescriptor(descriptorIdentifier, transactionId);
  }

  writeDescriptorForDevice(deviceId: string, serviceUUID: string, characteristicUUID: string, descriptorUUID: string,
                           valueBase64: string, transactionId: string): Promise<Object> {
    return this.manager.writeDescriptorForDevice(deviceId, serviceUUID, characteristicUUID, descriptorUUID, valueBase64,
      transactionId);
  }

  writeDescriptorForService(serviceIdentifier: number, characteristicUUID: string, descriptorUUID: string,
                            valueBase64: string, transactionId: string): Promise<Object> {
    return this.manager.writeDescriptorForService(serviceIdentifier, characteristicUUID, descriptorUUID, valueBase64,
      transactionId);
  }

  writeDescriptorForCharacteristic(characteristicIdentifier: number, descriptorUUID: string, valueBase64: string,
                                   transactionId: string): Promise<Object> {
    return this.manager.writeDescriptorForCharacteristic(characteristicIdentifier, descriptorUUID, valueBase64,
      transactionId);
  }

  writeDescriptor(descriptorIdentifier: number, valueBase64: string, transactionId: string): Promise<Object> {
    return this.manager.writeDescriptor(descriptorIdentifier, valueBase64, transactionId);
  }
}
