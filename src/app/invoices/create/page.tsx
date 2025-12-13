"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, FileText, Plus, Trash2, Calculator, Building2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getProviderByUserId } from "@/lib/db";
import { AccommodationProvider } from "@/lib/schema";
import { InvoiceLineItem, InvoiceBillTo } from "@/lib/types";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const VAT_RATE = 0.15; // 15% VAT in South Africa

interface LineItemInput {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  includesVat: boolean;
}

function CreateInvoiceContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<AccommodationProvider | null>(null);

  // Bill To details
  const [billTo, setBillTo] = useState<InvoiceBillTo>({
    name: "",
    attention: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "South Africa",
  });

  // Invoice metadata
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split("T")[0];
  });
  const [reference, setReference] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { id: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "", includesVat: true },
  ]);

  // Calculated totals
  const [totals, setTotals] = useState({
    subtotal: 0,
    vatAmount: 0,
    total: 0,
  });

  // Fetch provider on mount
  useEffect(() => {
    const fetchProvider = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid) return;

      try {
        const providerData = await getProviderByUserId(uid);
        if (providerData) {
          setProvider(providerData);
          // Set default VAT inclusion based on provider VAT registration
          if (!providerData.vatRegistered) {
            setLineItems([
              { id: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "", includesVat: false },
            ]);
          }
        } else {
          setError("You must be an approved provider to create invoices.");
        }
      } catch (err) {
        console.error("Error fetching provider:", err);
        setError("Failed to load provider information.");
      } finally {
        setPageLoading(false);
      }
    };
    fetchProvider();
  }, [user?.userId, user?.uid]);

  // Calculate totals whenever line items change
  const calculateTotals = useCallback(() => {
    let subtotal = 0;
    let vatAmount = 0;

    lineItems.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const lineTotal = qty * price;

      if (item.includesVat && provider?.vatRegistered) {
        // Price includes VAT, extract it
        const priceExVat = lineTotal / (1 + VAT_RATE);
        const itemVat = lineTotal - priceExVat;
        subtotal += priceExVat;
        vatAmount += itemVat;
      } else if (provider?.vatRegistered) {
        // Price excludes VAT, add it
        subtotal += lineTotal;
        vatAmount += lineTotal * VAT_RATE;
      } else {
        // Not VAT registered
        subtotal += lineTotal;
      }
    });

    setTotals({
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round((subtotal + vatAmount) * 100) / 100,
    });
  }, [lineItems, provider?.vatRegistered]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  // Add new line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: "1",
        unitPrice: "",
        includesVat: provider?.vatRegistered ?? false,
      },
    ]);
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      toast.error("Invoice must have at least one line item");
      return;
    }
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  // Update line item
  const updateLineItem = (id: string, field: keyof LineItemInput, value: string | boolean) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !provider) {
      setError("Provider information not found.");
      return;
    }

    // Validate bill to
    if (!billTo.name.trim()) {
      setError("Please enter the Bill To name.");
      return;
    }

    // Validate line items
    const validLineItems = lineItems.filter(
      (item) => item.description.trim() && parseFloat(item.unitPrice) > 0
    );
    if (validLineItems.length === 0) {
      setError("Please add at least one line item with description and price.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Process line items for storage
      const processedLineItems: InvoiceLineItem[] = validLineItems.map((item) => {
        const qty = parseFloat(item.quantity) || 1;
        const price = parseFloat(item.unitPrice) || 0;
        const lineTotal = qty * price;
        let vatAmount = 0;

        if (provider.vatRegistered) {
          if (item.includesVat) {
            vatAmount = lineTotal - lineTotal / (1 + VAT_RATE);
          } else {
            vatAmount = lineTotal * VAT_RATE;
          }
        }

        return {
          id: item.id,
          description: item.description,
          quantity: qty,
          unitPrice: price,
          includesVat: item.includesVat,
          vatAmount: Math.round(vatAmount * 100) / 100,
          lineTotal: Math.round(lineTotal * 100) / 100,
        };
      });

      await addDoc(collection(db, "invoices"), {
        providerId: provider.providerId,
        billTo,
        lineItems: processedLineItems,
        subtotal: totals.subtotal,
        vatRate: provider.vatRegistered ? VAT_RATE * 100 : 0,
        vatAmount: totals.vatAmount,
        total: totals.total,
        invoiceDate,
        dueDate,
        reference: reference || undefined,
        // Legacy fields for backward compatibility
        amount: totals.total,
        status: "draft",
        createdAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
      });

      toast.success("Invoice created successfully!");
      router.push("/invoices");
    } catch (err) {
      console.error("Error creating invoice:", err);
      setError("Failed to create invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <Sidebar userType="provider" />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Link href="/invoices" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Invoices
              </Link>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
                  <p className="text-gray-500">Create a professional invoice with line items</p>
                </div>
                {provider?.vatRegistered && (
                  <Badge className="bg-green-100 text-green-800">VAT Registered</Badge>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Invoice Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    Invoice Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice Date *</Label>
                      <Input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date *</Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reference</Label>
                      <Input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g. PO-12345"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bill To */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-500" />
                    Bill To
                  </CardTitle>
                  <CardDescription>Enter the customer/client details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company/Name *</Label>
                      <Input
                        value={billTo.name}
                        onChange={(e) => setBillTo({ ...billTo, name: e.target.value })}
                        placeholder="e.g. NSFAS, University of Cape Town"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Attention</Label>
                      <Input
                        value={billTo.attention}
                        onChange={(e) => setBillTo({ ...billTo, attention: e.target.value })}
                        placeholder="e.g. Mr John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address Line 1</Label>
                      <Input
                        value={billTo.addressLine1}
                        onChange={(e) => setBillTo({ ...billTo, addressLine1: e.target.value })}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address Line 2</Label>
                      <Input
                        value={billTo.addressLine2}
                        onChange={(e) => setBillTo({ ...billTo, addressLine2: e.target.value })}
                        placeholder="Suite, building, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={billTo.city}
                        onChange={(e) => setBillTo({ ...billTo, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Province</Label>
                        <Input
                          value={billTo.province}
                          onChange={(e) => setBillTo({ ...billTo, province: e.target.value })}
                          placeholder="Province"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Postal Code</Label>
                        <Input
                          value={billTo.postalCode}
                          onChange={(e) => setBillTo({ ...billTo, postalCode: e.target.value })}
                          placeholder="0001"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-amber-500" />
                        Line Items
                      </CardTitle>
                      <CardDescription>
                        Add items to your invoice. 
                        {provider?.vatRegistered 
                          ? " Prices can include or exclude VAT (15%)." 
                          : " VAT not applicable (not VAT registered)."}
                      </CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Table Header */}
                  <div className="hidden md:grid md:grid-cols-12 gap-2 mb-2 text-sm font-medium text-gray-500 px-2">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    {provider?.vatRegistered && (
                      <div className="col-span-2 text-center">Incl. VAT</div>
                    )}
                    <div className="col-span-1"></div>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-3">
                    {lineItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="md:col-span-5">
                          <Label className="md:hidden text-xs text-gray-500">Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                            placeholder={`Item ${index + 1} description`}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="md:hidden text-xs text-gray-500">Quantity</Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, "quantity", e.target.value)}
                            className="text-center"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="md:hidden text-xs text-gray-500">Unit Price (ZAR)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(item.id, "unitPrice", e.target.value)}
                            placeholder="0.00"
                            className="text-right"
                          />
                        </div>
                        {provider?.vatRegistered && (
                          <div className="md:col-span-2 flex items-center justify-center">
                            <Label className="md:hidden text-xs text-gray-500 mr-2">Incl. VAT</Label>
                            <Checkbox
                              checked={item.includesVat}
                              onCheckedChange={(checked: boolean) =>
                                updateLineItem(item.id, "includesVat", checked === true)
                              }
                            />
                          </div>
                        )}
                        <div className="md:col-span-1 flex items-center justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="mt-6 border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-full md:w-72 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-medium">
                            R {totals.subtotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {provider?.vatRegistered && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">VAT (15%)</span>
                            <span className="font-medium">
                              R {totals.vatAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span>Total</span>
                          <span className="text-amber-600">
                            R {totals.total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-600 text-gray-900"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Create Invoice
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <CreateInvoiceContent />
    </ProtectedRoute>
  );
}
