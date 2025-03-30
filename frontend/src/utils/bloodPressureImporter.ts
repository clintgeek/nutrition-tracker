import { BloodPressureLog, BloodPressureLogInput } from '../services/bloodPressureService';
import Papa from 'papaparse';

interface RawBloodPressureCSV {
  Time: string;
  Reading: string;
  'Heart Rate': string;
  Category: string;
  Notes: string;
}

export const importBloodPressureLogsFromCSV = async (csvContent: string, existingLogs: BloodPressureLog[] = []): Promise<BloodPressureLogInput[]> => {
  return new Promise((resolve, reject) => {
    try {
      Papa.parse<string[]>(csvContent, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            console.log('CSV Parse Results:', {
              rowCount: results.data.length,
              errors: results.errors,
              firstRow: results.data[0]
            });

            const bloodPressureLogs: BloodPressureLogInput[] = [];
            let currentDate: string | null = null;
            const existingDates = new Set(existingLogs.map(log => log.log_date));

            results.data.forEach((row: string[]) => {
              try {
                // Skip empty rows
                if (!row || row.length < 1) return;

                const firstCell = row[0]?.trim() || '';
                console.log(`Processing row:`, firstCell);

                // Skip the header row
                if (firstCell === 'Time') return;

                // Check if this is a date row (format: "Mar 22, 2025")
                if (firstCell.includes(',') && !firstCell.includes('AM') && !firstCell.includes('PM')) {
                  // Extract date from the format "Mar 22, 2025"
                  const dateStr = firstCell.trim();
                  const dateParts = dateStr.split(' ').map(part => part.trim());
                  if (dateParts.length === 3) {
                    const month = dateParts[0];
                    const day = parseInt(dateParts[1]);
                    const year = parseInt(dateParts[2]);

                    // Validate date components
                    if (isNaN(day) || isNaN(year) || day < 1 || day > 31 || year < 2000 || year > 2100) {
                      console.error('Invalid date components:', { month, day, year });
                      return;
                    }

                    const monthNum = getMonthNumber(month);
                    if (monthNum === -1) {
                      console.error('Invalid month:', month);
                      return;
                    }

                    // Create date string in YYYY-MM-DD format
                    currentDate = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                    // Validate the date string
                    const dateObj = new Date(currentDate);
                    if (isNaN(dateObj.getTime())) {
                      console.error('Invalid date string:', currentDate);
                      currentDate = null;
                      return;
                    }

                    console.log('Parsed date:', currentDate);
                  }
                  return;
                }

                // If we have a date and this is a blood pressure entry row
                if (currentDate && (firstCell.includes('AM') || firstCell.includes('PM'))) {
                  // Parse blood pressure reading (format: "128 Sys / 76 Dia")
                  const readingParts = row[1]?.trim().split(' / ') || [];
                  if (readingParts.length !== 2) {
                    console.error('Invalid blood pressure reading format:', row[1]);
                    return;
                  }

                  const systolic = parseInt(readingParts[0].split(' ')[0]);
                  const diastolic = parseInt(readingParts[1].split(' ')[0]);

                  if (isNaN(systolic) || isNaN(diastolic)) {
                    console.error('Invalid blood pressure values:', { systolic, diastolic });
                    return;
                  }

                  // Parse heart rate (format: "74 bpm")
                  const pulseStr = row[2]?.trim().split(' ')[0] || '';
                  const pulse = pulseStr ? parseInt(pulseStr) : undefined;

                  // Create notes with category if available
                  const category = row[3]?.trim();
                  const notes = row[4]?.trim();
                  const combinedNotes = [
                    category && category !== '--' ? `Category: ${category}` : null,
                    notes && notes !== '--' && notes !== '""' ? notes : null
                  ].filter(Boolean).join(' | ');

                  const bloodPressureLog: BloodPressureLogInput = {
                    systolic,
                    diastolic,
                    pulse,
                    log_date: currentDate,
                    notes: combinedNotes || undefined
                  };

                  console.log('Created blood pressure log:', bloodPressureLog);
                  bloodPressureLogs.push(bloodPressureLog);
                }
              } catch (error) {
                console.error('Error processing row:', row, error);
              }
            });

            if (bloodPressureLogs.length === 0) {
              throw new Error('No valid blood pressure logs found in the file');
            }

            // Sort logs by date (newest first)
            bloodPressureLogs.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

            console.log('Final blood pressure logs:', bloodPressureLogs);
            resolve(bloodPressureLogs);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            reject(new Error(`Failed to parse CSV: ${errorMessage}`));
          }
        },
        error: (error: Error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      reject(new Error(`Failed to process CSV: ${errorMessage}`));
    }
  });
};

const getMonthNumber = (month: string): number => {
  const months: { [key: string]: number } = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  return months[month.trim()] ?? -1;
};