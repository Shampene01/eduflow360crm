// Force this route to be statically generated with client-side data fetching
export const dynamic = "force-static";
export const dynamicParams = true;

// Generate empty params - actual data is fetched client-side
export function generateStaticParams() {
  return [];
}

export default function PropertyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
