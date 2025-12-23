import { MetadataRoute } from 'next';
import { Product } from '../types';

async function getProducts(): Promise<Product[]> {
    try {
        const res = await fetch('http://trento_api:3000/products', { next: { revalidate: 3600 } });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Sitemap generation failed:", error);
        return [];
    }
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const products = await getProducts();
    const baseUrl = 'https://trento.com.ar'; // Replace with actual domain

    const productUrls = products.map((product) => ({
        url: `${baseUrl}/product/${generateSlug(product.name)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/catalog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/collections`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        ...productUrls,
    ];
}
