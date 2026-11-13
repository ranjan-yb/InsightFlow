
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Database,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { getDatasets, exportDatasetExcel, exportDatasetPDF } from "../../services/datasetService";

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

const getErrorMessage = async (error) => {
  const responseData = error.response?.data;

  if (responseData instanceof Blob) {
    try {
      const parsed = JSON.parse(await responseData.text());
      return parsed.detail || "Something went wrong.";
    } catch {
      return "Unable to generate the report.";
    }
  }

  return responseData?.detail || error.message || "Something went wrong.";
};

const Reports = () => {
  const [datasetId, setDatasetId] = useState("");

  const {
    data: datasets = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["datasets"],
    queryFn: getDatasets,
  });

  useEffect(() => {
    if (datasets.length > 0 && !datasetId) {
      setDatasetId(String(datasets[0].id));
    }
  }, [datasets, datasetId]);

  const selectedDataset = datasets.find(
    (dataset) => String(dataset.id) === datasetId
  );

  const excelMutation = useMutation({
    mutationFn: () => exportDatasetExcel(datasetId),
    onSuccess: (blob) => {
      downloadBlob(blob, `insightflow_report_${datasetId}.xlsx`);
      toast.success("Excel report downloaded!");
    },
    onError: async (error) => {
      toast.error(await getErrorMessage(error));
    },
  });

  const pdfMutation = useMutation({
    mutationFn: () => exportDatasetPDF(datasetId),
    onSuccess: (blob) => {
      downloadBlob(blob, `insightflow_report_${datasetId}.pdf`);
      toast.success("PDF report downloaded!");
    },
    onError: async (error) => {
      toast.error(await getErrorMessage(error));
    },
  });

  const isExporting = excelMutation.isPending || pdfMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={28} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          Unable to load datasets. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-700"
        >
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Reports & Exports
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate and download professional reports from your datasets.
        </p>
      </div>

      {/* Dataset Selection */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Select Dataset
        </label>

        <select
          value={datasetId}
          onChange={(event) => setDatasetId(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 md:max-w-md"
        >
          <option value="">Choose a dataset</option>
          {datasets.map((dataset) => (
            <option key={dataset.id} value={String(dataset.id)}>
              {dataset.original_filename}
            </option>
          ))}
        </select>

        {selectedDataset && (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Total Rows</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {selectedDataset.total_rows?.toLocaleString() ?? "—"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Total Columns</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {selectedDataset.total_columns ?? "—"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">File Size</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {selectedDataset.file_size != null
                  ? `${(selectedDataset.file_size / 1024).toFixed(2)} KB`
                  : "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Export Options */}
      {datasets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Database className="mx-auto text-slate-400" size={36} />
          <h2 className="mt-4 font-semibold text-slate-800">
            No datasets available
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a CSV dataset before generating reports.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Excel Export */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FileSpreadsheet size={25} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Excel Report
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Download an organized Excel workbook containing dataset
              summary, column profiles, numeric statistics, and dataset data.
            </p>

            <button
              disabled={!datasetId || isExporting}
              onClick={() => excelMutation.mutate()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {excelMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {excelMutation.isPending
                ? "Generating Excel..."
                : "Download Excel"}
            </button>
          </div>

          {/* PDF Export */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <FileText size={25} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              PDF Report
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Generate a shareable PDF report containing dataset overview,
              column profiles, and numeric statistics.
            </p>

            <button
              disabled={!datasetId || isExporting}
              onClick={() => pdfMutation.mutate()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {pdfMutation.isPending
                ? "Generating PDF..."
                : "Download PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
