import { Metadata } from "next";
import ProductDetailClient from "./ProductDetailClient";
import Link from "next/link";
import { Product } from "../../../../types";

// Fetch Logic (Server Side)
async function getProductBySlug(slug: string): Promise<Product | null> {
    try {
        const res = await fetch('http://trento_api:3000/products', { next: { revalidate: 60 } });
        if (!res.ok) return null;

        const products: Product[] = await res.json();
        const generateSlug = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        return products.find(p => generateSlug(p.name) === slug || p.id === slug) || null;
    } catch (error) {
        console.error("Failed to fetch product for slug:", slug);
        return null;
    }
}

// Dynamic Metadata
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const product = await getProductBySlug(params.slug);

    if (!product) {
        return {
            title: "Producto no encontrado | Trento Bebidas",
            description: "El producto que buscas no está disponible."
        };
    }

    return {
        title: `${product.name} | ${product.brand || 'Trento'} - Comprar Online`,
        description: product.description || `Compra ${product.name} al mejor precio. Envíos a todo el país.`,
        openGraph: {
            title: `${product.name} | Trento`,
            description: product.description || `Compra ${product.name} en Trento Bebidas.`,
            images: product.imageUrl ? [product.imageUrl] : [],
            type: 'website',
        },
    };
}

// Server Component
export default async function ProductPage({ params }: { params: { slug: string } }) {
    const product = await getProductBySlug(params.slug);

    if (!product) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
                <p>Producto no encontrado</p>
                <Link href="/" className="ml-4 text-amber-500 hover:underline">Volver al inicio</Link>
            </div>
        );
    }

    const canonUrl = `https://trento.com.ar/product/${params.slug}`;
    const jsonLd = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "description": product.description,
        "image": product.imageUrl,
        "sku": product.sku,
        "brand": {
            "@type": "Brand",
            "name": product.brand || "Trento"
        },
        "offers": {
            "@type": "Offer",
            "url": canonUrl,
            "priceCurrency": "ARS",
            "price": product.basePrice,
            "availability": (product.currentStock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProductDetailClient product={product} />
        </>
    );
}
