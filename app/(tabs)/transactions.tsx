import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, DollarSign, X, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Transaction, TransactionItem } from '@/types/database';

interface TransactionWithItems extends Transaction {
  transaction_items?: TransactionItem[];
}

export default function TransactionsScreen() {
  const { store } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithItems | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (store) {
      loadTransactions();
    }
  }, [store]);

  const loadTransactions = async () => {
    if (!store) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    if (data) {
      setTransactions(data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransactionItem = ({ item }: { item: TransactionWithItems }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => setSelectedTransaction(item)}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.orderId}>{item.order_id}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === 'Completed' ? styles.statusCompleted : styles.statusPending,
          ]}
        >
          {item.status === 'Completed' ? (
            <CheckCircle size={16} color={Colors.success} />
          ) : (
            <AlertCircle size={16} color={Colors.warning} />
          )}
          <Text
            style={[
              styles.statusText,
              item.status === 'Completed'
                ? styles.statusTextCompleted
                : styles.statusTextPending,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method</Text>
          <Text style={styles.detailValue}>{item.payment_method}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>${item.total.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Clock size={24} color={Colors.primary} />
        <Text style={styles.headerTitle}>Transaction History</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Clock size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>
              {loading ? 'Loading transactions...' : 'No transactions yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              Completed sales will appear here
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      />

      <Modal
        visible={selectedTransaction !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTransaction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity onPress={() => setSelectedTransaction(null)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <>
                <View style={styles.modalSection}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Order ID</Text>
                    <Text style={styles.modalValue}>
                      {selectedTransaction.order_id}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Date & Time</Text>
                    <Text style={styles.modalValue}>
                      {formatDate(selectedTransaction.created_at)}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Payment Method</Text>
                    <Text style={styles.modalValue}>
                      {selectedTransaction.payment_method}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Status</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        selectedTransaction.status === 'Completed'
                          ? styles.statusCompleted
                          : styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          selectedTransaction.status === 'Completed'
                            ? styles.statusTextCompleted
                            : styles.statusTextPending,
                        ]}
                      >
                        {selectedTransaction.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.itemsSection}>
                  <Text style={styles.sectionTitle}>Items</Text>
                  {selectedTransaction.transaction_items?.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.product_name}</Text>
                        <Text style={styles.itemQuantity}>
                          Qty: {item.quantity} × ${item.price.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.itemTotal}>
                        ${item.subtotal.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.summarySection}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>
                      ${selectedTransaction.subtotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax (11%)</Text>
                    <Text style={styles.summaryValue}>
                      ${selectedTransaction.tax.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      ${selectedTransaction.total.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </>
            )}
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
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  listContent: {
    padding: Spacing.lg,
  },
  transactionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  transactionDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: Colors.success,
  },
  statusTextPending: {
    color: Colors.warning,
  },
  transactionDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  detailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  totalAmount: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  modalValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  itemsSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  itemQuantity: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  itemTotal: {
    fontSize: FontSize.sm,
    fontWeight: 'bold',
    color: Colors.text,
  },
  summarySection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  totalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
