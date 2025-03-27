import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { importWeightLogsFromCSV } from '../../utils/weightImporter';
import { weightService } from '../../services/weightService';
import { useWeightLogs } from '../../hooks/useWeightLogs';
import { Button, Text, useTheme } from 'react-native-paper';

interface WeightImportButtonProps {
  onImportComplete?: () => void;
}

export const WeightImportButton: React.FC<WeightImportButtonProps> = ({ onImportComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const { weightLogs, refetch } = useWeightLogs();
  const theme = useTheme();

  const handleFileSelect = async () => {
    try {
      setStatus('Selecting file...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true
      });

      if (result.assets && result.assets.length > 0) {
        setStatus('Reading file...');
        const file = result.assets[0];

        if (Platform.OS === 'web') {
          // Handle web file reading
          const response = await fetch(file.uri);
          const text = await response.text();
          await processFileContent(text);
        } else {
          // Handle native file reading
          const response = await fetch(file.uri);
          const text = await response.text();
          await processFileContent(text);
        }
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      setStatus('Error selecting file. Please try again.');
    }
  };

  const processFileContent = async (content: string) => {
    try {
      setStatus('Processing weight logs...');
      const newLogs = await importWeightLogsFromCSV(content, weightLogs || []);

      if (newLogs.length === 0) {
        setStatus('No new weight logs to import.');
        return;
      }

      setStatus(`Importing ${newLogs.length} weight logs...`);
      let importedCount = 0;

      for (const log of newLogs) {
        try {
          await weightService.addWeightLog(log);
          importedCount++;
          setProgress(Math.round((importedCount / newLogs.length) * 100));
          setStatus(`Imported ${importedCount} of ${newLogs.length} logs...`);
        } catch (error) {
          console.error('Error importing weight log:', error);
          setStatus(`Error importing log for ${log.log_date}. Continuing with others...`);
        }
      }

      setStatus(`Successfully imported ${importedCount} weight logs!`);
      await refetch();
      onImportComplete?.();
    } catch (error) {
      console.error('Error importing weight log:', error);
      setStatus('Error importing weight logs. Please try again.');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.helperText}>
        Import weight logs from Garmin Connect CSV export
      </Text>
      <Button
        mode="outlined"
        onPress={handleFileSelect}
        disabled={isLoading}
        style={styles.button}
        icon="file-import"
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.primary }]}>{status}</Text>
            {progress > 0 && (
              <Text style={[styles.progressText, { color: theme.colors.primary }]}>{progress}%</Text>
            )}
          </View>
        ) : (
          'Import from Garmin'
        )}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
  },
  progressText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
});