
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Filter } from "lucide-react";

import { filterDataset } from "../../services/analyticsService";

const DatasetFilter = ({ datasetId, columns = [] }) => {
  const [filters, setFilters] = useState([
    { column: "", operator: "equals", value: "" },
  ]);

  const [limit, setLimit] = useState(100);

  const filterMutation = useMutation({
    mutationFn: (payload) => filterDataset(datasetId, payload),
  });

  useEffect(() => {
    setFilters((previous) =>
      previous.map((filter) => ({
        ...filter,
        column: columns.some((column) => column.name === filter.column)
          ? filter.column
          : columns[0]?.name || "",
      }))
    );
  }, [datasetId, columns]);

  const updateFilter = (index, field, value) => {
    setFilters((previous) =>
      previous.map((filter, i) =>
        i === index ? { ...filter, [field]: value } : filter
      )
    );
  };

  const addFilter = () => {
    setFilters((previous) => [
      ...previous,
      {
        column: columns[0]?.name || "",
        operator: "equals",
        value: "",
      },
    ]);
  };

  const removeFilter = (index) => {
    setFilters((previous) =>
      previous.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validFilters = filters.filter(
      (filter) =>
        filter.column &&
        filter.value.trim() !== ""
    );

    if (!validFilters.length) return;

    filterMutation.mutate({
      filters: validFilters,
      limit: Number(limit),
    });
  };

  const result = filterMutation.data;
  const results = result?.results || [];

  if (!datasetId) return null;

  return (
    <section className="mt-8 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900">
            Dynamic Dataset Filtering
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Filter your dataset using column conditions.
        </p>
      </div>

      {/* Filter configuration */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="font-semibold text-slate-800">
            Filter Conditions
          </h3>

          <button
            type="button"
            onClick={addFilter}
            disabled={!columns.length}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            <Plus size={16} />
            Add Condition
          </button>
        </div>

        <div className="space-y-3">
          {filters.map((filter, index) => (
            <div
              key={index}
              className="grid grid-cols-1 items-end gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Column
                </label>
                <select
                  value={filter.column}
                  onChange={(event) =>
                    updateFilter(index, "column", event.target.value)
                  }
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  {columns.map((column) => (
                    <option key={column.name} value={column.name}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Operator
                </label>
                <select
                  value={filter.operator}
                  onChange={(event) =>
                    updateFilter(index, "operator", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="equals">Equals</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Value
                </label>
                <input
                  type="text"
                  value={filter.value}
                  onChange={(event) =>
                    updateFilter(index, "value", event.target.value)
                  }
                  placeholder="Enter a value"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={() => removeFilter(index)}
                disabled={filters.length === 1}
                title="Remove condition"
                className="flex h-10 items-center justify-center rounded-lg border border-red-200 px-3 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>

        <div className="max-w-xs">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Result Limit
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={
            filterMutation.isPending ||
            !columns.length ||
            !filters.some(
              (filter) => filter.column && filter.value.trim()
            )
          }
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {filterMutation.isPending
            ? "Filtering Dataset..."
            : "Apply Filters"}
        </button>
      </form>

      {/* Error */}
      {filterMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {filterMutation.error?.response?.data?.detail ||
            "Unable to filter the dataset."}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-semibold text-slate-900">
                Filter Results
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Matching records returned by your filters.
              </p>
            </div>

            <div className="rounded-lg bg-indigo-50 px-4 py-2">
              <p className="text-xs text-indigo-600">
                Total matching rows
              </p>
              <p className="text-xl font-bold text-indigo-700">
                {result.total_filtered_rows}
              </p>
            </div>
          </div>

          {results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {result.columns?.map((column) => (
                      <th key={column} className="whitespace-nowrap px-5 py-3">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {results.map((row, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      {result.columns?.map((column) => (
                        <td
                          key={column}
                          className="whitespace-nowrap px-5 py-4 text-slate-700"
                        >
                          {row[column] === null ||
                          row[column] === undefined
                            ? "—"
                            : String(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-10 text-center text-sm text-slate-500">
              No records match your filter conditions.
            </p>
          )}
        </div>
      )}

      {!result && !filterMutation.isPending && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-700">
            Your filtered records will appear here
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Add a condition and apply your filters.
          </p>
        </div>
      )}
    </section>
  );
};

export default DatasetFilter;
