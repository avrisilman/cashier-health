import { Platform } from 'react-native';

let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;

export interface PrinterDevice {
  name: string;
  address: string;
}

export interface ReceiptData {
  storeName: string;
  storePhone: string;
  orderId: string;
  dateTime: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
}

class BluetoothPrinterService {
  async isBluetoothEnabled(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    return false;
  }

  async enableBluetooth(): Promise<void> {
    throw new Error('Bluetooth printer requires native build. Please build the app for iOS/Android to use this feature.');
  }

  async scanDevices(): Promise<PrinterDevice[]> {
    if (Platform.OS === 'web') {
      return [];
    }

    return [];
  }

  async connectToPrinter(address: string): Promise<void> {
    throw new Error('Bluetooth printer requires native build. Please build the app for iOS/Android to use this feature.');
  }

  async printReceipt(data: ReceiptData): Promise<void> {
    throw new Error('Bluetooth printer requires native build. Please build the app for iOS/Android to use this feature.');
  }
}

export default new BluetoothPrinterService();
