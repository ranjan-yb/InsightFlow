
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Database,
  FileSpreadsheet,
  Hash,
  RefreshCw,
  Rows3,
} from "lucide-react";

import { getDatasets } from "../../services/datasetService";
import { getDashboardSummary } from "../../services/analyticsService";

import ChartBuilder from "../../components/charts/ChartBuilder";

import GroupByAnalysis from "../../components/charts/GroupByAnalysis";
import DatasetFilter from "../../components/charts/DatasetFilter";

const formatNumber = (value) => {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
};

const StatCard = ({ title, value, description, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
        <Icon size={19} />
      </div>
    </div>

    <p className="mt-4 text-2xl font-bold text-slate-900">
      {formatNumber(value)}
    </p>

    <p className="mt-1 text-xs text-slate-500">{description}</p>
  </div>
);

const Section = ({ title, description, children }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
    </div>

    {children}
  </section>
);

const Analytics = () => {
  const [datasetId, setDatasetId] = useState("");

  // Fetch all datasets
  const {
    data: datasets = [],
    isLoading: datasetsLoading,
    isError: datasetsError,
  } = useQuery({
    queryKey: ["datasets"],
    queryFn: getDatasets,
  });

  // Select the latest dataset by default
  useEffect(() => {
    if (datasets.length > 0 && !datasetId) {
      setDatasetId(String(datasets[0].id));
    }
  }, [datasets, datasetId]);

  // Fetch analytics for the selected dataset
  const {
    data,
    isLoading: analyticsLoading,
    isError: analyticsError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard-summary", datasetId],
    queryFn: () => getDashboardSummary(datasetId),
    enabled: !!datasetId,
  });

  if (datasetsLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Loading datasets...</p>
      </div>
    );
  }

  if (datasetsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">
        Unable to load your datasets.
      </div>
    );
  }

  const overview = data?.overview;
  const kpis = data?.kpis;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-indigo-600">
            <Activity size={20} />
            <span className="text-sm font-semibold">Data Insights</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Analytics Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Explore your dataset through statistics and visual insights.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={!datasetId || isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          {isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Dataset selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Select Dataset
        </label>

        <select
          value={datasetId}
          onChange={(event) => setDatasetId(event.target.value)}
          className="w-full max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Choose a dataset</option>

          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.original_filename}
            </option>
          ))}
        </select>

        {data && (
          <p className="mt-3 text-xs text-slate-500">
            Currently analyzing:{" "}
            <span className="font-semibold text-slate-700">
              {data.filename}
            </span>
          </p>
        )}
      </div>

      {!datasetId ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileSpreadsheet
            size={36}
            className="mx-auto mb-3 text-slate-400"
          />
          <h2 className="font-semibold text-slate-800">
            No dataset available
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a CSV file to start exploring analytics.
          </p>
        </div>
      ) : analyticsLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <p className="text-sm text-slate-500">
            Generating analytics...
          </p>
        </div>
      ) : analyticsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">
            Unable to generate analytics
          </p>
          <p className="mt-2 text-sm text-red-600">
            {error?.response?.data?.detail || error.message}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Records"
              value={kpis?.total_records}
              description="Total rows in dataset"
              icon={Rows3}
            />

            <StatCard
              title="Total Columns"
              value={kpis?.total_columns}
              description="Available data fields"
              icon={Database}
            />

            <StatCard
              title="Missing Values"
              value={kpis?.total_missing_values}
              description="Empty or null cells"
              icon={Hash}
            />

            <StatCard
              title="Numeric Columns"
              value={kpis?.numeric_columns_count}
              description="Columns containing numbers"
              icon={BarChart3}
            />
          </div>

          {/* Dataset overview */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Categorical Columns
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {formatNumber(kpis?.categorical_columns_count)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Columns containing categories or text
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Dataset Size
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {formatNumber(
                  (overview?.total_rows || 0) *
                    (overview?.total_columns || 0)
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Total cells across rows and columns
              </p>
            </div>
          </div>

          {/* Column overview */}
          <Section
            title="Dataset Overview"
            description="Explore the structure and characteristics of your dataset."
          >
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Total Rows</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatNumber(overview?.total_rows)}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Total Columns</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatNumber(overview?.total_columns)}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Missing Values</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatNumber(overview?.total_missing_values)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-150 text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="px-4 py-3">Column Name</th>
                    <th className="px-4 py-3">Data Type</th>
                    <th className="px-4 py-3">Missing Values</th>
                    <th className="px-4 py-3">Unique Values</th>
                  </tr>
                </thead>

                <tbody>
                  {overview?.columns?.map((column, index) => (
                    <tr
                      key={`${column.name}-${index}`}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-medium text-slate-800">
                        {column.name}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          {column.data_type}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {formatNumber(column.missing_values)}
                      </td>

                      <td className="px-4 py-4">
                        {formatNumber(column.unique_values)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Numeric statistics */}
          <Section
            title="Numeric Statistics"
            description="Statistical measurements for each numeric column."
          >
            {overview?.numeric_columns?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-187.5 text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="px-4 py-3">Column</th>
                      <th className="px-4 py-3">Mean</th>
                      <th className="px-4 py-3">Median</th>
                      <th className="px-4 py-3">Minimum</th>
                      <th className="px-4 py-3">Maximum</th>
                      <th className="px-4 py-3">Sum</th>
                    </tr>
                  </thead>

                  <tbody>
                    {overview.numeric_columns.map((columnName) => {
                      const stats =
                        overview.numeric_statistics?.[columnName];

                      return (
                        <tr
                          key={columnName}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-4 py-4 font-medium text-slate-800">
                            {columnName}
                          </td>
                          <td className="px-4 py-4">
                            {formatNumber(stats?.mean)}
                          </td>
                          <td className="px-4 py-4">
                            {formatNumber(stats?.median)}
                          </td>
                          <td className="px-4 py-4">
                            {formatNumber(stats?.min)}
                          </td>
                          <td className="px-4 py-4">
                            {formatNumber(stats?.max)}
                          </td>
                          <td className="px-4 py-4">
                            {formatNumber(stats?.sum)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
            

              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No numeric columns found in this dataset.
              </p>
            )}
          </Section>

<ChartBuilder
  datasetId={datasetId}
  numericColumns={overview?.numeric_columns || []}
  categoricalColumns={overview?.categorical_columns || []}
/>
                
<GroupByAnalysis
  datasetId={datasetId}
  numericColumns={overview?.numeric_columns || []}
  categoricalColumns={overview?.categorical_columns || []}
/>

<DatasetFilter
  datasetId={datasetId}
  columns={overview?.columns || []}
/>
        </>
        
      )}
      
    </div>
  );
};

export default Analytics;
