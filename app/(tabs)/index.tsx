import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Bell,
  Plus,
  ShoppingBag,
  Minus,
  Trash2,
  X,
  CreditCard,
  Wallet,
  Building2,
  CircleCheck as CheckCircle,
  ScanBarcode,
  Printer
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Category } from '@/types/database';
import BarcodeScanner from '@/components/BarcodeScanner';
import BluetoothPrinter from '@/services/BluetoothPrinter';

export default function CashierScreen() {
  const { store } = useAuth();
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, getCartTotal, getCartCount } =
    useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'Cash' | 'QRIS' | 'Bank Transfer'
  >('Cash');
  const [cashReceived, setCashReceived] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastTransactionData, setLastTransactionData] = useState<any>(null);

  useEffect(() => {
    if (store) {
      loadCategories();
      loadProducts();
    }
  }, [store]);

  const loadCategories = async () => {
    if (!store) return;

    try {
      const data = await AsyncStorage.getItem(`categories_${store.id}`);
      if (data) {
        setCategories(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    if (!store) return;

    setLoading(true);
    try {
      const data = await AsyncStorage.getItem(`products_${store.id}`);
      if (data) {
        const productsArray = JSON.parse(data);
        productsArray.sort((a: Product, b: Product) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setProducts(productsArray);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
    setLoading(false);
  };

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(
      (p) => p.sku.toLowerCase() === barcode.toLowerCase()
    );

    if (product) {
      if (product.stock > 0) {
        addToCart(product);
        Alert.alert('Success', `${product.name} added to cart`);
      } else {
        Alert.alert('Out of Stock', `${product.name} is currently out of stock`);
      }
    } else {
      Alert.alert('Product Not Found', `No product with SKU ${barcode} found`);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === 'All') {
      return matchesSearch;
    }

    const category = categories.find((c) => c.name === selectedCategory);
    return matchesSearch && product.category_id === category?.id;
  });

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    setShowCart(false);
    setShowCheckout(true);
  };

  const setQuickCash = (amount: number) => {
    setCashReceived(amount.toString());
  };

  const handleCompleteCheckout = async () => {
    if (!store) return;

    const subtotal = getCartTotal();
    const tax = subtotal * 0.11;
    const total = subtotal + tax;

    const orderNumber = `ORD-${Date.now()}`;
    const cashAmount = cashReceived ? parseFloat(cashReceived) : total;
    const changeAmount = selectedPaymentMethod === 'Cash' ? cashAmount - total : 0;

    try {
      const transactionId = `trans_${Date.now()}`;
      const transaction = {
        id: transactionId,
        order_id: orderNumber,
        subtotal,
        tax,
        total,
        payment_method: selectedPaymentMethod,
        status: 'Completed',
        sync_status: 'Pending',
        cash_received: cashAmount,
        change_amount: changeAmount,
        store_id: store.id,
        user_id: null,
        created_at: new Date().toISOString(),
      };

      const transactionItems = cart.map((item, index) => ({
        id: `item_${Date.now()}_${index}`,
        transaction_id: transactionId,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        subtotal: item.product.price * item.quantity,
      }));

      const transactionsData = await AsyncStorage.getItem(`transactions_${store.id}`);
      const transactions = transactionsData ? JSON.parse(transactionsData) : [];
      transactions.push({ ...transaction, transaction_items: transactionItems });
      await AsyncStorage.setItem(`transactions_${store.id}`, JSON.stringify(transactions));

      const productsData = await AsyncStorage.getItem(`products_${store.id}`);
      const productsArray = productsData ? JSON.parse(productsData) : [];

      for (const item of cart) {
        const productIndex = productsArray.findIndex((p: Product) => p.id === item.product.id);
        if (productIndex !== -1) {
          productsArray[productIndex].stock -= item.quantity;
          productsArray[productIndex].updated_at = new Date().toISOString();
        }
      }

      await AsyncStorage.setItem(`products_${store.id}`, JSON.stringify(productsArray));

      setLastTransactionData({
        storeName: store.name,
        storePhone: store.phone_number,
        orderId: orderNumber,
        dateTime: new Date().toLocaleString(),
        items: transactionItems,
        subtotal,
        tax,
        total,
        paymentMethod: selectedPaymentMethod,
        cashReceived: cashAmount,
        change: changeAmount,
      });

      setShowCheckout(false);
      setCashReceived('');
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        setShowReceipt(true);
        clearCart();
        loadProducts();
      }, 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to complete transaction');
      console.error(error);
    }
  };

  const handlePrintReceipt = async () => {
    if (!lastTransactionData) return;

    try {
      const isEnabled = await BluetoothPrinter.isBluetoothEnabled();

      if (!isEnabled) {
        Alert.alert(
          'Bluetooth Disabled',
          'Please enable Bluetooth to connect to the printer.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Enable',
              onPress: async () => {
                try {
                  await BluetoothPrinter.enableBluetooth();
                  handlePrintReceipt();
                } catch (error) {
                  Alert.alert('Error', 'Failed to enable Bluetooth');
                }
              },
            },
          ]
        );
        return;
      }

      const devices = await BluetoothPrinter.scanDevices();

      if (devices.length === 0) {
        Alert.alert(
          'No Printers Found',
          'No paired Bluetooth printers found. Please pair your printer in device settings.'
        );
        return;
      }

      Alert.alert(
        'Select Printer',
        'Choose a printer to connect',
        devices.map((device) => ({
          text: device.name,
          onPress: async () => {
            try {
              await BluetoothPrinter.connectToPrinter(device.address);
              await BluetoothPrinter.printReceipt(lastTransactionData);
              Alert.alert('Success', 'Receipt printed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to print receipt');
            }
          },
        })).concat([{ text: 'Cancel', onPress: async () => {} }])
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to access Bluetooth printer');
      console.error(error);
    }
  };

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    if (showSuccess) {
      scale.value = withSpring(1.2, { damping: 10 });
      setTimeout(() => {
        scale.value = withSpring(1);
      }, 500);
    }
  }, [showSuccess]);

  const subtotal = getCartTotal();
  const tax = subtotal * 0.11;
  const total = subtotal + tax;
  const change = cashReceived && parseFloat(cashReceived) >= total
    ? parseFloat(cashReceived) - total
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.storeName}>{store?.name || 'Store'}</Text>
          <Text style={styles.greeting}>Ready to sell</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <ScanBarcode size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products by name or SKU..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === 'All' && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory('All')}
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategory === 'All' && styles.categoryChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.name && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category.name)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category.name && styles.categoryChipTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productGrid}
        columnWrapperStyle={styles.productRow}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading products...' : 'No products found'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => item.stock > 0 && addToCart(item)}
          >
            <View style={styles.productImageContainer}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.productImage} />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <ShoppingBag size={32} color={Colors.textLight} />
                </View>
              )}
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.productStock}>Stock: {item.stock}</Text>
              <Text style={styles.productPrice}>
                ${item.price.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, item.stock === 0 && styles.addButtonDisabled]}
              onPress={() => addToCart(item)}
              disabled={item.stock === 0}
            >
              <Plus size={20} color={Colors.white} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      {cart.length > 0 && (
        <TouchableOpacity
          style={styles.floatingCartButton}
          onPress={() => setShowCart(true)}
        >
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{getCartCount()}</Text>
          </View>
          <ShoppingBag size={24} color={Colors.white} />
          <Text style={styles.floatingCartText}>${total.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />

      <Modal
        visible={showCart}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCart(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cartModal}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Shopping Cart</Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={cart}
              keyExtractor={(item) => item.product.id}
              renderItem={({ item }) => (
                <View style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemPrice}>
                      ${item.product.price.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.cartItemActions}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() =>
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                    >
                      <Minus size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() =>
                        updateQuantity(item.product.id, item.quantity + 1)
                      }
                    >
                      <Plus size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            <View style={styles.cartSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (11%)</Text>
                <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.cartFooter}>
              <TouchableOpacity
                style={styles.clearCartButton}
                onPress={() => {
                  Alert.alert(
                    'Clear Cart',
                    'Are you sure you want to clear the cart?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: () => {
                          clearCart();
                          setShowCart(false);
                        }
                      },
                    ]
                  );
                }}
              >
                <Trash2 size={20} color={Colors.error} />
                <Text style={styles.clearCartButtonText}>Clear Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
                <Text style={styles.checkoutButtonText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCheckout}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCheckout(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.checkoutModal}>
              <View style={styles.cartHeader}>
                <Text style={styles.cartTitle}>Payment Method</Text>
                <TouchableOpacity onPress={() => setShowCheckout(false)}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === 'Cash' && styles.paymentOptionActive,
                ]}
                onPress={() => setSelectedPaymentMethod('Cash')}
              >
                <Wallet size={24} color={selectedPaymentMethod === 'Cash' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.paymentOptionText, selectedPaymentMethod === 'Cash' && styles.paymentOptionTextActive]}>Cash</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === 'QRIS' && styles.paymentOptionActive,
                ]}
                onPress={() => setSelectedPaymentMethod('QRIS')}
              >
                <CreditCard size={24} color={selectedPaymentMethod === 'QRIS' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.paymentOptionText, selectedPaymentMethod === 'QRIS' && styles.paymentOptionTextActive]}>QRIS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === 'Bank Transfer' && styles.paymentOptionActive,
                ]}
                onPress={() => setSelectedPaymentMethod('Bank Transfer')}
              >
                <Building2 size={24} color={selectedPaymentMethod === 'Bank Transfer' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.paymentOptionText, selectedPaymentMethod === 'Bank Transfer' && styles.paymentOptionTextActive]}>Bank Transfer</Text>
              </TouchableOpacity>

              <View style={styles.checkoutSummary}>
                <Text style={styles.checkoutTotal}>Total: ${total.toFixed(2)}</Text>
              </View>

              {selectedPaymentMethod === 'Cash' && (
                <View style={styles.cashCalculator}>
                  <Text style={styles.calculatorLabel}>Cash Received</Text>
                  <TextInput
                    style={styles.cashInput}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textLight}
                    value={cashReceived}
                    onChangeText={setCashReceived}
                    keyboardType="decimal-pad"
                  />

                  <View style={styles.quickCashButtons}>
                    <TouchableOpacity
                      style={styles.quickCashButton}
                      onPress={() => setQuickCash(20)}
                    >
                      <Text style={styles.quickCashText}>$20</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickCashButton}
                      onPress={() => setQuickCash(50)}
                    >
                      <Text style={styles.quickCashText}>$50</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickCashButton}
                      onPress={() => setQuickCash(100)}
                    >
                      <Text style={styles.quickCashText}>$100</Text>
                    </TouchableOpacity>
                  </View>

                  {cashReceived && parseFloat(cashReceived) >= total ? (
                    <View style={styles.changeDisplay}>
                      <Text style={styles.changeLabel}>Change (Kembalian)</Text>
                      <Text style={styles.changeAmount}>
                        ${change.toFixed(2)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.completeButton,
                  selectedPaymentMethod === 'Cash' &&
                    (!cashReceived || parseFloat(cashReceived) < total) &&
                    styles.completeButtonDisabled,
                ]}
                onPress={handleCompleteCheckout}
                disabled={
                  selectedPaymentMethod === 'Cash' &&
                  (!cashReceived || parseFloat(cashReceived) < total)
                }
              >
                <Text style={styles.completeButtonText}>Complete Payment</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showSuccess}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSuccess(false)}
      >
        <View style={styles.successOverlay}>
          <Animated.View style={[styles.successModal, animatedStyle]}>
            <View style={styles.successIcon}>
              <CheckCircle size={64} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSubtitle}>Transaction completed</Text>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showReceipt}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReceipt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptModal}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Receipt</Text>
              <TouchableOpacity onPress={() => setShowReceipt(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.receiptContent}>
              {lastTransactionData && (
                <>
                  <Text style={styles.receiptStoreName}>{lastTransactionData.storeName}</Text>
                  <Text style={styles.receiptStoreInfo}>{lastTransactionData.storePhone}</Text>
                  <View style={styles.receiptDivider} />

                  <Text style={styles.receiptLabel}>Order: {lastTransactionData.orderId}</Text>
                  <Text style={styles.receiptLabel}>Date: {lastTransactionData.dateTime}</Text>
                  <View style={styles.receiptDivider} />

                  {lastTransactionData.items.map((item: any) => (
                    <View key={item.id} style={styles.receiptItem}>
                      <Text style={styles.receiptItemName}>{item.product_name}</Text>
                      <Text style={styles.receiptItemDetails}>
                        {item.quantity} x ${item.price.toFixed(2)} = ${item.subtotal.toFixed(2)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.receiptDivider} />

                  <View style={styles.receiptSummaryRow}>
                    <Text style={styles.receiptSummaryLabel}>Subtotal:</Text>
                    <Text style={styles.receiptSummaryValue}>${lastTransactionData.subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.receiptSummaryRow}>
                    <Text style={styles.receiptSummaryLabel}>Tax (11%):</Text>
                    <Text style={styles.receiptSummaryValue}>${lastTransactionData.tax.toFixed(2)}</Text>
                  </View>
                  <View style={styles.receiptSummaryRow}>
                    <Text style={styles.receiptTotalLabel}>Total:</Text>
                    <Text style={styles.receiptTotalValue}>${lastTransactionData.total.toFixed(2)}</Text>
                  </View>

                  <View style={styles.receiptDivider} />

                  <Text style={styles.receiptPaymentMethod}>Payment: {lastTransactionData.paymentMethod}</Text>
                  {lastTransactionData.paymentMethod === 'Cash' && (
                    <>
                      <Text style={styles.receiptLabel}>Cash: ${lastTransactionData.cashReceived.toFixed(2)}</Text>
                      <Text style={styles.receiptChange}>Change: ${lastTransactionData.change.toFixed(2)}</Text>
                    </>
                  )}

                  <Text style={styles.receiptThankYou}>Thank you for your purchase!</Text>
                </>
              )}
            </ScrollView>

            <View style={styles.receiptActions}>
              <TouchableOpacity
                style={styles.printButton}
                onPress={handlePrintReceipt}
              >
                <Printer size={20} color={Colors.white} />
                <Text style={styles.printButtonText}>Print Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowReceipt(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  storeName: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scanButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  categoryScroll: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    marginRight: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  productGrid: {
    padding: Spacing.md,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    margin: Spacing.xs,
    ...Shadows.small,
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    marginBottom: Spacing.sm,
  },
  productName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  productStock: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  productPrice: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  addButton: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  addButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  floatingCartButton: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    left: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.large,
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    left: Spacing.lg,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: 'bold',
    color: Colors.white,
  },
  floatingCartText: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  cartModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '80%',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cartTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cartItemPrice: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  deleteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  cartSummary: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryTotal: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryTotalLabel: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  summaryTotalValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  cartFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  clearCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  clearCartButtonText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.error,
  },
  checkoutButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.small,
  },
  checkoutButtonText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.white,
  },
  checkoutModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    minHeight: '90%',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  paymentOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  paymentOptionText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  paymentOptionTextActive: {
    color: Colors.primary,
  },
  checkoutSummary: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
  },
  checkoutTotal: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  cashCalculator: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calculatorLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  cashInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  quickCashButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickCashButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  quickCashText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.white,
  },
  changeDisplay: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  changeLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  changeAmount: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.success,
  },
  completeButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.small,
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.white,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successModal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.large,
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  receiptModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  receiptContent: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  receiptStoreName: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  receiptStoreInfo: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  receiptLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  receiptItem: {
    marginBottom: Spacing.md,
  },
  receiptItemName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  receiptItemDetails: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  receiptSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  receiptSummaryLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  receiptSummaryValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  receiptTotalLabel: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  receiptTotalValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  receiptPaymentMethod: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  receiptChange: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  receiptThankYou: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  receiptActions: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  printButtonText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.white,
  },
  doneButton: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
});
