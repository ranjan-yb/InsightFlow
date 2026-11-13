
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Database,
  Search,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

import { getDatasets } from "../../services/datasetService";



const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getStatusStyle = (status) => {
  const normalizedStatus = status?.toLowerCase();

  if (["completed", "success", "processed"].includes(normalizedStatus)) {
    return "bg-green-50 text-green-700";
  }

  if (["failed", "error"].includes(normalizedStatus)) {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
};

const Datasets = () => {
  const [search, setSearch] = useState("");

  const {
    data: datasets = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["datasets"],
    queryFn: getDatasets,
  });

  const filteredDatasets = datasets.filter((dataset) =>
    dataset.original_filename
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500">
        Loading datasets...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-700">
          Unable to load datasets.
        </p>
        <p className="mt-1 text-sm text-red-600">
          {error?.message}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            My Datasets
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and explore your uploaded CSV files.
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Upload size={18} />
          Upload Dataset
        </Link>
      </div>

      {/* Summary and Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
              <Database size={23} />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Total Datasets
              </p>
              <h2 className="text-2xl font-bold text-slate-900">
                {datasets.length.toLocaleString("en-IN")}
              </h2>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search datasets..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 sm:w-64"
              />
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={isFetching ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

        </div>
      </div>

      {/* Dataset List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="font-semibold text-slate-900">
            All Datasets
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your uploaded CSV files and their information.
          </p>
        </div>

        {filteredDatasets.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileSpreadsheet
              size={42}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 font-semibold text-slate-800">
              {search ? "No matching datasets" : "No datasets found"}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {search
                ? "Try searching with another filename."
                : "Upload your first CSV file to get started."}
            </p>

            {!search && (
              <Link
                to="/upload"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Upload size={16} />
                Upload CSV
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-187.5 text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Dataset</th>
                  <th className="px-6 py-4 font-semibold">Rows</th>
                  <th className="px-6 py-4 font-semibold">Columns</th>
                  <th className="px-6 py-4 font-semibold">File Size</th>
                  <th className="px-6 py-4 font-semibold">Uploaded</th>
                  <th className="px-6 py-4 font-semibold">Status</th>

                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredDatasets.map((dataset) => (
                  <tr
                    key={dataset.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                          <FileSpreadsheet size={19} />
                        </div>

                        <div>
                          <p className="font-medium text-slate-800">
                            {dataset.original_filename}
                          </p>
                          <p className="text-xs text-slate-400">
                            ID: {dataset.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {(dataset.total_rows ?? 0).toLocaleString("en-IN")}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {dataset.total_columns ?? 0}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatFileSize(dataset.file_size)}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(dataset.created_at)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusStyle(dataset.status)}`}
                      >
                        {dataset.status || "Unknown"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
  <Link
    to={`/datasets/${dataset.id}/preview`}
    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
  >
    Preview
    <ArrowRight size={14} />
  </Link>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredDatasets.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
              Showing {filteredDatasets.length} of {datasets.length} datasets
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Datasets;
