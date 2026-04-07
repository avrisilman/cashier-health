import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Settings as SettingsIcon,
  User,
  Store,
  LogOut,
  ChevronRight,
  Info,
  CloudUpload,
  Bluetooth,
  Save,
  X,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, store, signOut } = useAuth();
  const [showStoreInfo, setShowStoreInfo] = useState(false);
  const [showPrinter, setShowPrinter] = useState(false);
  const [storeName, setStoreName] = useState(store?.name || '');
  const [ownerName, setOwnerName] = useState(store?.owner_name || '');
  const [phoneNumber, setPhoneNumber] = useState(store?.phone_number || '');
  const [syncLoading, setSyncLoading] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleSync = () => {
    setSyncLoading(true);
    setTimeout(() => {
      setSyncLoading(false);
      Alert.alert(
        'Sync Complete',
        'All pending transactions have been synced to the cloud.',
        [{ text: 'OK' }]
      );
    }, 2000);
  };

  const handlePrinterSetup = () => {
    Alert.alert(
      'Printer Setup',
      'Searching for available Bluetooth printers...',
      [
        {
          text: 'No Printer Found',
          onPress: () => {
            Alert.alert(
              'Info',
              'Please make sure your Bluetooth printer is enabled and in pairing mode.'
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About POS System',
      'Version 1.0.0\n\nA professional point of sale system for your business.\n\nPowered by YourBrand',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <SettingsIcon size={24} color={Colors.primary} />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.card}>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <User size={32} color={Colors.primary} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{store?.owner_name}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Store size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Store Information</Text>
                  <Text style={styles.menuItemSubtitle}>{store?.name}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <User size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Contact</Text>
                  <Text style={styles.menuItemSubtitle}>
                    {store?.phone_number}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store Management</Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowStoreInfo(true)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Store size={20} color={Colors.primary} />
                </View>
                <Text style={styles.menuItemTitle}>Edit Store Info</Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.menuItem, syncLoading && styles.syncLoading]}
              onPress={handleSync}
              disabled={syncLoading}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <CloudUpload size={20} color={Colors.primary} />
                </View>
                <Text style={styles.menuItemTitle}>
                  {syncLoading ? 'Syncing...' : 'Sync to Cloud'}
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handlePrinterSetup}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Bluetooth size={20} color={Colors.primary} />
                </View>
                <Text style={styles.menuItemTitle}>Bluetooth Printer</Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Info size={20} color={Colors.primary} />
                </View>
                <Text style={styles.menuItemTitle}>About POS System</Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color={Colors.white} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      <Modal
        visible={showStoreInfo}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStoreInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Store Information</Text>
              <TouchableOpacity onPress={() => setShowStoreInfo(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Store Name</Text>
                <TextInput
                  style={styles.input}
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder="Enter store name"
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Owner Name</Text>
                <TextInput
                  style={styles.input}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Enter owner name"
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter phone number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  Alert.alert('Success', 'Store information updated successfully');
                  setShowStoreInfo(false);
                }}
              >
                <Save size={20} color={Colors.white} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
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
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  menuItemSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  syncLoading: {
    opacity: 0.6,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    ...Shadows.small,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.white,
  },
  version: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '80%',
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
  modalContent: {
    paddingHorizontal: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    ...Shadows.small,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.white,
  },
});
