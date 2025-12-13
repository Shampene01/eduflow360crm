"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Loader2,
  Trash2,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { invoiceDisplayId } from "@/lib/utils/maskId";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Invoice } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProviderByUserId, getAddressById } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { AccommodationProvider, Address } from "@/lib/schema";
import { toast } from "sonner";

function InvoicesContent() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [provider, setProvider] = useState<AccommodationProvider | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid || !db) {
        setLoading(false);
        return;
      }

      try {
        // First get the provider for this user
        const providerData = await getProviderByUserId(uid);
        if (!providerData) {
          setInvoices([]);
          setLoading(false);
          return;
        }
        setProvider(providerData);

        // Fetch address if available
        if (providerData.physicalAddressId) {
          const addressData = await getAddressById(providerData.physicalAddressId);
          setAddress(addressData);
        }

        // Use provider ID to fetch invoices
        const invoicesQuery = query(
          collection(db, "invoices"),
          where("providerId", "==", providerData.providerId),
          orderBy("submittedAt", "desc")
        );
        const snapshot = await getDocs(invoicesQuery);
        const invoicesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Invoice[];
        setInvoices(invoicesData);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        // If there's an error (like missing index), set empty invoices
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [user?.userId, user?.uid]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "approved":
        return <Badge className="bg-blue-500">Approved</Badge>;
      case "submitted":
        return <Badge className="bg-yellow-500 text-gray-900">Submitted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

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

  // Handle PDF generation
  const handleGeneratePDF = async (invoice: Invoice) => {
    if (!provider) {
      toast.error("Provider information not available");
      return;
    }

    setGeneratingPDF(invoice.id);
    try {
      // Fetch logo as base64 if available
      let logoBase64: string | undefined;
      if (provider.companyLogoUrl) {
        const base64 = await fetchLogoAsBase64(provider.companyLogoUrl);
        if (base64) {
          logoBase64 = base64;
        }
      }

      generateInvoicePDF({
        invoice,
        provider,
        logoBase64,
        address,
      });
      toast.success("Invoice PDF generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setGeneratingPDF(null);
    }
  };

  // Handle invoice deletion
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!db) return;
    
    const confirmed = window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.");
    if (!confirmed) return;

    setDeletingInvoice(invoiceId);
    try {
      await deleteDoc(doc(db, "invoices", invoiceId));
      setInvoices(invoices.filter(inv => inv.id !== invoiceId));
      toast.success("Invoice deleted successfully");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    } finally {
      setDeletingInvoice(null);
    }
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidAmount = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const pendingAmount = invoices
    .filter((inv) => inv.status === "submitted")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />

      <div className="flex flex-1">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
              <p className="text-gray-500">Manage your billing and invoices</p>
            </div>
            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
              <Link href="/invoices/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                    <p className="text-sm text-gray-500">Total Invoices</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      R{paidAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Paid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      R{pendingAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      R{totalAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Total Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No invoices yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Create your first invoice to get started
                  </p>
                  <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                    <Link href="/invoices/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invoice
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoiceDisplayId(invoice.id)}
                        </TableCell>
                        <TableCell>
                          {invoice.month} {invoice.year}
                        </TableCell>
                        <TableCell className="font-semibold">
                          R{invoice.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          {invoice.submittedAt
                            ? new Date(invoice.submittedAt.toDate()).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" asChild title="View Invoice">
                              <Link href={`/invoices/${invoice.id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleGeneratePDF(invoice)}
                              disabled={generatingPDF === invoice.id}
                              title="Download PDF"
                            >
                              {generatingPDF === invoice.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              disabled={deletingInvoice === invoice.id || invoice.status === "paid"}
                              title={invoice.status === "paid" ? "Cannot delete paid invoice" : "Delete Invoice"}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingInvoice === invoice.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <InvoicesContent />
    </ProtectedRoute>
  );
}
