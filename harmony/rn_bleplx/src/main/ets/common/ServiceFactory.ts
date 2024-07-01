import ble from '@ohos.bluetooth.ble';
import { InstanceIdGenerator } from './InstanceIdGenerator';
import { IdGenerator } from './IdGenerator';
import { IdGeneratorKey } from './IdGeneratorKey';
import { Service } from '../Service';

export class ServiceFactory {
  create(deviceId: string, btGattService: ble.GattService): Service {
    const id = IdGenerator.getIdForKey(new IdGeneratorKey(deviceId, btGattService.serviceUuid,
      InstanceIdGenerator.generateInstanceId(btGattService.serviceUuid)));
    return new Service(id, deviceId, btGattService);
  }
}
