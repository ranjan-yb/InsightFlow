
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  CloudUpload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Upload,
  ArrowLeft,
} from "lucide-react";

import { uploadDataset } from "../../services/datasetService";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const UploadDataset = () => {
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: (selectedFile) =>
      uploadDataset(selectedFile, setProgress),

    onSuccess: () => {
      toast.success("Dataset uploaded successfully!");

      queryClient.invalidateQueries({
        queryKey: ["datasets"],
      });

      navigate("/datasets");
    },

    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Unable to upload dataset."
      );

      setProgress(0);
    },
  });

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only CSV files are allowed.");
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File size must not exceed 10 MB.");
      return false;
    }

    if (selectedFile.size === 0) {
      toast.error("The selected file is empty.");
      return false;
    }

    setFile(selectedFile);
    setProgress(0);

    return true;
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    validateFile(selectedFile);

    // Allow selecting the same file again
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    const selectedFile = event.dataTransfer.files?.[0];

    validateFile(selectedFile);
  };

  const handleUpload = () => {
    if (!file || uploadMutation.isPending) return;

    setProgress(0);
    uploadMutation.mutate(file);
  };

  const removeFile = () => {
    if (uploadMutation.isPending) return;

    setFile(null);
    setProgress(0);
  };

  const formatFileSize = (size) => {
    return size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-7">

      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/datasets")}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to datasets
        </button>

        <h1 className="text-2xl font-bold text-slate-900">
          Upload Dataset
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Upload a CSV file to start exploring and analyzing your data.
        </p>
      </div>

      {/* Upload Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition sm:p-12 ${
            dragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-slate-50"
          }`}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <CloudUpload size={32} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-800">
            Drag and drop your CSV file
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Or choose a file from your computer.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Browse Files
          </button>

          <p className="mt-5 text-xs text-slate-400">
            Supported format: CSV · Maximum size: 10 MB
          </p>
        </div>

        {/* Selected File */}
        {file && (
          <div className="mt-6 rounded-xl border border-slate-200 p-4">

            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-lg bg-green-50 p-3 text-green-600">
                  <FileSpreadsheet size={24} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {file.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <button
                onClick={removeFile}
                disabled={uploadMutation.isPending}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {uploadMutation.isPending && (
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-slate-500">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {!uploadMutation.isPending && (
              <div className="mt-4 flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 size={15} />
                File ready to upload
              </div>
            )}

          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploadMutation.isPending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload size={18} />
          {uploadMutation.isPending ? "Uploading..." : "Upload Dataset"}
        </button>

      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
        <h3 className="font-semibold text-blue-900">
          Before uploading
        </h3>

        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-blue-800">
          <li>Upload a valid CSV file.</li>
          <li>Maximum file size is 10 MB.</li>
          <li>Make sure your CSV contains column headers.</li>
          <li>Do not upload sensitive personal information.</li>
        </ul>
      </div>

    </div>
  );
};

export default UploadDataset;
