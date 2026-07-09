import { Router } from "express";

const linkRouter = Router();




export default linkRouter; 

// Links
// export const linksApi = {

//   create: (data: CreateLinkPayload) => api.post('/v1/link', data),

//   getAll: (params?: GetLinksParams) => api.get('/v1/link', { params }),

//   getById: (id: string) => api.get(`/v1/link/${id}`),

//   update: (id: string, data: Partial<CreateLinkPayload>) => api.patch(`/v1/link/${id}`, data),

//   delete: (id: string) => api.delete(`/v1/link/${id}`),

//   toggle: (id: string) => api.patch(`/v1/link/${id}/toggle`),

//   checkAlias: (alias: string) => api.get(`/v1/link/check-alias/${alias}`),

//   setRules: (id: string, rules: RedirectRule[]) => api.put(`/v1/link/${id}/rules`, { rules }),

//   createAbTest: (id: string, data: AbTestPayload) => api.post(`/v1/link/${id}/ab-test`, data),

//   bulkCreate: (links: BulkLinkItem[]) => api.post('/v1/link/bulk', { links }),

//   getBulkJob: (jobId: string) => api.get(`/v1/link/bulk/jobs/${jobId}`),
// };
