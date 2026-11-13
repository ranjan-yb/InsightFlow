
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { generateChart } from "../../services/analyticsService";

const ChartBuilder = ({
  datasetId,
  numericColumns = [],
  categoricalColumns = [],
}) => {
  const [config, setConfig] = useState({
    chart_type: "bar",
    group_by: categoricalColumns[0] || "",
    metric: numericColumns[0] || "",
    aggregation: "sum",
    limit: 10,
    sort_order: "desc",
  });

  const chartMutation = useMutation({
    mutationFn: (chartConfig) =>
      generateChart(datasetId, chartConfig),
  });

  const chart = chartMutation.data;
  const chartData = chart?.data || [];

  const handleChange = (e) => {
    const { name, value } = e.target;

    setConfig((prev) => ({
      ...prev,
      [name]: name === "limit" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    chartMutation.mutate(config);
  };

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="flex h-72 items-center justify-center text-gray-400">
          No chart data available.
        </div>
      );
    }

    if (chart.chart_type === "pie") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={110}
              label
            />
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chart.chart_type === "line") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name={chart.y_axis || "Value"}
              stroke="#6366f1"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="value"
            name={chart.y_axis || "Value"}
            fill="#6366f1"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  if (!datasetId) {
    return null;
  }

  return (
    <section className="mt-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Chart Builder
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Create dynamic visualizations from your dataset.
        </p>
      </div>

      {/* Configuration */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Chart Type
          </label>
          <select
            name="chart_type"
            value={config.chart_type}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-indigo-500"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Group By
          </label>
          <select
            name="group_by"
            value={config.group_by}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-indigo-500"
          >
            {categoricalColumns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Numeric Metric
          </label>
          <select
            name="metric"
            value={config.metric}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-indigo-500"
          >
            {numericColumns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Aggregation
          </label>
          <select
            name="aggregation"
            value={config.aggregation}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-indigo-500"
          >
            <option value="sum">Sum</option>
            <option value="mean">Average</option>
            <option value="count">Count</option>
            <option value="min">Minimum</option>
            <option value="max">Maximum</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Sort Order
          </label>
          <select
            name="sort_order"
            value={config.sort_order}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-indigo-500"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Result Limit
          </label>
          <input
            type="number"
            name="limit"
            min="1"
            max="100"
            value={config.limit}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={
              chartMutation.isPending ||
              !config.group_by ||
              !config.metric
            }
            className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chartMutation.isPending
              ? "Generating Chart..."
              : "Generate Chart"}
          </button>
        </div>
      </form>

      {/* Error */}
      {chartMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {chartMutation.error?.response?.data?.detail ||
            "Unable to generate chart. Please check your configuration."}
        </div>
      )}

      {/* Chart */}
      {chart && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-gray-900">
              {chart.title}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {chart.x_axis} vs {chart.y_axis}
            </p>
          </div>

          {renderChart()}
        </div>
      )}

      {!chart && !chartMutation.isPending && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="font-medium text-gray-700">
            Your chart will appear here
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Select your chart settings and click Generate Chart.
          </p>
        </div>
      )}
    </section>
  );
};

export default ChartBuilder;
