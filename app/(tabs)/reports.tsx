import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  ShoppingCart,
  Star,
  Calendar,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, TransactionItem, Product } from '@/types/database';

interface SalesData {
  totalSales: number;
  totalOrders: number;
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
}

export default function ReportsScreen() {
  const { store } = useAuth();
  const [salesData, setSalesData] = useState<SalesData>({
    totalSales: 0,
    totalOrders: 0,
    topProducts: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (store) {
      loadSalesData();
    }
  }, [store]);

  const loadSalesData = async () => {
    if (!store) return;

    setLoading(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString();

      const transactionsData = await AsyncStorage.getItem(`transactions_${store.id}`);
      const allTransactions = transactionsData ? JSON.parse(transactionsData) : [];

      const transactions = allTransactions.filter(
        (t: any) => t.status === 'Completed' && new Date(t.created_at) >= today
      );

      const totalSales = transactions?.reduce((sum: number, t: any) => sum + t.total, 0) || 0;
      const totalOrders = transactions?.length || 0;

      const itemMap = new Map<string, { quantity: number; revenue: number }>();

      transactions?.forEach((trans: any) => {
        trans.transaction_items?.forEach((item: TransactionItem) => {
          const existing = itemMap.get(item.product_id || item.product_name) || {
            quantity: 0,
            revenue: 0,
          };
          itemMap.set(item.product_id || item.product_name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.subtotal,
          });
        });
      });

      const productsData = await AsyncStorage.getItem(`products_${store.id}`);
      const products = productsData ? JSON.parse(productsData) : [];

      const topProducts = Array.from(itemMap.entries())
        .map(([productId, data]) => {
          const product = products?.find((p: Product) => p.id === productId);
          return {
            product: product || {
              id: productId,
              name: productId,
              sku: '',
              price: 0,
              stock: 0,
              category_id: null,
              store_id: store.id,
              image_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            quantity: data.quantity,
            revenue: data.revenue,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);

      setSalesData({
        totalSales,
        totalOrders,
        topProducts,
      });
    } catch (error) {
      console.error('Error loading sales data:', error);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSalesData();
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TrendingUp size={24} color={Colors.primary} />
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.dateContainer}>
          <Calendar size={16} color={Colors.textSecondary} />
          <Text style={styles.dateText}>Today's Performance</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardLarge]}>
            <View style={styles.statIcon}>
              <TrendingUp size={32} color={Colors.primary} />
            </View>
            <Text style={styles.statLabel}>Total Sales</Text>
            <Text style={styles.statValue}>
              {formatCurrency(salesData.totalSales)}
            </Text>
          </View>

          <View style={[styles.statCard, styles.statCardLarge]}>
            <View style={styles.statIcon}>
              <ShoppingCart size={32} color={Colors.secondary} />
            </View>
            <Text style={styles.statLabel}>Total Orders</Text>
            <Text style={styles.statValue}>{salesData.totalOrders}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Star size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Top 3 Selling Products</Text>
          </View>

          {salesData.topProducts.length > 0 ? (
            <View style={styles.topProductsList}>
              {salesData.topProducts.map((item: any, index: number) => (
                <View key={item.product.id} style={styles.topProductCard}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.productInfo}>
                      {item.quantity} sold
                    </Text>
                  </View>
                  <View style={styles.productStats}>
                    <Text style={styles.productRevenue}>
                      {formatCurrency(item.revenue)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No sales data yet</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Average Order Value</Text>
          </View>
          <View style={styles.avgCard}>
            <Text style={styles.avgValue}>
              {formatCurrency(
                salesData.totalOrders > 0
                  ? salesData.totalSales / salesData.totalOrders
                  : 0
              )}
            </Text>
            <Text style={styles.avgLabel}>per order</Text>
          </View>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  dateText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.medium,
  },
  statCardLarge: {
    minHeight: 160,
    justifyContent: 'center',
  },
  statIcon: {
    marginBottom: Spacing.md,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.text,
  },
  topProductsList: {
    gap: Spacing.sm,
  },
  topProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.small,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rankNumber: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  productInfo: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productRevenue: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.small,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  avgCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.small,
  },
  avgValue: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  avgLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
