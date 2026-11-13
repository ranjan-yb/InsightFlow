
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Eraser,
  FileSpreadsheet,
  RefreshCw,
  Settings2,
} from "lucide-react";

import {
  getDatasets,
  cleanDataset,
  getCleaningHistory,
  getDatasetPreview,
  downloadCleanedDataset,
} from "../../services/datasetService";



const initialConfig = {
  numeric_missing: "keep",
  categorical_missing: "keep",
  datetime_missing: "keep",
  duplicate_strategy: "keep",
  duplicate_columns: [],
  normalize_column_names: false,
  outlier_strategy: "keep",
};

const SelectField = ({ label, value, onChange, options, description }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-slate-700">
      {label}
    </label>

    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>

    {description && (
      <p className="mt-1.5 text-xs text-slate-500">{description}</p>
    )}
  </div>
);

const ResultValue = ({ value }) => {
  if (value === null || value === undefined) return "—";

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const DataCleaning = () => {
  const queryClient = useQueryClient();

  const [datasetId, setDatasetId] = useState("");
  const [config, setConfig] = useState(initialConfig);

  const {
    data: datasets = [],
    isLoading: datasetsLoading,
  } = useQuery({
    queryKey: ["datasets"],
    queryFn: getDatasets,
  });

  const selectedDataset = datasets.find(
    (dataset) => String(dataset.id) === String(datasetId)
  );

  const { data: selectedPreview } = useQuery({
  queryKey: ["dataset-preview", datasetId],
  queryFn: () => getDatasetPreview(datasetId),
  enabled: !!datasetId && config.duplicate_strategy === "business",
});

  const {
    data: history = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["cleaning-history", datasetId],
    queryFn: () => getCleaningHistory(datasetId),
    enabled: !!datasetId,
  });

  const cleaningMutation = useMutation({
    mutationFn: () => cleanDataset(datasetId, config),

    onSuccess: (result) => {
      toast.success("Dataset cleaned successfully!");

      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      queryClient.invalidateQueries({
        queryKey: ["cleaning-history", datasetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dataset-preview", datasetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dataset-quality", datasetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-summary", datasetId],
      });

      setResult(result);
      refetchHistory();
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.detail || "Unable to clean this dataset."
      );
    },
  });

  const [result, setResult] = useState(null);

  const updateConfig = (key, value) => {
    setConfig((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleBusinessColumns = (event) => {
    const selected = Array.from(
      event.target.selectedOptions,
      (option) => option.value
    );

    updateConfig("duplicate_columns", selected);
  };

  const handleDownload = async () => {
    try {
      const response = await downloadCleanedDataset(datasetId);

      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `cleaned_${selectedDataset?.original_filename || "dataset.csv"}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Cleaned CSV downloaded!");
    } catch (error) {
      toast.error(
        error?.response?.data?.detail || "Unable to download cleaned CSV."
      );
    }
  };

  const handleReset = () => {
    setConfig(initialConfig);
    setResult(null);
    toast.success("Cleaning settings reset.");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!datasetId) {
      toast.error("Please select a dataset.");
      return;
    }


    if (
  config.duplicate_strategy === "business" &&
  config.duplicate_columns.length === 0
) {
  toast.error("Select at least one column for business duplicates.");
  return;
}

    setResult(null);
    cleaningMutation.mutate();
  };

  if (datasetsLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
        Loading datasets...
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-indigo-600">
          <Eraser size={21} />
          <span className="text-sm font-semibold">Data Preparation</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          Data Cleaning
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Configure cleaning operations and generate a cleaned version of your CSV.
        </p>
      </div>

      {/* Dataset selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Select Dataset
        </label>

        <select
          value={datasetId}
          onChange={(event) => {
            setDatasetId(event.target.value);
            setResult(null);
          }}
          className="w-full max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Choose a dataset</option>

          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.original_filename}
            </option>
          ))}
        </select>



        {selectedDataset && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Dataset ID: {selectedDataset.id}</span>
            <span>Rows: {selectedDataset.total_rows ?? "—"}</span>
            <span>Columns: {selectedDataset.total_columns ?? "—"}</span>
          </div>
        )}
      </div>

      {!datasetId ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileSpreadsheet className="mx-auto mb-3 text-slate-400" size={36} />
          <h2 className="font-semibold text-slate-800">
            Select a dataset to get started
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your cleaning configuration will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Configuration */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Cleaning Configuration
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose how different data-quality issues should be handled.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <SelectField
                  label="Numeric Missing Values"
                  value={config.numeric_missing}
                  onChange={(value) => updateConfig("numeric_missing", value)}
                  options={[
                    { value: "keep", label: "Keep unchanged" },
                    { value: "drop_rows", label: "Drop rows" },
                    { value: "mean", label: "Replace with mean" },
                    { value: "median", label: "Replace with median" },
                    { value: "zero", label: "Replace with zero" },
                  ]}
                  description="Example: age, salary, quantity."
                />

                <SelectField
                  label="Categorical Missing Values"
                  value={config.categorical_missing}
                  onChange={(value) => updateConfig("categorical_missing", value)}
                  options={[
                    { value: "keep", label: "Keep unchanged" },
                    { value: "drop_rows", label: "Drop rows" },
                    { value: "mode", label: "Replace with mode" },
                    { value: "unknown", label: 'Replace with "Unknown"' },
                  ]}
                  description="Example: city, category, department."
                />

                <SelectField
                  label="Datetime Missing Values"
                  value={config.datetime_missing}
                  onChange={(value) => updateConfig("datetime_missing", value)}
                  options={[
                    { value: "keep", label: "Keep unchanged" },
                    { value: "drop_rows", label: "Drop rows" },
                  ]}
                />

                <SelectField
                  label="Duplicate Rows"
                  value={config.duplicate_strategy}
                  onChange={(value) => updateConfig("duplicate_strategy", value)}
                  options={[
                    { value: "keep", label: "Keep all rows" },
                    { value: "exact", label: "Remove exact duplicates" },
                    { value: "business", label: "Remove business duplicates" },
                  ]}
                  description="Business duplicates can be based on selected columns."
                />

                <SelectField
                  label="Outlier Treatment"
                  value={config.outlier_strategy}
                  onChange={(value) => updateConfig("outlier_strategy", value)}
                  options={[
                    { value: "keep", label: "Keep outliers" },
                    { value: "remove_rows", label: "Remove rows with outliers" },
                    { value: "cap", label: "Cap outlier values" },
                  ]}
                  description="Uses the backend's existing IQR-based outlier logic."
                />
              </div>

              {/* Business duplicate columns */}
              {config.duplicate_strategy === "business" && (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-amber-900">
                    Business Duplicate Columns
                  </label>

                  {selectedPreview?.columns?.length > 0 ? (
                    <select
                      multiple
                      value={config.duplicate_columns}
                      onChange={handleBusinessColumns}
                      className="min-h-32 w-full rounded-lg border border-amber-200 bg-white p-3 text-sm outline-none focus:border-amber-500"
                    >
                      {selectedPreview.columns.map((column, index) => (
                        <option key={`${column.name}-${index}`} value={column.name}>
                          {column.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-amber-800">
                      Column metadata is unavailable in this dataset listing.
                      You can leave the selection empty if your backend supports
                      its default business duplicate columns.
                    </p>
                  )}

                  <p className="mt-2 text-xs text-amber-800">
                    Hold Ctrl (Windows) or Command (Mac) to select multiple columns.
                  </p>
                </div>
              )}

              {/* Normalize columns */}
              <div className="mt-6 rounded-lg border border-slate-200 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={config.normalize_column_names}
                    onChange={(event) =>
                      updateConfig("normalize_column_names", event.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Normalize Column Names
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Clean column names by removing extra spaces and standardizing
                      their format.
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Reset settings
                </button>

                <button
                  type="submit"
                  disabled={cleaningMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Eraser size={17} />
                  {cleaningMutation.isPending ? "Cleaning dataset..." : "Apply Cleaning"}
                </button>
              </div>
            </div>
          </form>

          {/* Cleaning result */}
          {result && (
            <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Cleaning completed successfully
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {result.cleaned_filename}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <ArrowDownToLine size={17} />
                  Download Cleaned CSV
                </button>
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Cleaning Report
                </h3>

                <pre className="max-h-96 overflow-auto whitespace-pre-wrap wrap-break-word text-xs leading-6 text-slate-600">
                  {JSON.stringify(result.cleaning_report, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Cleaning history */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Cleaning History
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Previous cleaning operations for this dataset.
                </p>
              </div>

              <button
                onClick={() => refetchHistory()}
                disabled={historyLoading}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                title="Refresh history"
              >
                <RefreshCw size={17} />
              </button>
            </div>

            {historyLoading ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Loading cleaning history...
              </p>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.report_id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <Clock size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {item.cleaned_filename}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Report ID: {item.report_id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : "Date unavailable"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto mb-2 text-slate-400" size={25} />
                <p className="text-sm text-slate-500">
                  No cleaning history found for this dataset.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DataCleaning;
