
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";


import {
  ArrowLeft,
  Database,
  Rows3,
  Columns3,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";

import { getDatasetPreview } from "../../services/datasetService";

import { BarChart3 } from "lucide-react";

const DatasetPreview = () => {
  const { datasetId } = useParams();

  const {
    data: dataset,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["dataset-preview", datasetId],
    queryFn: () => getDatasetPreview(datasetId),
    enabled: !!datasetId,
  });

  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500">
        Loading dataset preview...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-700">
          Unable to load dataset preview.
        </p>

        <p className="mt-2 text-sm text-red-600">
          {error?.response?.data?.detail || error?.message}
        </p>

        <Link
          to="/datasets"
          className="mt-4 inline-block text-sm font-medium text-red-700 underline"
        >
          Back to datasets
        </Link>
      </div>
    );
  }

  if (!dataset) return null;

  return (
    <div className="space-y-7">

      {/* Header */}

    <Link
  to={`/datasets/${datasetId}/quality`}
  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
>
  <BarChart3 size={17} />
  Analyze Data Quality
</Link>


      <div>
        <Link
          to="/datasets"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to datasets
        </Link>


        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                <FileSpreadsheet size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {dataset.filename}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Dataset ID: {dataset.dataset_id}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Total Records
            </p>
            <Rows3 className="text-blue-600" size={21} />
          </div>

          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            {dataset.total_rows.toLocaleString("en-IN")}
          </h2>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Total Columns
            </p>
            <Columns3 className="text-purple-600" size={21} />
          </div>

          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            {dataset.total_columns.toLocaleString("en-IN")}
          </h2>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Preview Records
            </p>
            <Database className="text-green-600" size={21} />
          </div>

          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            {dataset.preview.length.toLocaleString("en-IN")}
          </h2>
        </div>

      </div>

      {/* Column Information */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

        <h2 className="text-lg font-semibold text-slate-900">
          Column Information
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Names and data types detected in your CSV file.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {dataset.columns.map((column, index) => (
            <div
              key={`${column.name}-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="break-all text-sm font-semibold text-slate-800">
                {column.name}
              </p>

              <span className="mt-2 inline-block rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700">
                {column.dtype}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* CSV Data Preview */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            CSV Data Preview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Showing {dataset.preview.length} preview records.
          </p>
        </div>

        {dataset.preview.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No records available for preview.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left">

              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase text-slate-500">
                    #
                  </th>

                  {dataset.columns.map((column, index) => (
                    <th
                      key={`${column.name}-${index}`}
                      className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase text-slate-500"
                    >
                      {column.name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {dataset.preview.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="sticky left-0 bg-white px-5 py-4 text-xs font-medium text-slate-400">
                      {rowIndex + 1}
                    </td>

                    {dataset.columns.map((column, columnIndex) => {
                      const value = formatValue(row[column.name]);

                      return (
                        <td
                          key={`${column.name}-${columnIndex}`}
                          className="whitespace-nowrap px-5 py-4 text-sm text-slate-700"
                        >
                          {value === null ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                              <AlertCircle size={12} />
                              Missing
                            </span>
                          ) : (
                            value
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-6 py-4">
          <p className="text-xs text-slate-500">
            Previewing {dataset.preview.length} of{" "}
            {dataset.total_rows.toLocaleString("en-IN")} total records.
          </p>
        </div>

      </div>

    </div>
  );
};

export default DatasetPreview;
