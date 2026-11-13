
import api from "../lib/axios";

export const getDashboardSummary = async (datasetId) => {
  const response = await api.get(
    `/datasets/${datasetId}/analytics/dashboard`
  );

  return response.data;
};

export const generateChart = async (datasetId, chartConfig) => {
  const response = await api.post(
    `/datasets/${datasetId}/analytics/chart`,
    chartConfig
  );

  return response.data;
};

export const getGroupByAnalysis = async (datasetId, config) => {
  const response = await api.post(
    `/datasets/${datasetId}/analytics/group-by`,
    config
  );

  return response.data;
};

export const filterDataset = async (datasetId, filters) => {
  const response = await api.post(
    `/datasets/${datasetId}/analytics/filter`,
    filters
  );

  return response.data;
};

export const calculateKPI = async (datasetId, config) => {
  const response = await api.post(
    `/datasets/${datasetId}/analytics/kpi`,
    config
  );

  return response.data;
};
