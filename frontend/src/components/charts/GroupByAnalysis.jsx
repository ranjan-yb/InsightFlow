
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { getGroupByAnalysis } from "../../services/analyticsService";

const GroupByAnalysis = ({
  datasetId,
  numericColumns = [],
  categoricalColumns = [],
}) => {
  const [config, setConfig] = useState({
    group_by: "",
    metric: "",
    operation: "sum",
    sort_order: "desc",
    limit: 10,
  });

  // Set defaults after dataset columns load.
  useEffect(() => {
    setConfig((previous) => ({
      ...previous,
      group_by: categoricalColumns.includes(previous.group_by)
        ? previous.group_by
        : categoricalColumns[0] || "",
      metric: numericColumns.includes(previous.metric)
        ? previous.metric
        : numericColumns[0] || "",
    }));
  }, [datasetId, categoricalColumns, numericColumns]);

  const groupMutation = useMutation({
    mutationFn: (groupConfig) =>
      getGroupByAnalysis(datasetId, groupConfig),
  });

  const result = groupMutation.data;
  const results = result?.results || [];

  const handleChange = (event) => {
    const { name, value } = event.target;

    setConfig((previous) => ({
      ...previous,
      [name]: name === "limit" ? Number(value) : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    groupMutation.mutate(config);
  };

  if (!datasetId) return null;

  return (
    <section className="mt-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Group-by Analysis
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Compare aggregated metrics across different categories.
        </p>
      </div>

      {/* Configuration form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Group By
          </label>
          <select
            name="group_by"
            value={config.group_by}
            onChange={handleChange}
            required
            disabled={!categoricalColumns.length}
            className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500"
          >
            {categoricalColumns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Metric
          </label>
          <select
            name="metric"
            value={config.metric}
            onChange={handleChange}
            required
            disabled={!numericColumns.length}
            className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500"
          >
            {numericColumns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Operation
          </label>
          <select
            name="operation"
            value={config.operation}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500"
          >
            <option value="sum">Sum</option>
            <option value="mean">Average</option>
            <option value="count">Count</option>
            <option value="min">Minimum</option>
            <option value="max">Maximum</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Sort Order
          </label>
          <select
            name="sort_order"
            value={config.sort_order}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500"
          >
            <option value="desc">Highest First</option>
            <option value="asc">Lowest First</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Result Limit
          </label>
          <input
            type="number"
            name="limit"
            min="1"
            max="100"
            value={config.limit}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={
              groupMutation.isPending ||
              !config.group_by ||
              !config.metric
            }
            className="w-full rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {groupMutation.isPending
              ? "Analyzing..."
              : "Run Analysis"}
          </button>
        </div>
      </form>

      {/* Error state */}
      {groupMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {groupMutation.error?.response?.data?.detail ||
            "Unable to perform group-by analysis."}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">
              {result.metric} grouped by {result.group_by}
            </h3>
            <p className="mb-5 text-sm text-slate-500">
              Operation: {result.operation}
            </p>

            {results.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={results}
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="group" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    name={result.metric}
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                No grouped results found.
              </p>
            )}
          </div>

          {/* Results table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">
                Detailed Results
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Group</th>
                    <th className="px-5 py-3">Value</th>
                  </tr>
                </thead>

                <tbody>
                  {results.map((item, index) => (
                    <tr
                      key={`${item.group}-${index}`}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {item.group ?? "Missing"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {typeof item.value === "number"
                          ? new Intl.NumberFormat("en-IN", {
                              maximumFractionDigits: 2,
                            }).format(item.value)
                          : item.value ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!result && !groupMutation.isPending && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-700">
            Your analysis will appear here
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Configure your grouping options and run the analysis.
          </p>
        </div>
      )}

      {!categoricalColumns.length || !numericColumns.length ? (
        <p className="text-sm text-amber-600">
          This dataset needs at least one categorical column and one numeric
          column for this analysis.
        </p>
      ) : null}
    </section>
  );
};

export default GroupByAnalysis;
