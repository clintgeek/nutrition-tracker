import React, { useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';

const NivoWeightChart = ({
  logs,
  timeSpan,
  startWeight,
  targetWeight
}) => {
  // Safe parsing of numeric values
  const safeParseFloat = (value) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Process the weights data
  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) {
      return [];
    }

    // Make a copy and sort by date (newest first)
    let processedLogs = [...logs];
    processedLogs.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

    // For longer time spans, we'll show weekly averages
    if (['3M', '1Y', 'Goal'].includes(timeSpan) && processedLogs.length > 0) {
      // Sort by date (oldest first for grouping)
      processedLogs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

      // Group logs by week
      const weeklyData = [];

      // Process each log
      processedLogs.forEach(log => {
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
            weightSum: 0,
            weightCount: 0
          };
          weeklyData.push(weekData);
        }

        // Add this log's weight to the weekly totals
        if (log.weight_value) {
          const weight = safeParseFloat(log.weight_value);
          if (weight > 0) {
            weekData.weightSum += weight;
            weekData.weightCount++;
          }
        }
      });

      // Sort weeks chronologically
      weeklyData.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

      // Map weekly data to nivo format (with weekly averages)
      const weightData = weeklyData.map(week => ({
        x: format(week.weekStart, 'MM/dd'),
        y: week.weightCount > 0 ? Math.round(week.weightSum / week.weightCount * 10) / 10 : null
      })).filter(d => d.y !== null);

      // Only add goal weight if we have it and it's in Goal timespan
      const results = [
        {
          id: 'Weight',
          data: weightData
        }
      ];

      // Add target weight line if in Goal mode
      if (timeSpan === 'Goal' && targetWeight) {
        const goalWeight = safeParseFloat(targetWeight);
        if (goalWeight > 0) {
          // Only add goal if we have weight data
          if (weightData.length > 0) {
            const goalData = weightData.map(point => ({
              x: point.x,
              y: goalWeight
            }));

            results.push({
              id: 'Goal',
              data: goalData,
              dashed: true
            });
          }
        }
      }

      return results;
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
        default:
          maxPoints = 60;
      }

      // Take the most recent logs
      const recentLogs = processedLogs.slice(0, maxPoints);

      // Sort by date (oldest to newest) for display
      recentLogs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

      // Format for nivo
      const weightData = recentLogs.map(log => {
        const weight = safeParseFloat(log.weight_value);
        return {
          x: timeSpan === '7D' ? format(new Date(log.log_date), 'MM/dd HH:mm') : format(new Date(log.log_date), 'MM/dd'),
          y: weight > 0 ? weight : null
        };
      }).filter(d => d.y !== null);

      // Only add goal weight if we have it and it's in Goal timespan
      const results = [
        {
          id: 'Weight',
          data: weightData
        }
      ];

      // Add target weight line if in Goal mode
      if (timeSpan === 'Goal' && targetWeight) {
        const goalWeight = safeParseFloat(targetWeight);
        if (goalWeight > 0) {
          // Only add goal if we have weight data
          if (weightData.length > 0) {
            const goalData = weightData.map(point => ({
              x: point.x,
              y: goalWeight
            }));

            results.push({
              id: 'Goal',
              data: goalData,
              dashed: true
            });
          }
        }
      }

      return results;
    }
  }, [logs, timeSpan, targetWeight]);

  // Calculate yScale based on data
  const yScale = useMemo(() => {
    if (!chartData || !chartData[0] || !chartData[0].data.length) {
      return { min: 100, max: 200 };
    }

    const allWeights = chartData[0].data.map(d => d.y || 0).filter(val => val > 0);

    if (allWeights.length === 0) {
      return { min: 100, max: 200 };
    }

    let minWeight = Math.min(...allWeights);
    let maxWeight = Math.max(...allWeights);

    // Include goal weight in scale calculation if present
    if (targetWeight) {
      const targetWeightValue = safeParseFloat(targetWeight);
      if (targetWeightValue > 0) {
        minWeight = Math.min(minWeight, targetWeightValue);
        maxWeight = Math.max(maxWeight, targetWeightValue);
      }
    }

    // Include starting weight in scale calculation if present
    if (startWeight) {
      const startWeightValue = safeParseFloat(startWeight);
      if (startWeightValue > 0) {
        minWeight = Math.min(minWeight, startWeightValue);
        maxWeight = Math.max(maxWeight, startWeightValue);
      }
    }

    // Add some padding to make the chart look better
    const padding = (maxWeight - minWeight) * 0.1;

    return {
      min: Math.max(Math.floor(minWeight - padding), 0),
      max: Math.ceil(maxWeight + padding)
    };
  }, [chartData, targetWeight, startWeight]);

  // Calculate trend for display
  const trend = useMemo(() => {
    if (!logs || logs.length < 2) {
      return { value: 0, isGain: false };
    }

    // Sort by date (oldest to newest)
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
    );

    const firstLog = sortedLogs[0];
    const lastLog = sortedLogs[sortedLogs.length - 1];

    if (!firstLog || !lastLog) {
      return { value: 0, isGain: false };
    }

    // Determine if weight trend should be treated as gain (bad) or loss (good)
    const isGain = targetWeight
      ? safeParseFloat(lastLog.weight_value) > safeParseFloat(targetWeight)
      : safeParseFloat(lastLog.weight_value) > safeParseFloat(firstLog.weight_value);

    const weightTrend = safeParseFloat(lastLog.weight_value) - safeParseFloat(firstLog.weight_value);

    return {
      value: Math.abs(weightTrend),
      isGain
    };
  }, [logs, targetWeight]);

  if (!chartData.length || !chartData[0].data.length) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No weight data available</Text>
      </View>
    );
  }

  // Determine colors based on trend
  const trendColor = trend.isGain ? '#FF3B30' : '#34C759';

  return (
    <View style={styles.container}>
      {['3M', '1Y', 'Goal'].includes(timeSpan) && (
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
          colors={[trendColor, '#8E8E93']}
          lineWidth={2}
          pointSize={8}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          pointLabelYOffset={-12}
          useMesh={true}
          enableArea={true}
          areaBaselineValue={yScale.min}
          areaOpacity={0.15}
          gridXValues={5}
          gridYValues={5}
          enableSlices="x"
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
            legend: 'kg',
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
          defs={[
            {
              id: 'gradientArea',
              type: 'linearGradient',
              colors: [
                { offset: 0, color: trendColor, opacity: 0.3 },
                { offset: 100, color: trendColor, opacity: 0 }
              ]
            }
          ]}
          fill={[
            { match: { id: 'Weight' }, id: 'gradientArea' }
          ]}
          layers={[
            'grid',
            'markers',
            'axes',
            'areas',
            'crosshair',
            'lines',
            'points',
            'slices',
            'mesh',
            'legends'
          ]}
          lineStyle={d => d.dashed ? { strokeDasharray: '6, 4' } : {}}
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

export default NivoWeightChart;