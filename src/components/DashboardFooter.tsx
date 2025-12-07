"use client";

export function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 py-4 px-6 mt-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
        <p>© {currentYear} Lebon Consulting. All rights reserved.</p>
        <p className="text-gray-500">EduFlow360 CRM</p>
      </div>
    </footer>
  );
}
