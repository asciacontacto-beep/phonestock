import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/sell/', '/login/'],
    },
    sitemap: 'https://stackr.app/sitemap.xml',
  };
}
