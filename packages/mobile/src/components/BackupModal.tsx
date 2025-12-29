import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Button, Input, Card } from './ui';
import { useTheme } from '../hooks/useTheme';
import { backupService, BackupOptions } from '../services/backup';
import { Budget, Transaction } from '../types';
import * as Haptics from 'expo-haptics';

interface BackupModalProps {
  visible: boolean;
  onClose: () => void;
  budgets: Budget[];
  transactions: Transaction[];
  userId: string;
  mode: 'backup' | 'restore' | 'settings';
}

export const BackupModal: React.FC<BackupModalProps> = ({
  visible,
  onClose,
  budgets,
  transactions,
  userId,
  mode,
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [backupStatus, setBackupStatus] = useState<any>(null);

  // Get unique categories
  const availableCategories = Array.from(
    new Set([
      ...budgets.flatMap(b => b.groups.flatMap(g => g.categories.map(c => c.name))),
      ...transactions.map(t => t.categoryId)
    ])
  ).sort();

  useEffect(() => {
    if (visible && mode === 'settings') {
      loadBackupStatus();
    }
  }, [visible, mode]);

  const loadBackupStatus = async () => {
    try {
      const status = await backupService.getBackupStatus();
      setBackupStatus(status);
      setAutoBackupEnabled(status.autoBackupEnabled);
      if (status.frequency) {
        setBackupFrequency(status.frequency as 'daily' | 'weekly' | 'monthly');
      }
    } catch (error) {
      console.error('Failed to load backup status:', error);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const options: BackupOptions = {
        includeSettings,
        dateRange: startDate && endDate ? {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        } : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      };

      const result = await backupService.createFullBackup(budgets, transactions, userId, options);

      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Backup Created',
          `Your data has been backed up successfully. Backup size: ${(result.backupSize! / 1024).toFixed(1)} KB`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Backup Failed', result.error || 'An unknown error occurred.');
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Backup Error',
        error instanceof Error ? error.message : 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Alert.alert(
        'Restore Data',
        'This will replace your current data with the backup. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              const result = await backupService.restoreFromBackup();

              if (result.success) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Restore Complete',
                  `Restored: ${result.restored.budgets} budgets, ${result.restored.transactions} transactions, ${result.restored.settings} settings`,
                  [{ text: 'OK', onPress: onClose }]
                );
              } else {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                  'Restore Failed',
                  result.errors.join('\n') || 'An unknown error occurred.'
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Restore Error',
        error instanceof Error ? error.message : 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAutoBackupToggle = async (enabled: boolean) => {
    try {
      setAutoBackupEnabled(enabled);

      if (enabled) {
        await backupService.scheduleAutomaticBackup(backupFrequency);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await backupService.disableAutomaticBackup();
      }

      await loadBackupStatus();
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update backup settings.');
    }
  };

  const handleFrequencyChange = async (frequency: 'daily' | 'weekly' | 'monthly') => {
    try {
      setBackupFrequency(frequency);

      if (autoBackupEnabled) {
        await backupService.scheduleAutomaticBackup(frequency);
        await loadBackupStatus();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update backup frequency.');
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const renderBackupForm = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Include Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Options</Text>
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Include Settings</Text>
          <Switch
            value={includeSettings}
            onValueChange={setIncludeSettings}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.background}
          />
        </View>
      </View>

      {/* Date Range */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Date Range (Optional)</Text>
        <View style={styles.dateContainer}>
          <View style={styles.dateInput}>
            <Input
              placeholder="Start Date (YYYY-MM-DD)"
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
          <View style={styles.dateInput}>
            <Input
              placeholder="End Date (YYYY-MM-DD)"
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Categories ({selectedCategories.length} selected)
        </Text>
        <ScrollView style={styles.categoryContainer} nestedScrollEnabled>
          {availableCategories.map(category => (
            <Button
              key={category}
              title={category}
              onPress={() => toggleCategory(category)}
              variant={selectedCategories.includes(category) ? 'primary' : 'outline'}
              style={{ marginVertical: 2 }}
            />
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );

  const renderBackupSettings = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Backup Status */}
      {backupStatus && (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Backup Status</Text>
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Last Backup:</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>
              {backupStatus.lastBackup
                ? new Date(backupStatus.lastBackup).toLocaleDateString()
                : 'Never'
              }
            </Text>
          </View>
          {backupStatus.nextBackup && (
            <View style={styles.statusItem}>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Next Backup:</Text>
              <Text style={[styles.statusValue, { color: colors.text }]}>
                {new Date(backupStatus.nextBackup).toLocaleDateString()}
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Automatic Backup Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Automatic Backup</Text>
        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Enable Auto Backup</Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Automatically create backups on schedule
            </Text>
          </View>
          <Switch
            value={autoBackupEnabled}
            onValueChange={handleAutoBackupToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.background}
          />
        </View>

        {autoBackupEnabled && (
          <View style={styles.frequencyContainer}>
            <Text style={[styles.frequencyLabel, { color: colors.text }]}>Backup Frequency</Text>
            <View style={styles.frequencyButtons}>
              {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                <Button
                  key={freq}
                  title={freq.charAt(0).toUpperCase() + freq.slice(1)}
                  onPress={() => handleFrequencyChange(freq)}
                  variant={backupFrequency === freq ? 'primary' : 'outline'}
                  style={styles.frequencyButton}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const getTitle = () => {
    switch (mode) {
      case 'backup': return 'Create Backup';
      case 'restore': return 'Restore Data';
      case 'settings': return 'Backup Settings';
      default: return 'Backup & Restore';
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 20,
      margin: 20,
      maxHeight: '80%',
      width: '90%',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 10,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '500',
    },
    settingDescription: {
      fontSize: 14,
      marginTop: 4,
    },
    dateContainer: {
      flexDirection: 'row',
      gap: 10,
    },
    dateInput: {
      flex: 1,
    },
    categoryContainer: {
      maxHeight: 120,
    },
    statusItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    statusLabel: {
      fontSize: 14,
    },
    statusValue: {
      fontSize: 14,
      fontWeight: '500',
    },
    frequencyContainer: {
      marginTop: 16,
    },
    frequencyLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
    },
    frequencyButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    frequencyButton: {
      flex: 1,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },
    button: {
      flex: 1,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    loadingText: {
      marginLeft: 10,
      color: colors.text,
      fontSize: 16,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{getTitle()}</Text>

          {mode === 'backup' && renderBackupForm()}
          {mode === 'settings' && renderBackupSettings()}
          {mode === 'restore' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Select Backup File
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Choose a backup file to restore your data from. This will replace your current data.
              </Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>
                {mode === 'backup' ? 'Creating backup...' :
                 mode === 'restore' ? 'Restoring data...' : 'Processing...'}
              </Text>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <Button
                title="Cancel"
                onPress={onClose}
                variant="outline"
                style={styles.button}
              />
              {mode === 'backup' && (
                <Button
                  title="Create Backup"
                  onPress={handleCreateBackup}
                  variant="primary"
                  style={styles.button}
                />
              )}
              {mode === 'restore' && (
                <Button
                  title="Select & Restore"
                  onPress={handleRestoreBackup}
                  variant="primary"
                  style={styles.button}
                />
              )}
              {mode === 'settings' && (
                <Button
                  title="Done"
                  onPress={onClose}
                  variant="primary"
                  style={styles.button}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
