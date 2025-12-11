/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["chromadb", "cohere-ai", "openai", "ollama"],
  turbopack: {
    // Empty config to acknowledge Turbopack usage
  },
};

module.exports = nextConfig;
