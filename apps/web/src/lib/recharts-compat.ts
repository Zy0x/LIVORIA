import type { ComponentType } from 'react';
import {
  Area as RechartsArea,
  AreaChart as RechartsAreaChart,
  Bar as RechartsBar,
  BarChart as RechartsBarChart,
  CartesianGrid as RechartsCartesianGrid,
  Cell as RechartsCell,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  Pie as RechartsPie,
  PieChart as RechartsPieChart,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
} from 'recharts';

const asChartComponent = <T>(component: T) => component as unknown as ComponentType<any>;

export const Area = asChartComponent(RechartsArea);
export const AreaChart = asChartComponent(RechartsAreaChart);
export const Bar = asChartComponent(RechartsBar);
export const BarChart = asChartComponent(RechartsBarChart);
export const CartesianGrid = asChartComponent(RechartsCartesianGrid);
export const Cell = asChartComponent(RechartsCell);
export const Line = asChartComponent(RechartsLine);
export const LineChart = asChartComponent(RechartsLineChart);
export const Pie = asChartComponent(RechartsPie);
export const PieChart = asChartComponent(RechartsPieChart);
export const ResponsiveContainer = asChartComponent(RechartsResponsiveContainer);
export const Tooltip = asChartComponent(RechartsTooltip);
export const XAxis = asChartComponent(RechartsXAxis);
export const YAxis = asChartComponent(RechartsYAxis);
