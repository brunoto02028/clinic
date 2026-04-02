import { Metadata } from 'next';
import { shopMetadata, shopJsonLd } from './metadata';

export const metadata: Metadata = shopMetadata;

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shopJsonLd) }}
      />
      {children}
    </>
  );
}
