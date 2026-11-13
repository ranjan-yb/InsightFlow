import { useQuery } from "@tanstack/react-query";
import {
  Database,
  Rows3,
  Columns3,
  AlertCircle,
  Upload,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";

import { Link } from "react-router-dom";

import { getDatasets } from "../../services/datasetService";
import { getDashboardSummary } from "../../services/analyticsService";

import StatCard from "../../components/ui/StatCard";

const Dashboard = () => {
  const {
    data: datasets = [],
    isLoading: datasetsLoading,
    isError: datasetsError,
  } = useQuery({
    queryKey: ["datasets"],
    queryFn: getDatasets,
  });

  const latestDataset = datasets[0];
  const latestDatasetId = latestDataset?.id;

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ["dashboard-summary", latestDatasetId],
    queryFn: () => getDashboardSummary(latestDatasetId),
    enabled: !!latestDatasetId,
  });

  if (datasetsLoading) {
    return (
      <div className="py-20 text-center text-slate-500">
        Loading dashboard...
      </div>
    );
  }

  if (datasetsError) {
    return (
      <div className="rounded-xl bg-red-50 p-5 text-red-600">
        Unable to load datasets. Please refresh the page.
      </div>
    );
  }

  const kpis = summary?.kpis;

  const formatNumber = (value) =>
    Number(value ?? 0).toLocaleString("en-IN");

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Overview
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor your datasets and analytics in one place.
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <Upload size={18} />
          Upload Dataset
        </Link>
      </div>

      {/* Empty State */}
      {datasets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FileSpreadsheet
            size={45}
            className="mx-auto text-slate-400"
          />

          <h2 className="mt-4 text-lg font-semibold text-slate-800">
            No datasets uploaded yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Upload your first CSV file to start analyzing your data.
          </p>

          <Link
            to="/upload"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Upload CSV
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              title="Total Datasets"
              value={formatNumber(datasets.length)}
              icon={Database}
              description="Your uploaded datasets"
            />

            <StatCard
              title="Total Records"
              value={
                summaryLoading
                  ? "..."
                  : summaryError
                    ? "—"
                    : formatNumber(kpis?.total_records)
              }
              icon={Rows3}
              description="Records in latest dataset"
            />

            <StatCard
              title="Total Columns"
              value={
                summaryLoading
                  ? "..."
                  : summaryError
                    ? "—"
                    : formatNumber(kpis?.total_columns)
              }
              icon={Columns3}
              description="Columns in latest dataset"
            />

            <StatCard
              title="Missing Values"
              value={
                summaryLoading
                  ? "..."
                  : summaryError
                    ? "—"
                    : formatNumber(kpis?.total_missing_values)
              }
              icon={AlertCircle}
              description="Missing cells in latest dataset"
            />

          </div>

          {/* Latest Dataset */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Latest Dataset
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your most recently uploaded CSV file.
                </p>
              </div>

              <Link
                to="/datasets"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all datasets →
              </Link>
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                  <FileSpreadsheet size={24} />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800">
                    {latestDataset.original_filename}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatNumber(latestDataset.total_rows)} rows ·{" "}
                    {formatNumber(latestDataset.total_columns)} columns
                  </p>
                </div>
              </div>

              <Link
                to="/datasets"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                View Dataset
              </Link>

            </div>

            {summaryError && (
              <p className="mt-4 text-sm text-red-500">
                Unable to load analytics for this dataset.
              </p>
            )}

          </div>

          {/* Recent Datasets */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Recent Datasets
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your recently uploaded files.
                </p>
              </div>

              <Link
                to="/datasets"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all →
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {datasets.slice(0, 5).map((dataset) => (
                <div
                  key={dataset.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet
                      size={20}
                      className="text-blue-600"
                    />

                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {dataset.original_filename}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatNumber(dataset.total_rows)} rows ·{" "}
                        {formatNumber(dataset.total_columns)} columns
                      </p>
                    </div>
                  </div>

                  <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    {dataset.status}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;