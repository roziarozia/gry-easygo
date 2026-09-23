/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Token PostHoga z Vercela, wstawiany przy buildzie do kodu klienta (app/PostHogInit.js)
  env: { POSTHOG_PROJECT_TOKEN: process.env.POSTHOG_PROJECT_TOKEN || '' },
};
module.exports = nextConfig;
