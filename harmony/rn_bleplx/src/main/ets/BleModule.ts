import ble from '@ohos.bluetooth.ble';
import access from '@ohos.bluetooth.access';
import { BusinessError } from '@ohos.base';
import Logger from './common/Logger'
import { ValuesBucket, ValueType } from '@kit.ArkData';
import { stringToArrayBuffer, scanResultToJsObjectConverter } from './common/BleUtils'
import { constant } from '@kit.ConnectivityKit';
import { JSON } from '@kit.ArkTS';
import { BleErrorToJsObjectConverter } from './common/BleErrorToJsObjectConverter';
import { Service } from './Service';
import { Characteristic } from './Characteristic';
import { Descriptor } from './Descriptor';
import { ServiceFactory } from './common/ServiceFactory';
import { BleDevice } from './BleDevice';
import { BleError, BleErrorCode } from './common/BleError';
import { BleEvent } from './common/BleEvent';
import { BlePlxInterface } from './BlePlxInterface'

export class BleClientManager {
  // restoreIdentifierKey
  private restoreIdentifierKey: string;

  // 代理
  public delegate: BlePlxInterface | undefined;

  // 连接的设备
  private connectedDevices: Map<string, BleDevice> = new Map();

  // Services
  private discoveredServices: Map<number, Service> = new Map();

  // Characteristics
  private discoveredCharacteristics: Map<number, Characteristic> = new Map();

  // Descriptors
  private discoveredDescriptors: Map<number, Descriptor> = new Map();

  // Devices
  private discoveredDevices: Map<string, ValuesBucket> = new Map();

  private errorConverter: BleErrorToJsObjectConverter = new BleErrorToJsObjectConverter();

  private logLevel: string;

  constructor(restoreIdentifierKey: string) {
    this.restoreIdentifierKey = restoreIdentifierKey;

    access.on("stateChange", (state => {
      this.onStateChange(state);
    }))
  }

  public invalidate() {
    this.connectedDevices.clear();
    this.discoveredServices.clear();
    this.discoveredCharacteristics.clear();
    this.discoveredDescriptors.clear();
    this.discoveredDevices.clear();
  }

  private dispatchEvent(name: string, value: any) {
    this.delegate?.dispatchEvent(name, value);
  }

  public enable(transactionId: string): Promise<void> {
    try {
      access.enableBluetooth();
      return Promise.resolve();
    } catch (e) {
      let bleError = new BleError(BleErrorCode.BluetoothStateChangeFailed, e.message);
      return Promise.reject(this.errorConverter.toJs(bleError));
    }
  }

  public disable(transactionId: string): Promise<void> {
    try {
      access.disableBluetooth();
      return Promise.resolve();
    } catch (e) {
      let bleError = new BleError(BleErrorCode.BluetoothStateChangeFailed, e.message);
      return Promise.reject(this.errorConverter.toJs(bleError));
    }
  }

  public state(): Promise<Object> {
    var result: string = 'Unknown';
    let state = access.getState();
    switch (state) {
      case access.BluetoothState.STATE_OFF:
        result = 'PoweredOff';
        break;
      case access.BluetoothState.STATE_ON:
      case access.BluetoothState.STATE_BLE_ON:
        result = 'PoweredOn';
        break;
      case access.BluetoothState.STATE_TURNING_ON:
      case access.BluetoothState.STATE_TURNING_OFF:
      case access.BluetoothState.STATE_BLE_TURNING_ON:
      case access.BluetoothState.STATE_BLE_TURNING_OFF:
        result = 'Resetting';
        break;
    }
    Logger.debug('State: ' + result);
    return Promise.resolve(result);
  }

  // Mark: Scanning ---------------------------------------------------------------------------------------------------

  /**
   * @description 开始蓝牙扫描
   * @param filteredUUIDs: Array<string>
   * @param options: Map<string, number>
   */
  public startDeviceScan(filteredUUIDs?: Array<string>, options?: Object): Promise<void> {
    try {
      // 监听发现的设备
      ble.on("BLEDeviceFind", (data: Array<ble.ScanResult>) => {
        let device = data[0];
        let result = scanResultToJsObjectConverter(device);
        this.discoveredDevices.set(device.deviceId, result);
        this.dispatchEvent(BleEvent.scanEvent, [null, result]);
      });

      // 扫描结果过滤策略集合
      let filters: Array<ble.ScanFilter> = null;
      if (filteredUUIDs && filteredUUIDs.length > 0) {
        filters = [];
        filteredUUIDs.forEach(item => {
          let scanFilter: ble.ScanFilter = {
            serviceUuid: item
          };
          filters.push(scanFilter);
        })
      }

      // 扫描的参数配置
      let scanOptions: ble.ScanOptions = {};
      if (options?.hasOwnProperty('scanMode')) {
        let scanMode = options?.['scanMode']
        if (scanMode == 0) {
          scanOptions.dutyMode = ble.ScanDuty.SCAN_MODE_LOW_POWER;
        } else if (scanMode == 1) {
          scanOptions.dutyMode = ble.ScanDuty.SCAN_MODE_BALANCED;
        } else if (scanMode == 2) {
          scanOptions.dutyMode = ble.ScanDuty.SCAN_MODE_LOW_LATENCY;
        }
      }
      if (options?.hasOwnProperty('interval')) {
        scanOptions.interval = options?.['interval'];
      }
      if (options?.hasOwnProperty('matchMode')) {
        let matchMode = options?.['matchMode']
        if (matchMode == 1) {
          scanOptions.matchMode = ble.MatchMode.MATCH_MODE_AGGRESSIVE;
        } else if (matchMode == 2) {
          scanOptions.matchMode = ble.MatchMode.MATCH_MODE_STICKY;
        }
      }
      if (options?.hasOwnProperty('phyType')) {
        let phyType = options?.['phyType']
        if (phyType == 1) {
          scanOptions.phyType = ble.PhyType.PHY_LE_1M;
        } else if (phyType == 255) {
          scanOptions.phyType = ble.PhyType.PHY_LE_ALL_SUPPORTED;
        }
      }

      if (JSON.stringify(scanOptions) != '{}') {
        ble.startBLEScan(filters, scanOptions);
      } else {
        ble.startBLEScan(filters);
      }
      return Promise.resolve();
    } catch (err) {
      let bleError = new BleError(BleErrorCode.ScanStartFailed, 'Scan start failed.', null);
      this.dispatchEvent(BleEvent.scanEvent, this.errorConverter.toJs(bleError));
      return Promise.reject(this.errorConverter.toJs(bleError));
    }
  }

  /**
   * @description 停止蓝牙扫描
   */
  public stopDeviceScan(): Promise<void> {
    try {
      ble.off("BLEDeviceFind");
      ble.stopBLEScan();
      return Promise.resolve();
    } catch (err) {
      Logger.error('errCode: ' + (err as BusinessError).code + ', errMessage: ' + (err as BusinessError).message);
    }
  }

  /**
   * @description Request a connection parameter update.
   */
  public requestConnectionPriorityForDevice(deviceIdentifier: string, connectionPriority: number,
                                            transactionId: string): Promise<Object> {
    let device = this.connectedDevices.get(deviceIdentifier);
    if (!device) {
      let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
      bleError.deviceID = deviceIdentifier;
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return Promise.resolve(device.asJSObject());
  }

  /**
   * @description 读取RSSI
   */
  public readRSSIForDevice(deviceIdentifier: string, transactionId: string): Promise<Object> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceIdentifier);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceIdentifier
        reject(this.errorConverter.toJs(bleError));
      }

      device.clientDevice.getRssiValue((err: BusinessError, data: number) => {
        if (err == null) {
          resolve(device.asJSObject(data));
        } else {
          let bleError = new BleError(BleErrorCode.DeviceRSSIReadFailed, err.message, null);
          bleError.deviceID = deviceIdentifier
          reject(this.errorConverter.toJs(bleError));
        }
      })
    });
  }

  /**
   * @description 请求MTU
   */
  public requestMTUForDevice(deviceIdentifier: string, mtu: number, transactionId: string): Promise<Object> {
    let device = this.connectedDevices.get(deviceIdentifier);
    if (!device) {
      let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
      bleError.deviceID = deviceIdentifier
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    try {
      device.clientDevice.setBLEMtuSize(mtu);
      Promise.resolve(device.asJSObject());
    } catch (error) {
      let bleError = new BleError(BleErrorCode.DeviceMTUChangeFailed, 'MTU change failed.', null);
      bleError.deviceID = deviceIdentifier
      Promise.reject(this.errorConverter.toJs(bleError));
    }
  }

  // Mark: Connection Management --------------------------------------------------------------------------------------

  public devices(deviceIdentifiers: Array<string>): Promise<Object[]> {
    var list = Array<ValuesBucket>();
    deviceIdentifiers.forEach(deviceId => {
      this.discoveredDevices.forEach((value, key) => {
        if (key == deviceId) {
          list.push(value);
        }
      })
    })
    return Promise.resolve(list);
  }

  public getConnectedDevices(serviceUUIDs: Array<string>): Promise<Object[]> {
    var list = Array<ValuesBucket>();
    serviceUUIDs.forEach(serviceUUID => {
      this.connectedDevices.forEach(device => {
        let service = device.getServiceByUUID(serviceUUID);
        if (service) {
          list.push(device.asJSObject());
        }
      })
    })
    return Promise.resolve(list);
  }

  /**
   * @description client端发起连接远端蓝牙低功耗设备
   */
  public connectToDevice(deviceIdentifier: string, options?: Map<string, ValueType>): Promise<Object> {
    return new Promise((resolve, reject) => {
      let device: ble.GattClientDevice = ble.createGattClientDevice(deviceIdentifier);
      try {
        var deviceName: string = 'Unknown';
        let cacheDevice = this.discoveredDevices.get(deviceIdentifier);
        if (cacheDevice) {
          deviceName = cacheDevice['name'] as string;
        }

        let client = new BleDevice(deviceIdentifier, deviceName);
        client.clientDevice = device;

        device.on('BLEConnectionStateChange', (state: ble.BLEConnectionChangeState) => {
          Logger.debug('state changed：' + state.state.toString());
          if (state.state == constant.ProfileConnectionState.STATE_CONNECTED) {
            this.connectedDevices.set(deviceIdentifier, client);
            this.dispatchEvent(BleEvent.connectedEvent, deviceIdentifier);
            resolve(client.asJSObject());
          } else if (state.state == constant.ProfileConnectionState.STATE_CONNECTING) {
            this.dispatchEvent(BleEvent.connectingEvent, deviceIdentifier);
          } else if (state.state == constant.ProfileConnectionState.STATE_DISCONNECTED) {
            this.dispatchEvent(BleEvent.disconnectionEvent, [null, client.asJSObject()]);
            this.connectedDevices.delete(deviceIdentifier);
          }
        });
        device.on('BLEMtuChange', (mtu: number) => {
          client.mtu = mtu;
          this.connectedDevices.set(deviceIdentifier, client);
        })
        device.connect();
        this.dispatchEvent(BleEvent.connectingEvent, deviceIdentifier);
      } catch (err) {
        let bleError = new BleError(BleErrorCode.DeviceConnectionFailed, err.message, null);
        bleError.deviceID = deviceIdentifier
        reject(this.errorConverter.toJs(bleError));
      }
    });
  }

  /**
   * @description client端断开与远端蓝牙低功耗设备的连接
   */
  public cancelDeviceConnection(deviceIdentifier: string): Promise<Object> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceIdentifier);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceIdentifier
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      try {
        device.clientDevice.on('BLEConnectionStateChange', (state: ble.BLEConnectionChangeState) => {
          if (state.state == constant.ProfileConnectionState.STATE_DISCONNECTED) {
            resolve(device.asJSObject());
            return;
          }
        });
        device.clientDevice.disconnect();
      } catch (err) {
        let bleError = new BleError(BleErrorCode.DeviceNotConnected, err.message, null);
        bleError.deviceID = deviceIdentifier
        reject(this.errorConverter.toJs(bleError));
        return;
      }
    })
  }

  /**
   * @description 设备是否已连接
   */
  public isDeviceConnected(deviceIdentifier: string): Promise<boolean> {
    let regex = /[A-F\d]{2}:[A-F\d]{2}:[A-F\d]{2}:[A-F\d]{2}:[A-F\d]{2}:[A-F\d]{2}/;
    if (deviceIdentifier.match(regex)) {
      let device = this.connectedDevices.get(deviceIdentifier);
      return Promise.resolve(device == null ? false : true);
    }

    let bleError = new BleError(BleErrorCode.InvalidIdentifiers, null, null);
    bleError.deviceID = deviceIdentifier;
    bleError.internalMessage = deviceIdentifier;
    return Promise.reject(this.errorConverter.toJs(bleError));
  }

  // Mark: Discovery --------------------------------------------------------------------------------------------------

  /**
   * @description 获取设备的服务和特征
   */
  public discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier: string,
                                                        transactionId: string): Promise<Object> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceIdentifier);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceIdentifier
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      device.clientDevice.getServices().then(services => {
        let factory = new ServiceFactory();
        var newServiceList: Service[] = [];
        // services
        services.forEach(service => {
          let newService = factory.create(deviceIdentifier, service);
          this.discoveredServices.set(newService.getId(), newService);
          newServiceList.push(newService);

          // characteristics
          newService.getCharacteristics().forEach(characteristic => {
            this.discoveredCharacteristics.set(characteristic.getId(), characteristic);

            // descriptors
            characteristic.getDescriptors().forEach(descriptor => {
              Logger.debug('serviceUuid： ' + service.serviceUuid);
              Logger.debug('characteristicUuid： ' + characteristic.getUuid());
              Logger.debug('descriptorUuid： ' + descriptor.getUuid());
              this.discoveredDescriptors.set(descriptor.getId(), descriptor);
            })
          })
        })
        device.setServices(newServiceList);
        resolve(device.asJSObject());
      }).catch(err => {
        let bleError = new BleError(BleErrorCode.ServicesDiscoveryFailed, err.message, null);
        bleError.deviceID = deviceIdentifier;
        reject(this.errorConverter.toJs(bleError));
      });
    });
  }

  // Mark: Service and characteristic getters -------------------------------------------------------------------------

  /**
   * @description List of discovered services for specified device.
   */
  public servicesForDevice(deviceIdentifier: string): Promise<Object[]> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceIdentifier);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceIdentifier;
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let services = device.getServices();
      var results = new Array<ValuesBucket>();
      services.forEach(obj => {
        results.push(obj.asJSObject());
      });
      resolve(results);
    });
  }

  /**
   * @description List of discovered {@link Characteristic}s for given {@link Device} and {@link Service}.
   */
  public characteristicsForDevice(deviceIdentifier: string,
                                  serviceUUID: string): Promise<Object[]> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceIdentifier);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      var service = device.getServiceByUUID(serviceUUID);
      if (service == null) {
        let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The service does not exist.', null);
        bleError.serviceUUID = serviceUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let characteristics = service.getCharacteristics();
      if (characteristics == null || characteristics.length == 0) {
        let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
        bleError.serviceUUID = serviceUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      var results = new Array<ValuesBucket>();
      characteristics.forEach(obj => {
        results.push(obj.asJSObject());
      });
      resolve(results);
    });
  }

  public characteristicsForService(serviceIdentifier: number): Promise<Object[]> {
    return new Promise((resolve, reject) => {
      let service = this.discoveredServices.get(serviceIdentifier);
      if (service == null) {
        let bleError = new BleError(BleErrorCode.ServiceNotFound, 'The service does not exist.', null);
        bleError.serviceUUID = serviceIdentifier.toString()
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let characteristics = service.getCharacteristics()
      if (characteristics == null || characteristics.length == 0) {
        let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
        bleError.serviceUUID = serviceIdentifier.toString()
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      var results = new Array<ValuesBucket>();
      characteristics.forEach(obj => {
        results.push(obj.asJSObject());
      });
      resolve(results);
    });
  }

  /**
   * @description List of discovered {@link Descriptor}s for given {@link Device}, {@link Service} and {@link Characteristic}.
   */
  public descriptorsForDevice(deviceIdentifier: string,
                              serviceUUID: string,
                              characteristicUUID: string): Promise<Object[]> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceIdentifier);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let service = device.getServiceByUUID(serviceUUID);
      if (service == null) {
        let bleError = new BleError(BleErrorCode.ServiceNotFound, 'The service does not exist..', null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let characteristic = service.getCharacteristicByUUID(characteristicUUID)
      if (characteristic == null) {
        let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let descriptors = characteristic.getDescriptors();
      var results = new Array<ValuesBucket>();
      descriptors.forEach(obj => {
        results.push(obj.asJSObject());
      });
      resolve(results);
    });
  }

  /**
   * @description List of discovered descriptors for specified service.
   */
  public descriptorsForService(serviceIdentifier: number, characteristicUUID: string): Promise<Object[]> {
    return new Promise((resolve, reject) => {
      let service = this.discoveredServices.get(serviceIdentifier);
      if (service == null) {
        let bleError = new BleError(BleErrorCode.ServiceNotFound, 'The service does not exist.', null);
        bleError.serviceUUID = serviceIdentifier.toString()
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let characteristic = service.getCharacteristicByUUID(characteristicUUID);
      if (characteristic == null) {
        let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
        bleError.serviceUUID = serviceIdentifier.toString()
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let descriptors = characteristic.getDescriptors();
      var results = new Array<ValuesBucket>();
      descriptors.forEach(obj => {
        results.push(obj.asJSObject());
      });
      resolve(results);
    });
  }

  /**
   * @description List of discovered descriptors for specified characteristic.
   */
  public descriptorsForCharacteristic(characteristicIdentifier: number): Promise<Object[]> {
    return new Promise((resolve, reject) => {
      let characteristic = this.discoveredCharacteristics.get(characteristicIdentifier);
      if (characteristic == null) {
        let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
        bleError.characteristicUUID = characteristicIdentifier.toString()
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let descriptors = characteristic.getDescriptors();
      var results = new Array<ValuesBucket>();
      descriptors.forEach(obj => {
        results.push(obj.asJSObject());
      });
      resolve(results);
    });
  }

  /**
   * @description Read characteristic's value.
   */
  public readCharacteristicForDevice(deviceIdentifier: string,
                                     serviceUUID: string,
                                     characteristicUUID: string,
                                     transactionId: string): Promise<Object> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceIdentifier);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let characteristic =
        this.getCharacteristicOrEmitErrorWithDeviceId(deviceIdentifier, serviceUUID, characteristicUUID);
      if (characteristic == null) {
        let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      device.clientDevice.readCharacteristicValue(characteristic.gattCharacteristic).then(value => {
        characteristic.setValue(value.characteristicValue);
        let newChar = Characteristic.constructorWithOther(characteristic);
        resolve(newChar.asJSObject());
      }).catch(err => {
        let bleError = new BleError(BleErrorCode.CharacteristicReadFailed, err.message, null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
      });
    });
  }

  /**
   * @description Read characteristic's value.
   */
  public readCharacteristicForService(serviceIdentifier: number,
                                      characteristicUUID: string,
                                      transactionId: string): Promise<Object> {
    let characteristic = this.getCharacteristicOrEmitErrorWithServiceId(serviceIdentifier, characteristicUUID);
    if (characteristic == null) {
      let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
      bleError.serviceUUID = serviceIdentifier.toString()
      bleError.characteristicUUID = characteristicUUID
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.readCharacteristicForDevice(characteristic.getDeviceId(), characteristic.getServiceUUID(),
      characteristicUUID, transactionId);
  }

  /**
   * @description Read characteristic's value.
   */
  public readCharacteristic(characteristicIdentifier: number,
                            transactionId: string): Promise<Object> {
    let characteristic = this.getCharacteristicOrEmitErrorWithCharId(characteristicIdentifier)
    if (characteristic == null) {
      let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
      bleError.characteristicUUID = characteristicIdentifier.toString()
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.readCharacteristicForDevice(characteristic.getDeviceId(), characteristic.getServiceUUID(),
      characteristic.getUuid(), transactionId);
  }

  // MARK: Writing ---------------------------------------------------------------------------------------------------

  /**
   * @description Write value to characteristic.
   */
  public writeCharacteristicForDevice(deviceIdentifier: string,
                                      serviceUUID: string,
                                      characteristicUUID: string,
                                      valueBase64: string,
                                      response: boolean,
                                      transactionId: string): Promise<Object> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceIdentifier);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let characteristic =
        this.getCharacteristicOrEmitErrorWithDeviceId(deviceIdentifier, serviceUUID, characteristicUUID);
      if (!characteristic) {
        let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      characteristic.gattCharacteristic.characteristicValue = stringToArrayBuffer(valueBase64);

      device.clientDevice.writeCharacteristicValue(characteristic.gattCharacteristic,
        response ? ble.GattWriteType.WRITE : ble.GattWriteType.WRITE_NO_RESPONSE).then(value => {
        Logger.debug('Write characteristic: ' + JSON.stringify(characteristic), +' value: ' + valueBase64);
        characteristic.setValue(stringToArrayBuffer(valueBase64));
        let newChar = Characteristic.constructorWithOther(characteristic);
        resolve(newChar.asJSObject());
      }).catch(err => {
        let bleError = new BleError(BleErrorCode.CharacteristicWriteFailed, err.message, null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
      });
    });
  }

  /**
   * @description Write value to characteristic.
   */
  public writeCharacteristicForService(serviceIdentifier: number,
                                       characteristicUUID: string,
                                       valueBase64: string,
                                       response: boolean,
                                       transactionId: string): Promise<Object> {
    let characteristic = this.getCharacteristicOrEmitErrorWithServiceId(serviceIdentifier, characteristicUUID);
    if (characteristic == null) {
      let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
      bleError.serviceUUID = serviceIdentifier.toString()
      bleError.characteristicUUID = characteristicUUID
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.writeCharacteristicForDevice(characteristic.getDeviceId(), characteristic.getServiceUUID(),
      characteristicUUID, valueBase64, response, transactionId);
  }

  /**
   * @description Write value to characteristic.
   */
  public writeCharacteristic(characteristicIdentifier: number,
                             valueBase64: string,
                             response: boolean,
                             transactionId: string): Promise<Object> {
    let characteristic = this.getCharacteristicOrEmitErrorWithCharId(characteristicIdentifier)
    if (characteristic == null) {
      let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
      bleError.characteristicUUID = characteristicIdentifier.toString()
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.writeCharacteristicForDevice(characteristic.getDeviceId(), characteristic.getServiceUUID(),
      characteristic.getUuid(), valueBase64, response, transactionId);
  }

  /**
   * @description Setup monitoring of characteristic value.
   */
  public monitorCharacteristicForDevice(deviceIdentifier: string,
                                        serviceUUID: string,
                                        characteristicUUID: string,
                                        transactionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceIdentifier);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let characteristic =
        this.getCharacteristicOrEmitErrorWithDeviceId(deviceIdentifier, serviceUUID, characteristicUUID);
      if (!characteristic) {
        let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      device.clientDevice.setCharacteristicChangeNotification(characteristic.gattCharacteristic, true).then(value => {
        this.dispatchEvent(BleEvent.readEvent, [null, characteristic.asJSObject(), transactionId]);
        resolve();
      }).catch(err => {
        let bleError = new BleError(BleErrorCode.CharacteristicNotifyChangeFailed, err.message, null);
        bleError.deviceID = deviceIdentifier
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        this.dispatchEvent(BleEvent.readEvent, [this.errorConverter.toJs(bleError), null, transactionId]);
        reject(this.errorConverter.toJs(bleError));
      });
    });
  }

  /**
   * @description Setup monitoring of characteristic value.
   */
  public monitorCharacteristicForService(serviceIdentifier: number,
                                         characteristicUUID: string,
                                         transactionId: string): Promise<void> {
    let characteristic = this.getCharacteristicOrEmitErrorWithServiceId(serviceIdentifier, characteristicUUID);
    if (characteristic == null) {
      let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
      bleError.serviceUUID = serviceIdentifier.toString()
      bleError.characteristicUUID = characteristicUUID
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.monitorCharacteristicForDevice(characteristic.getDeviceId(), characteristic.getServiceUUID(),
      characteristicUUID, transactionId);
  }

  /**
   * @description Setup monitoring of characteristic value.
   */
  public monitorCharacteristic(characteristicIdentifier: number,
                               transactionId: string): Promise<void> {
    let characteristic = this.getCharacteristicOrEmitErrorWithCharId(characteristicIdentifier)
    if (characteristic == null) {
      let bleError = new BleError(BleErrorCode.CharacteristicNotFound, 'The characteristic does not exist.', null);
      bleError.characteristicUUID = characteristicIdentifier.toString()
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.monitorCharacteristicForDevice(characteristic.getDeviceId(), characteristic.getServiceUUID(),
      characteristic.getUuid(), transactionId);
  }

  // Mark: Characteristics operations ---------------------------------------------------------------------------------

  /**
   * @description Read value to descriptor.
   */
  public readDescriptorForDevice(deviceId: string,
                                 serviceUUID: string,
                                 characteristicUUID: string,
                                 descriptorUUID: string,
                                 transactionId: string): Promise<Object> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceId);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceId
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        bleError.descriptorUUID = descriptorUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let descriptor = this.getDescriptorWithDeviceId(deviceId, serviceUUID, characteristicUUID, descriptorUUID);
      if (descriptor == null) {
        let bleError = new BleError(BleErrorCode.DescriptorNotFound, 'The descriptor does not exist.', null);
        bleError.deviceID = deviceId
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        bleError.descriptorUUID = descriptorUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      device.clientDevice.readDescriptorValue(descriptor.getNativeDescriptor()).then(value => {
        descriptor.setValue(value.descriptorValue);
        let newDes = Descriptor.constructorWithOther(descriptor);
        resolve(newDes.asJSObject());
      }).catch(err => {
        let bleError = new BleError(BleErrorCode.DescriptorReadFailed, err.message, null);
        bleError.deviceID = deviceId
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        bleError.descriptorUUID = descriptorUUID
        reject(this.errorConverter.toJs(bleError));
      });
    });
  }

  /**
   * @description Read value to descriptor.
   */
  public readDescriptorForService(serviceIdentifier: number,
                                  characteristicUUID: string,
                                  descriptorUUID: string,
                                  transactionId: string): Promise<Object> {
    let descriptor = this.getDescriptorWithServiceId(serviceIdentifier, characteristicUUID, descriptorUUID);
    if (descriptor == null) {
      let bleError = new BleError(BleErrorCode.DescriptorNotFound, 'The descriptor does not exist.', null);
      bleError.serviceUUID = serviceIdentifier.toString()
      bleError.characteristicUUID = characteristicUUID
      bleError.descriptorUUID = descriptorUUID
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.readDescriptorForDevice(descriptor.getDeviceId(), descriptor.getServiceUuid(), characteristicUUID,
      descriptorUUID, transactionId);
  }


  /**
   * @description Read value to descriptor.
   */
  public readDescriptorForCharacteristic(characteristicIdentifier: number,
                                         descriptorUUID: string,
                                         transactionId: string): Promise<Object> {
    let descriptor = this.getDescriptorWithCharId(characteristicIdentifier, descriptorUUID);
    if (descriptor == null) {
      let bleError = new BleError(BleErrorCode.DescriptorNotFound, 'The descriptor does not exist.', null);
      bleError.characteristicUUID = characteristicIdentifier.toString()
      bleError.descriptorUUID = descriptorUUID
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.readDescriptorForDevice(descriptor.getDeviceId(), descriptor.getServiceUuid(),
      descriptor.getCharacteristicUuid(), descriptorUUID, transactionId);
  }

  /**
   * @description Read value to descriptor.
   */
  public readDescriptor(descriptorIdentifier: number,
                        transactionId: string): Promise<Object> {
    let descriptor = this.discoveredDescriptors.get(descriptorIdentifier);
    if (descriptor == null) {
      let bleError = new BleError(BleErrorCode.DescriptorNotFound, 'The descriptor does not exist.', null);
      bleError.descriptorUUID = descriptor.getUuid();
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.readDescriptorForDevice(descriptor.getDeviceId(), descriptor.getServiceUuid(),
      descriptor.getCharacteristicUuid(),
      descriptor.getUuid(), transactionId);
  }

  /**
   * @description Read value to descriptor.
   */
  public writeDescriptorForDevice(deviceId: string,
                                  serviceUUID: string,
                                  characteristicUUID: string,
                                  descriptorUUID: string,
                                  valueBase64: string,
                                  transactionId: string): Promise<Object> {
    return new Promise((resolve, reject) => {
      let device = this.connectedDevices.get(deviceId);
      if (!device) {
        let bleError = new BleError(BleErrorCode.DeviceNotFound, 'The device is not connected.', null);
        bleError.deviceID = deviceId
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        bleError.descriptorUUID = descriptorUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      let descriptor = this.getDescriptorWithDeviceId(deviceId, serviceUUID, characteristicUUID, descriptorUUID);
      if (descriptor == null) {
        let bleError = new BleError(BleErrorCode.DescriptorNotFound, 'The descriptor does not exist.', null);
        bleError.deviceID = deviceId
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        bleError.descriptorUUID = descriptorUUID
        reject(this.errorConverter.toJs(bleError));
        return;
      }

      descriptor.getNativeDescriptor().descriptorValue = stringToArrayBuffer(valueBase64);

      device.clientDevice.writeDescriptorValue(descriptor.getNativeDescriptor()).then(value => {
        descriptor.setValue(descriptor.getNativeDescriptor().descriptorValue);
        let newDesc = Descriptor.constructorWithOther(descriptor)
        resolve(newDesc.asJSObject());
      }).catch(err => {
        let bleError = new BleError(BleErrorCode.DescriptorWriteFailed, err.message, null);
        bleError.deviceID = deviceId
        bleError.serviceUUID = serviceUUID
        bleError.characteristicUUID = characteristicUUID
        bleError.descriptorUUID = descriptorUUID
        reject(this.errorConverter.toJs(bleError));
      });
    });
  }

  /**
   * @description Read value to descriptor.
   */
  public writeDescriptorForService(serviceIdentifier: number,
                                   characteristicUUID: string,
                                   descriptorUUID: string,
                                   valueBase64: string,
                                   transactionId: string): Promise<Object> {
    let descriptor = this.getDescriptorWithServiceId(serviceIdentifier, characteristicUUID, descriptorUUID);
    if (descriptor == null) {
      let bleError = new BleError(BleErrorCode.DescriptorNotFound, 'The descriptor does not exist.', null);
      bleError.serviceUUID = serviceIdentifier.toString()
      bleError.characteristicUUID = characteristicUUID
      bleError.descriptorUUID = descriptorUUID
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.writeDescriptorForDevice(descriptor.getDeviceId(), descriptor.getServiceUuid(), characteristicUUID,
      descriptorUUID, valueBase64, transactionId);
  }

  /**
   * @description Read value to descriptor.
   */
  public writeDescriptorForCharacteristic(characteristicIdentifier: number,
                                          descriptorUUID: string,
                                          valueBase64: string,
                                          transactionId: string): Promise<Object> {
    let descriptor = this.getDescriptorWithCharId(characteristicIdentifier, descriptorUUID);
    if (descriptor == null) {
      let bleError = new BleError(BleErrorCode.DescriptorNotFound, 'The descriptor does not exist.', null);
      bleError.characteristicUUID = characteristicIdentifier.toString()
      bleError.descriptorUUID = descriptorUUID
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.writeDescriptorForDevice(descriptor.getDeviceId(), descriptor.getServiceUuid(),
      descriptor.getCharacteristicUuid(), descriptorUUID, valueBase64, transactionId);
  }

  /**
   * @description Read value to descriptor.
   */
  public writeDescriptor(descriptorIdentifier: number,
                         valueBase64: string,
                         transactionId: string): Promise<Object> {
    let descriptor = this.discoveredDescriptors.get(descriptorIdentifier);
    if (descriptor == null) {
      let bleError = new BleError(BleErrorCode.DescriptorNotFound, 'The descriptor does not exist.', null);
      bleError.descriptorUUID = descriptorIdentifier.toString()
      return Promise.reject(this.errorConverter.toJs(bleError));
    }

    return this.writeDescriptorForDevice(descriptor.getDeviceId(), descriptor.getServiceUuid(),
      descriptor.getCharacteristicUuid(), descriptor.getUuid(), valueBase64, transactionId);
  }

  public cancelTransaction(transactionId: string): Promise<void> {
    let bleError = new BleError(BleErrorCode.UnknownError, null, null);
    return Promise.reject(this.errorConverter.toJs(bleError));
  }

  public setLogLevel(logLevel: string): Promise<string> {
    this.logLevel = logLevel;
    return this.getLogLevel();
  }

  public getLogLevel(): Promise<string> {
    return Promise.resolve(this.logLevel);
  }

  // Mark: Tools (Private) ------------------------------------------------------------------------------------

  private onStateChange(state: access.BluetoothState) {
    this.state().then(value => {
      this.dispatchEvent(BleEvent.stateChangeEvent, value);
    });
  }

  private getCharacteristicOrEmitErrorWithCharId(characteristicIdentifier: number): Characteristic | null {
    let characteristic = this.discoveredCharacteristics.get(characteristicIdentifier);
    return characteristic;
  }

  private getCharacteristicOrEmitErrorWithServiceId(serviceIdentifier: number,
                                                    characteristicUUID: string): Characteristic | null {
    let service = this.discoveredServices.get(serviceIdentifier);
    if (service == null) {
      return null;
    }

    let characteristic = service.getCharacteristicByUUID(characteristicUUID);
    return characteristic;
  }

  private getCharacteristicOrEmitErrorWithDeviceId(deviceId: string, serviceUUID: string,
                                                   characteristicUUID: string): Characteristic | null {
    let device = this.connectedDevices.get(deviceId);
    if (device == null) {
      return null;
    }

    let service = device.getServiceByUUID(serviceUUID);
    if (service == null) {
      return null;
    }

    let characteristic = service.getCharacteristicByUUID(characteristicUUID);
    if (characteristic == null) {
      return null;
    }

    return characteristic;
  }

  private getDescriptorWithCharId(characteristicIdentifier: number, descriptorUUID: string): Descriptor | null {
    let characteristic = this.discoveredCharacteristics.get(characteristicIdentifier);
    if (characteristic == null) {
      return null;
    }

    let descriptor = characteristic.getDescriptorByUUID(descriptorUUID);
    if (descriptor == null) {
      return null;
    }

    return descriptor;
  }

  private getDescriptorWithServiceId(serviceIdentifier: number, characteristicUUID: string,
                                     descriptorUUID: string): Descriptor | null {
    let service = this.discoveredServices.get(serviceIdentifier);
    if (service == null) {
      return null;
    }

    let characteristic = service.getCharacteristicByUUID(characteristicUUID);
    if (characteristic == null) {
      return null;
    }

    let descriptor = characteristic.getDescriptorByUUID(descriptorUUID);
    if (descriptor == null) {
      return null;
    }

    return descriptor;
  }

  private getDescriptorWithDeviceId(deviceId: string, serviceUUID: string, characteristicUUID: string,
                                    descriptorUUID: string): Descriptor | null {
    let device = this.connectedDevices.get(deviceId);
    if (device == null) {
      return null;
    }

    let service = device.getServiceByUUID(serviceUUID);
    if (service == null) {
      return null;
    }

    let characteristic = service.getCharacteristicByUUID(characteristicUUID);
    if (characteristic == null) {
      return null;
    }

    let descriptor = characteristic.getDescriptorByUUID(descriptorUUID);
    if (descriptor == null) {
      return null;
    }

    return descriptor;
  }
}
