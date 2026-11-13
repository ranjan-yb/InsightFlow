import { Routes, Route, Navigate } from "react-router-dom";


import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";

import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/auth/login";

import Datasets from "./pages/datasets/Datasets";
import UploadDataset from "./pages/datasets/UploadDataset";
import DatasetPreview from "./pages/datasets/DatasetPreview";
import DatasetQuality from "./pages/datasets/DatasetQuality";
import DataCleaning from "./pages/cleaning/DataCleaning";
import Analytics from "./pages/analytics/Analytics";
import Reports from "./pages/reports/Reports";

function App() {
  return (
    <Routes>

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected application */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>

          <Route path="/dashboard" element={<Dashboard />} />

          {/* Temporary placeholders */}
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/upload" element={<UploadDataset />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/cleaning" element={<DataCleaning />} />
        <Route path="/reports" element={<Reports />} />

          <Route
  path="/datasets/:datasetId/preview"
  element={<DatasetPreview />}
/>
<Route
  path="/datasets/:datasetId/quality"
  element={<DatasetQuality />}
/>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />

    </Routes>
  );
}

export default App;