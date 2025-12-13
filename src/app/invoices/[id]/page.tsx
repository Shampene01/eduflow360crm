"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Invoice } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  Trash2,
  Loader2,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { getProviderByUserId, getAddressById } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { AccommodationProvider, Address } from "@/lib/schema";
import { invoiceDisplayId } from "@/lib/utils/maskId";

function ViewInvoiceContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [provider, setProvider] = useState<AccommodationProvider | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid || !db || !invoiceId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch invoice
        const invoiceDoc = await getDoc(doc(db, "invoices", invoiceId));
        if (!invoiceDoc.exists()) {
          toast.error("Invoice not found");
          router.push("/invoices");
          return;
        }

        const invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice;
        setInvoice(invoiceData);

        // Fetch provider
        const providerData = await getProviderByUserId(uid);
        if (providerData) {
          setProvider(providerData);

          // Fetch address if available
          if (providerData.physicalAddressId) {
            const addressData = await getAddressById(providerData.physicalAddressId);
            setAddress(addressData);
          }
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [invoiceId, user?.userId, user?.uid, router]);

  // Convert image URL to base64
  const fetchLogoAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleGeneratePDF = async () => {
    if (!invoice || !provider) return;

    setGeneratingPDF(true);
    try {
      let logoBase64: string | undefined;
      if (provider.companyLogoUrl) {
        const base64 = await fetchLogoAsBase64(provider.companyLogoUrl);
        if (base64) logoBase64 = base64;
      }

      generateInvoicePDF({
        invoice,
        provider,
        logoBase64,
        address,
      });
      toast.success("Invoice PDF generated!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice || !db) return;

    const confirmed = window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.");
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "invoices", invoice.id));
      toast.success("Invoice deleted");
      router.push("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: "bg-gray-500",
      submitted: "bg-yellow-500 text-gray-900",
      approved: "bg-blue-500",
      paid: "bg-green-500",
      rejected: "bg-red-500",
    };
    return <Badge className={statusColors[status] || "bg-gray-500"}>{status.toUpperCase()}</Badge>;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  };

  // Calculate due date (7 days after submission)
  const getDueDate = () => {
    if (!invoice?.submittedAt) return "-";
    const submitted = invoice.submittedAt.toDate ? invoice.submittedAt.toDate() : new Date();
    const dueDate = new Date(submitted);
    dueDate.setDate(dueDate.getDate() + 7);
    return dueDate.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </main>
        </div>
      </div>
    );
  }

  if (!invoice || !provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900">Invoice not found</h2>
              <Button asChild className="mt-4">
                <Link href="/invoices">Back to Invoices</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader />
      <div className="flex">
        <Sidebar userType="provider" />
        <main className="flex-1 p-6 lg:p-8">
          {/* Action Bar */}
          <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
            <Button variant="ghost" asChild>
              <Link href="/invoices">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Invoices
              </Link>
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="outline" 
                onClick={handleGeneratePDF}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download PDF
              </Button>
              {invoice.status !== "paid" && (
                <Button 
                  variant="outline" 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-600 hover:bg-red-50"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Invoice Document */}
          <Card className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none">
            <CardContent className="p-8 lg:p-12">
              {/* Header Section */}
              <div className="flex justify-between items-start mb-8">
                {/* Provider Info */}
                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-gray-900">{provider.companyName}</p>
                  {provider.tradingName && provider.tradingName !== provider.companyName && (
                    <p>Trading as: {provider.tradingName}</p>
                  )}
                  {address && (
                    <>
                      <p>{address.street}</p>
                      {address.suburb && <p>{address.suburb}</p>}
                      <p>{address.townCity}</p>
                      <p>{address.province} {address.postalCode}</p>
                      <p>SOUTH AFRICA</p>
                    </>
                  )}
                </div>

                {/* Logo */}
                <div className="text-right">
                  {provider.companyLogoUrl ? (
                    <Image
                      src={provider.companyLogoUrl}
                      alt="Company Logo"
                      width={150}
                      height={60}
                      className="object-contain ml-auto"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-amber-500">
                      {provider.companyName}
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Title & Details */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-4xl font-light text-gray-900 mb-6">INVOICE</h1>
                  
                  {/* Bill To */}
                  <div className="text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Bill To:</p>
                    {invoice.billTo ? (
                      <>
                        <p className="font-medium text-gray-800">{invoice.billTo.name}</p>
                        {invoice.billTo.attention && <p>Attention: {invoice.billTo.attention}</p>}
                        {invoice.billTo.addressLine1 && <p>{invoice.billTo.addressLine1}</p>}
                        {invoice.billTo.addressLine2 && <p>{invoice.billTo.addressLine2}</p>}
                        {(invoice.billTo.city || invoice.billTo.province || invoice.billTo.postalCode) && (
                          <p>{[invoice.billTo.city, invoice.billTo.province, invoice.billTo.postalCode].filter(Boolean).join(", ")}</p>
                        )}
                        {invoice.billTo.country && <p>{invoice.billTo.country}</p>}
                      </>
                    ) : (
                      <>
                        <p>NSFAS / Institution</p>
                        <p>{invoice.month} {invoice.year}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Invoice Meta */}
                <div className="text-right text-sm">
                  <div className="mb-4">
                    <p className="text-gray-500 font-medium">Invoice Date</p>
                    <p className="text-gray-900 font-semibold">
                      {invoice.invoiceDate 
                        ? new Date(invoice.invoiceDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
                        : formatDate(invoice.submittedAt || invoice.createdAt)}
                    </p>
                  </div>
                  <div className="mb-4">
                    <p className="text-gray-500 font-medium">Invoice Number</p>
                    <p className="text-gray-900 font-semibold">{invoiceDisplayId(invoice.id)}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-gray-500 font-medium">Reference</p>
                    <p className="text-gray-900 font-semibold">
                      {invoice.reference || (invoice.month ? `${invoice.month.slice(0, 3).toUpperCase()}-${invoice.year}` : "-")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Status</p>
                    {getStatusBadge(invoice.status)}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 text-sm font-semibold text-gray-700">Description</th>
                      <th className="text-center py-3 text-sm font-semibold text-gray-700 w-24">Quantity</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-700 w-32">Unit Price</th>
                      <th className="text-center py-3 text-sm font-semibold text-gray-700 w-24">VAT</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-700 w-32">Amount ZAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems && invoice.lineItems.length > 0 ? (
                      invoice.lineItems.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-gray-200">
                          <td className="py-4 text-sm text-blue-600">
                            {String(index + 1).padStart(3, "0")}. {item.description}
                          </td>
                          <td className="py-4 text-sm text-center text-gray-600">
                            {item.quantity.toFixed(2)}
                          </td>
                          <td className="py-4 text-sm text-right text-gray-600">
                            {item.unitPrice.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 text-sm text-center text-gray-600">
                            {item.includesVat ? "Incl." : (invoice.vatRate ? `${invoice.vatRate}%` : "No VAT")}
                          </td>
                          <td className="py-4 text-sm text-right font-medium text-gray-900">
                            {item.lineTotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-gray-200">
                        <td className="py-4 text-sm text-blue-600">
                          001. {invoice.description || `Accommodation for ${invoice.month} ${invoice.year}`}
                        </td>
                        <td className="py-4 text-sm text-center text-gray-600">1.00</td>
                        <td className="py-4 text-sm text-right text-gray-600">
                          {(invoice.amount || invoice.total || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-sm text-center text-gray-600">
                          {provider.vatRegistered ? "15%" : "No VAT"}
                        </td>
                        <td className="py-4 text-sm text-right font-medium text-gray-900">
                          {(invoice.amount || invoice.total || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end mb-8">
                <div className="w-72">
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {(invoice.subtotal || invoice.amount || invoice.total || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {(invoice.vatRate || provider.vatRegistered) && (
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-gray-600">VAT ({invoice.vatRate || 15}%)</span>
                      <span className="font-medium">
                        {(invoice.vatAmount || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 my-2" />
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">Invoice Total ZAR</span>
                    <span className="font-semibold">
                      {(invoice.total || invoice.amount || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 my-2" />
                  <div className="flex justify-between py-3 bg-gray-50 px-3 -mx-3 rounded">
                    <span className="font-semibold text-gray-900">Amount Due ZAR</span>
                    <span className="font-bold text-lg text-gray-900">
                      {invoice.status === "paid" ? "0.00" : (invoice.total || invoice.amount || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Due Date & Payment Info */}
              <div className="border-t pt-8 mt-8">
                <p className="font-semibold text-gray-900 mb-4">Due Date: {getDueDate()}</p>
                
                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-gray-900 mb-2">Payment Methods</p>
                  <p className="text-gray-500 mb-2">Direct Deposits/Internet Transfers/Cash Payments can be made into:</p>
                  
                  {provider.bankName && (
                    <div className="space-y-1">
                      <p>Account Name: <span className="text-gray-900">{provider.accountHolder || provider.companyName}</span></p>
                      <p>Bank: <span className="text-gray-900">{provider.bankName}</span></p>
                      {provider.accountNumber && (
                        <p>Account Number: <span className="text-gray-900">{provider.accountNumber}</span></p>
                      )}
                      {provider.branchCode && (
                        <p>Branch Code: <span className="text-gray-900">{provider.branchCode}</span></p>
                      )}
                      <p>Reference: <span className="text-gray-900">{invoiceDisplayId(invoice.id)}</span></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-4 border-t text-xs text-gray-400">
                {provider.companyRegistrationNumber && (
                  <p>Reg No: {provider.companyRegistrationNumber}</p>
                )}
                {provider.vatNumber && (
                  <p>VAT No: {provider.vatNumber}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

export default function ViewInvoicePage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <ViewInvoiceContent />
    </ProtectedRoute>
  );
}
