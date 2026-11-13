
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Database,
  FileWarning,
  Rows3,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDatasetQuality } from "../../services/datasetService";

const formatNumber = (value) => {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
};

const StatCard = ({ title, value, icon: Icon, description }) => (
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

const EmptyState = ({ message }) => (
  <p className="py-8 text-center text-sm text-slate-500">{message}</p>
);

const DatasetQuality = () => {
  const { datasetId } = useParams();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dataset-quality", datasetId],
    queryFn: () => getDatasetQuality(datasetId),
    enabled: !!datasetId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Analyzing dataset quality...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle size={20} />
          <h2 className="font-semibold">Unable to load data quality</h2>
        </div>
        <p className="mt-2 text-sm text-red-600">
          {error?.response?.data?.detail || error.message || "Something went wrong."}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const columns = data?.columns || [];

  const missingChartData = columns
    .filter((column) => column.missing_count > 0)
    .map((column) => ({
      column: column.name,
      missing: column.missing_count,
    }));

  const numericColumns = columns.filter(
    (column) => column.data_type === "numeric" && column.statistics
  );

  const categoricalColumns = columns.filter(
    (column) => column.data_type === "categorical"
  );

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            to={`/datasets/${datasetId}/preview`}
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600"
          >
            <ArrowLeft size={16} />
            Back to preview
          </Link>

          <h1 className="text-2xl font-bold text-slate-900">
            Data Quality Analysis
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quality report for{" "}
            <span className="font-medium text-slate-700">{data.filename}</span>
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isFetching ? "Refreshing..." : "Refresh analysis"}
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Records"
          value={summary.total_rows}
          icon={Rows3}
          description="Rows in this dataset"
        />
        <StatCard
          title="Total Columns"
          value={summary.total_columns}
          icon={Database}
          description="Columns detected"
        />
        <StatCard
          title="Missing Values"
          value={summary.total_missing_values}
          icon={FileWarning}
          description="Empty or null cells"
        />
        <StatCard
          title="Total Outliers"
          value={summary.total_outliers}
          icon={BarChart3}
          description="Detected in numeric columns"
        />
      </div>

      {/* Duplicate and data type overview */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Exact Duplicates"
          value={summary.exact_duplicate_rows}
          icon={CopyIcon}
          description="Completely identical rows"
        />
        <StatCard
          title="Business Duplicates"
          value={summary.business_duplicate_rows}
          icon={AlertCircle}
          description="Duplicates based on business columns"
        />
        <StatCard
          title="Numeric Columns"
          value={summary.numeric_columns}
          icon={BarChart3}
          description={`${formatNumber(summary.categorical_columns)} categorical columns`}
        />
      </div>

      {/* Missing values chart */}
      <Section
        title="Missing Values by Column"
        description="Shows columns containing missing values."
      >
        {missingChartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={missingChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="column"
                  tick={{ fontSize: 12 }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="missing"
                  name="Missing values"
                  fill="#6366f1"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-emerald-600">
            <CheckCircle2 size={18} />
            No missing values found.
          </div>
        )}
      </Section>

      {/* Column profile */}
      <Section
        title="Column Profile"
        description="A detailed quality profile of every column in your dataset."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-212.5 text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Column</th>
                <th className="px-4 py-3">Data Type</th>
                <th className="px-4 py-3">Pandas Dtype</th>
                <th className="px-4 py-3">Missing</th>
                <th className="px-4 py-3">Missing %</th>
                <th className="px-4 py-3">Unique</th>
                <th className="px-4 py-3">Outliers</th>
              </tr>
            </thead>

            <tbody>
              {columns.map((column, index) => (
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
                  <td className="px-4 py-4 text-slate-600">
                    {column.pandas_dtype}
                  </td>
                  <td className="px-4 py-4">{formatNumber(column.missing_count)}</td>
                  <td className="px-4 py-4">
                    <span
                      className={
                        column.missing_percentage > 0
                          ? "font-medium text-amber-600"
                          : "text-emerald-600"
                      }
                    >
                      {formatNumber(column.missing_percentage)}%
                    </span>
                  </td>
                  <td className="px-4 py-4">{formatNumber(column.unique_values)}</td>
                  <td className="px-4 py-4">
                    <span className={column.outlier_count > 0 ? "text-amber-600" : "text-slate-600"}>
                      {formatNumber(column.outlier_count)}
                    </span>
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
        description="Statistical summary for all detected numeric columns."
      >
        {numericColumns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-187.5 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Column</th>
                  <th className="px-4 py-3">Minimum</th>
                  <th className="px-4 py-3">Maximum</th>
                  <th className="px-4 py-3">Mean</th>
                  <th className="px-4 py-3">Median</th>
                  <th className="px-4 py-3">Std. Deviation</th>
                </tr>
              </thead>
              <tbody>
                {numericColumns.map((column, index) => (
                  <tr
                    key={`${column.name}-${index}`}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 font-medium text-slate-800">
                      {column.name}
                    </td>
                    <td className="px-4 py-4">{formatNumber(column.statistics.minimum)}</td>
                    <td className="px-4 py-4">{formatNumber(column.statistics.maximum)}</td>
                    <td className="px-4 py-4">{formatNumber(column.statistics.mean)}</td>
                    <td className="px-4 py-4">{formatNumber(column.statistics.median)}</td>
                    <td className="px-4 py-4">{formatNumber(column.statistics.standard_deviation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No numeric columns were detected." />
        )}
      </Section>

      {/* Categorical analysis */}
      <Section
        title="Categorical Analysis"
        description="Most frequently occurring values in categorical columns."
      >
        {categoricalColumns.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {categoricalColumns.map((column, index) => (
              <div
                key={`${column.name}-${index}`}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    {column.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {formatNumber(column.unique_values)} unique values
                  </span>
                </div>

                {column.top_values?.length > 0 ? (
                  <div className="space-y-3">
                    {column.top_values.map((item, itemIndex) => (
                      <div
                        key={`${String(item.value)}-${itemIndex}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate text-slate-600">
                          {item.value ?? "Missing"}
                        </span>
                        <span className="shrink-0 font-medium text-slate-900">
                          {formatNumber(item.count)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No category values available." />
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No categorical columns were detected." />
        )}
      </Section>
    </div>
  );
};

const CopyIcon = ({ size = 19 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="8" y="8" width="13" height="13" rx="2" />
    <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
  </svg>
);

export default DatasetQuality;
