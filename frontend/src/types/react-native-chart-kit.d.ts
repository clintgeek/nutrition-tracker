declare module 'react-native-chart-kit' {
  import React from 'react';
  import { ViewStyle } from 'react-native';

  export interface ChartConfig {
    backgroundColor?: string;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    color?: (opacity?: number) => string;
    labelColor?: (opacity?: number) => string;
    strokeWidth?: number;
    barPercentage?: number;
    useShadowColorFromDataset?: boolean;
    decimalPlaces?: number;
    style?: ViewStyle;
    propsForDots?: any;
    propsForBackgroundLines?: any;
    propsForLabels?: any;
  }

  export interface AbstractChartProps {
    width: number;
    height: number;
    chartConfig: ChartConfig;
    style?: ViewStyle;
    bezier?: boolean;
    withHorizontalLines?: boolean;
    withVerticalLines?: boolean;
    withDots?: boolean;
    withShadow?: boolean;
    withInnerLines?: boolean;
    withOuterLines?: boolean;
    withHorizontalLabels?: boolean;
    withVerticalLabels?: boolean;
    fromZero?: boolean;
    yAxisLabel?: string;
    yAxisSuffix?: string;
    xAxisLabel?: string;
    yAxisInterval?: number;
    formatYLabel?: (label: string) => string;
    formatXLabel?: (label: string) => string;
  }

  export interface PieChartProps {
    data: Array<{
      name: string;
      population: number;
      color: string;
      legendFontColor?: string;
      legendFontSize?: number;
    }>;
    width: number;
    height: number;
    chartConfig?: ChartConfig;
    accessor?: string;
    backgroundColor?: string;
    paddingLeft?: string;
    center?: [number, number];
    absolute?: boolean;
    hasLegend?: boolean;
    style?: ViewStyle;
  }

  export interface LineChartProps extends AbstractChartProps {
    data: {
      labels: string[];
      datasets: Array<{
        data: number[];
        color?: (opacity?: number) => string;
        strokeWidth?: number;
        strokeDashArray?: number[];
      }>;
      legend?: string[];
    };
    getDotColor?: (dataPoint: number, index: number) => string;
    renderDotContent?: (params: { x: number; y: number; index: number; indexData: number }) => React.ReactNode;
  }

  export class PieChart extends React.Component<PieChartProps> {}
  export class LineChart extends React.Component<LineChartProps> {}
  export class BarChart extends React.Component<AbstractChartProps> {}
  export class ProgressChart extends React.Component<AbstractChartProps> {}
  export class ContributionGraph extends React.Component<AbstractChartProps> {}
  export class StackedBarChart extends React.Component<AbstractChartProps> {}
}