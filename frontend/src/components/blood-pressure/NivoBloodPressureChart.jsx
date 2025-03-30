import React, { useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';

const NivoBloodPressureChart = ({ data, timeSpan }) => {
  // Process data based on time span - calculate weekly averages for longer spans
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [
        {
          id: 'Systolic',
          data: []
        },
        {
          id: 'Diastolic',
          data: []
        }
      ];
    }

    // Make a copy and sort by date (newest first)
    let processedData = [...data];
    processedData.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

    // For longer time spans, we'll show weekly averages
    if (['6M', '1Y', 'ALL'].includes(timeSpan) && processedData.length > 0) {
      // Sort logs by date (oldest first for grouping)
      processedData.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

      // Group logs by week
      const weeklyData = [];

      // Process each log
      processedData.forEach(log => {
        const logDate = new Date(log.log_date);
        // Find or create the week for this log
        const weekStart = new Date(logDate);
        // Set to the start of the week (Sunday)
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day);
        // Reset hours to start of day
        weekStart.setHours(0, 0, 0, 0);

        // Find the week in our data or create a new entry
        let weekData = weeklyData.find(w =>
          w.weekStart.getTime() === weekStart.getTime()
        );

        if (!weekData) {
          weekData = {
            weekStart,
            systolicSum: 0,
            systolicCount: 0,
            diastolicSum: 0,
            diastolicCount: 0
          };
          weeklyData.push(weekData);
        }

        // Add this log's data to the weekly totals
        if (log.systolic) {
          weekData.systolicSum += log.systolic;
          weekData.systolicCount++;
        }

        if (log.diastolic) {
          weekData.diastolicSum += log.diastolic;
          weekData.diastolicCount++;
        }
      });

      // Sort weeks chronologically
      weeklyData.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

      // Map weekly data to nivo format
      const systolicData = weeklyData.map(week => ({
        x: format(week.weekStart, 'MM/dd'),
        y: week.systolicCount > 0 ? Math.round(week.systolicSum / week.systolicCount) : null
      })).filter(d => d.y !== null);

      const diastolicData = weeklyData.map(week => ({
        x: format(week.weekStart, 'MM/dd'),
        y: week.diastolicCount > 0 ? Math.round(week.diastolicSum / week.diastolicCount) : null
      })).filter(d => d.y !== null);

      return [
        {
          id: 'Systolic',
          data: systolicData
        },
        {
          id: 'Diastolic',
          data: diastolicData
        }
      ];
    } else {
      // For shorter time spans, use all data points
      // Limit the number of points for better display
      let maxPoints;
      switch (timeSpan) {
        case '7D':
          maxPoints = 30;
          break;
        case '1M':
          maxPoints = 40;
          break;
        case '3M':
          maxPoints = 50;
          break;
        default:
          maxPoints = 60;
      }

      // Take the most recent logs
      const recentLogs = processedData.slice(0, maxPoints);

      // Sort by date (oldest to newest) for display
      recentLogs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

      // Format for nivo
      const systolicData = recentLogs.map(log => ({
        x: timeSpan === '7D' ? format(new Date(log.log_date), 'MM/dd HH:mm') : format(new Date(log.log_date), 'MM/dd'),
        y: log.systolic || null
      })).filter(d => d.y !== null);

      const diastolicData = recentLogs.map(log => ({
        x: timeSpan === '7D' ? format(new Date(log.log_date), 'MM/dd HH:mm') : format(new Date(log.log_date), 'MM/dd'),
        y: log.diastolic || null
      })).filter(d => d.y !== null);

      return [
        {
          id: 'Systolic',
          data: systolicData
        },
        {
          id: 'Diastolic',
          data: diastolicData
        }
      ];
    }
  }, [data, timeSpan]);

  // Calculate yScale based on data
  const yScale = useMemo(() => {
    if (!chartData || !chartData[0].data.length) {
      return { min: 60, max: 160 };
    }

    const allValues = [
      ...chartData[0].data.map(d => d.y || 0),
      ...chartData[1].data.map(d => d.y || 0)
    ].filter(val => val !== null && val !== 0);

    if (allValues.length === 0) {
      return { min: 60, max: 160 };
    }

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    // Add padding and ensure it includes normal BP range
    return {
      min: Math.max(Math.floor(minValue * 0.9), 60),
      max: Math.max(Math.ceil(maxValue * 1.1), 160)
    };
  }, [chartData]);

  if (!chartData[0].data.length && !chartData[1].data.length) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No blood pressure data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {['6M', '1Y', 'ALL'].includes(timeSpan) && (
        <Text style={styles.averageIndicator}>Weekly Averages</Text>
      )}
      <View style={styles.chartContainer}>
        <ResponsiveLine
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 60, left: 50 }}
          xScale={{ type: 'point' }}
          yScale={{
            type: 'linear',
            min: yScale.min,
            max: yScale.max
          }}
          colors={['#ff0000', '#0000ff']}
          lineWidth={2}
          pointSize={8}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          pointLabelYOffset={-12}
          useMesh={true}
          gridXValues={5}
          gridYValues={5}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: '',
            legendOffset: 36,
            legendPosition: 'middle',
            truncateTickAt: 0
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'mmHg',
            legendOffset: -40,
            legendPosition: 'middle',
            truncateTickAt: 0
          }}
          theme={{
            tooltip: {
              container: {
                background: 'white',
                color: 'black',
                fontSize: 12,
                borderRadius: 4,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
              }
            },
            grid: {
              line: {
                stroke: '#e0e0e0',
                strokeWidth: 1
              }
            },
            axis: {
              ticks: {
                text: {
                  fontSize: 10,
                  fill: '#666'
                }
              }
            }
          }}
          legends={[
            {
              anchor: 'top',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: -20,
              itemsSpacing: 30,
              itemDirection: 'left-to-right',
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 12,
              symbolShape: 'circle',
              symbolBorderColor: 'rgba(0, 0, 0, .5)',
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemBackground: 'rgba(0, 0, 0, .03)',
                    itemOpacity: 1
                  }
                }
              ]
            }
          ]}
          animate={true}
          motionConfig="gentle"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  chartContainer: {
    height: 280,
    width: '100%',
  },
  averageIndicator: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  noDataContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
  },
});

export default NivoBloodPressureChart;