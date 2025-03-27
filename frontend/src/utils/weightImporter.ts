import { WeightLog } from '../services/weightService';
import Papa from 'papaparse';

interface RawWeightLogCSV {
  Time: string;
  Weight: string;
  Change: string;
  BMI: string;
  'Body Fat': string;
  'Skeletal Muscle Mass': string;
  'Bone Mass': string;
  'Body Water': string;
}

export const importWeightLogsFromCSV = async (csvContent: string, existingLogs: WeightLog[] = []): Promise<WeightLog[]> => {
  return new Promise((resolve, reject) => {
    try {
      // Parse the CSV without headers since they're actually data rows
      Papa.parse(csvContent, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            console.log('CSV Parse Results:', {
              rowCount: results.data.length,
              errors: results.errors,
              firstRow: results.data[0]
            });

            // Process each row
            const weightLogs: WeightLog[] = [];
            let currentDate: string | null = null;
            const existingDates = new Set(existingLogs.map(log => log.log_date));

            results.data.forEach((row: string[], index: number) => {
              try {
                // Skip empty rows
                if (!row || row.length < 1) return;

                const firstCell = row[0]?.trim() || '';
                console.log(`Processing row ${index}:`, firstCell);

                // Skip the header row
                if (firstCell === 'Date') return;

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

                // If we have a date and this is a weight entry row
                if (currentDate && (firstCell.includes('AM') || firstCell.includes('PM'))) {
                  // Skip if we already have a log for this date
                  if (existingDates.has(currentDate)) {
                    console.log(`Skipping duplicate date: ${currentDate}`);
                    return;
                  }

                  // Parse time (format: "7:00 AM")
                  const timeParts = firstCell.split(' ');
                  const [hours, minutes] = timeParts[0].split(':');
                  const isPM = timeParts[1] === 'PM';
                  const hour24 = isPM ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12;

                  // Parse weight (format: "280.9 lbs")
                  const weightValue = parseFloat(row[1]?.trim().split(' ')[0] || '0');
                  if (isNaN(weightValue)) {
                    console.error('Invalid weight value:', row[1]);
                    return;
                  }

                  // Create notes with additional data if available
                  const notes = [
                    row[2] && row[2] !== '--' ? `Change: ${row[2]}` : null,
                    row[3] && row[3] !== '--' ? `BMI: ${row[3]}` : null,
                    row[4] && row[4] !== '--' ? `Body Fat: ${row[4]}` : null,
                    row[5] && row[5] !== '--' ? `Skeletal Muscle Mass: ${row[5]}` : null,
                    row[6] && row[6] !== '--' ? `Bone Mass: ${row[6]}` : null,
                    row[7] && row[7] !== '--' ? `Body Water: ${row[7]}` : null
                  ].filter(Boolean).join(' | ');

                  const weightLog: WeightLog = {
                    weight_value: weightValue,
                    log_date: currentDate,
                    notes: notes || undefined,
                    sync_id: crypto.randomUUID()
                  };

                  console.log('Created weight log:', weightLog);
                  weightLogs.push(weightLog);
                  existingDates.add(currentDate); // Add to set to prevent duplicates within the import
                }
              } catch (error) {
                console.error('Error processing row:', row, error);
              }
            });

            if (weightLogs.length === 0) {
              throw new Error('No valid weight logs found in the file');
            }

            // Sort logs by date (newest first)
            weightLogs.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

            console.log('Final weight logs:', weightLogs);
            resolve(weightLogs);
          } catch (error) {
            reject(new Error(`Failed to parse CSV: ${error.message}`));
          }
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    } catch (error) {
      reject(new Error(`Failed to process CSV: ${error.message}`));
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