/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    async rewrites() {
        // In Docker: use container name 'trento_api' 
        // Locally: use localhost:4000
        const backendUrl = process.env.BACKEND_URL || 'http://trento_api:3000';
        return [
            {
                source: '/api/:path*',
                destination: `${backendUrl}/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
