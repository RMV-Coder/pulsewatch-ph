import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://pulsewatch-ph.vercel.app'; // Update with your actual domain

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/*'], // Don't index API routes
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
