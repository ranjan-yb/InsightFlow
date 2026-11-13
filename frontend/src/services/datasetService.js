import api from "../lib/axios";

export const getDatasets = async () => {
  const response = await api.get("/datasets");
  return response.data;
};

// export const uploadDataset = async (file, onUploadProgress) => {
//   const formData = new FormData();
//   formData.append("file", file);

//   const response = await api.post("/datasets/upload", formData, {
//     onUploadProgress: (progressEvent) => {
//       if (progressEvent.total) {
//         const percentage = Math.round(
//           (progressEvent.loaded * 100) / progressEvent.total
//         );

//         onUploadProgress?.(percentage);
//       }
//     },
//   });

//   return response.data;
// };



export const uploadDataset = async (file, onUploadProgress) => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post("/datasets/upload", formData, {
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percentage = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );

        onUploadProgress?.(percentage);
      }
    },
  });

  return response.data;
};

export const getDatasetPreview = async (datasetId) => {
  const response = await api.get(
    `/datasets/${datasetId}/preview`
  );

  return response.data;
};

export const getDatasetQuality = async (datasetId) => {
  const response = await api.get(`/datasets/${datasetId}/quality`);
  return response.data;
};


export const cleanDataset = async (datasetId, configuration) => {
  const response = await api.post(
    `/datasets/${datasetId}/clean`,
    configuration
  );

  return response.data;
};

export const getCleaningHistory = async (datasetId) => {
  const response = await api.get(
    `/datasets/${datasetId}/cleaning-history`
  );

  return response.data;
};

export const downloadCleanedDataset = async (datasetId) => {
  const response = await api.get(
    `/datasets/${datasetId}/download`,
    {
      responseType: "blob",
    }
  );

  return response;
};


export const exportDatasetExcel = async (datasetId) => {
  const response = await api.get(
    `/datasets/${datasetId}/export/excel`,
    { responseType: "blob" }
  );

  return response.data;
};

export const exportDatasetPDF = async (datasetId) => {
  const response = await api.get(
    `/datasets/${datasetId}/export/pdf`,
    { responseType: "blob" }
  );

  return response.data;
};