/**
 * Admin routes (mirrors a compact “abexis-style” map: one hub + tools + Decap on `/admin/`).
 */
export const CMS_PATHS = {
  authLogin: '/app/sign-in',
  cmsRoot: '/app/cms',
  cmsArticles: '/app/cms/articles',
  cmsWebinars: '/app/cms/webinars',
  cmsConsultations: '/app/cms/consultations',
  cmsProducts: '/app/cms/products',
  cmsSitePages: '/app/cms/site-pages',
  /** Decap CMS UI (static files in `public/admin/`) */
  decap: '/admin/index.html',
} as const;
