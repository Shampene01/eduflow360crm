"use client";

import { jsPDF } from "jspdf";
import { Invoice } from "./types";
import { AccommodationProvider } from "./schema";
import { Address } from "./schema";

interface InvoiceGenerationOptions {
  invoice: Invoice;
  provider: AccommodationProvider;
  propertyName?: string;
  logoBase64?: string;
  address?: Address | null;
}

/**
 * Generate a professional PDF invoice matching the Lebon Financial Services template
 */
export function generateInvoicePDF({
  invoice,
  provider,
  logoBase64,
  address,
}: InvoiceGenerationOptions): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  
  // Colors
  const darkText: [number, number, number] = [31, 41, 55];
  const grayText: [number, number, number] = [107, 114, 128];
  const blueText: [number, number, number] = [37, 99, 235];
  const lineColor: [number, number, number] = [209, 213, 219];
  
  let yPos = margin;
  
  // Invoice number for filename
  const invoiceNumber = `INV-${invoice.id?.slice(-4).toUpperCase() || "0000"}`;
  
  // ============================================
  // HEADER SECTION - Provider Info & Logo
  // ============================================
  
  // Provider details (left side)
  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(provider.companyName || "Company Name", margin, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayText);
  yPos += 5;
  
  if (provider.tradingName && provider.tradingName !== provider.companyName) {
    doc.text(`Trading as: ${provider.tradingName}`, margin, yPos);
    yPos += 5;
  }
  
  if (address) {
    doc.text(address.street || "", margin, yPos);
    yPos += 4;
    if (address.suburb) {
      doc.text(address.suburb, margin, yPos);
      yPos += 4;
    }
    doc.text(`${address.townCity || ""} ${address.postalCode || ""}`, margin, yPos);
    yPos += 4;
    doc.text(address.province?.toUpperCase() || "", margin, yPos);
    yPos += 4;
    doc.text("SOUTH AFRICA", margin, yPos);
  }
  
  // Logo (right side)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", pageWidth - margin - 50, 15, 50, 25);
    } catch (e) {
      // If logo fails, show company name
      doc.setTextColor(...darkText);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(provider.companyName || "", pageWidth - margin, 25, { align: "right" });
    }
  } else {
    doc.setTextColor(...darkText);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(provider.companyName || "", pageWidth - margin, 25, { align: "right" });
  }
  
  // ============================================
  // INVOICE TITLE & DETAILS
  // ============================================
  
  yPos = 70;
  
  // "INVOICE" title
  doc.setTextColor(...darkText);
  doc.setFontSize(32);
  doc.setFont("helvetica", "normal");
  doc.text("INVOICE", margin, yPos);
  
  // Invoice details (right side)
  const detailsX = pageWidth - margin;
  let detailsY = 55;
  
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Date", detailsX, detailsY, { align: "right" });
  detailsY += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkText);
  const invoiceDate = invoice.submittedAt?.toDate?.() || invoice.createdAt?.toDate?.() || new Date();
  doc.text(invoiceDate.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }), detailsX, detailsY, { align: "right" });
  
  detailsY += 8;
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Number", detailsX, detailsY, { align: "right" });
  detailsY += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkText);
  doc.text(invoiceNumber, detailsX, detailsY, { align: "right" });
  
  detailsY += 8;
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "bold");
  doc.text("Reference", detailsX, detailsY, { align: "right" });
  detailsY += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkText);
  doc.text(`${invoice.month?.slice(0, 3).toUpperCase() || "REF"}-${invoice.year}`, detailsX, detailsY, { align: "right" });
  
  // Bill To section
  yPos += 15;
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.text("Bill To:", margin, yPos);
  yPos += 5;
  doc.setTextColor(...darkText);
  
  if (invoice.billTo) {
    doc.text(invoice.billTo.name || "", margin, yPos);
    yPos += 4;
    if (invoice.billTo.attention) {
      doc.text(`Attention: ${invoice.billTo.attention}`, margin, yPos);
      yPos += 4;
    }
    if (invoice.billTo.addressLine1) {
      doc.text(invoice.billTo.addressLine1, margin, yPos);
      yPos += 4;
    }
    if (invoice.billTo.city || invoice.billTo.province) {
      doc.text([invoice.billTo.city, invoice.billTo.province, invoice.billTo.postalCode].filter(Boolean).join(", "), margin, yPos);
    }
  } else {
    doc.text("NSFAS / Institution", margin, yPos);
    yPos += 4;
    doc.text(`Accommodation - ${invoice.month} ${invoice.year}`, margin, yPos);
  }
  
  // ============================================
  // LINE ITEMS TABLE
  // ============================================
  
  yPos = 120;
  
  // Table header
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkText);
  doc.text("Description", margin, yPos);
  doc.text("Quantity", margin + 90, yPos, { align: "center" });
  doc.text("Unit Price", margin + 115, yPos, { align: "right" });
  doc.text("VAT", margin + 140, yPos, { align: "center" });
  doc.text("Amount ZAR", pageWidth - margin, yPos, { align: "right" });
  
  yPos += 4;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  // Line items
  yPos += 8;
  doc.setFont("helvetica", "normal");
  
  if (invoice.lineItems && invoice.lineItems.length > 0) {
    invoice.lineItems.forEach((item, index) => {
      doc.setTextColor(...blueText);
      const itemDesc = `${String(index + 1).padStart(3, "0")}. ${item.description}`;
      doc.text(itemDesc, margin, yPos);
      
      doc.setTextColor(...darkText);
      doc.text(item.quantity.toFixed(2), margin + 90, yPos, { align: "center" });
      doc.text(item.unitPrice.toLocaleString("en-ZA", { minimumFractionDigits: 2 }), margin + 115, yPos, { align: "right" });
      doc.text(item.includesVat ? "Incl." : (invoice.vatRate ? `${invoice.vatRate}%` : "No VAT"), margin + 140, yPos, { align: "center" });
      doc.text(item.lineTotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 }), pageWidth - margin, yPos, { align: "right" });
      
      yPos += 8;
    });
  } else {
    // Legacy single item
    doc.setTextColor(...blueText);
    const description = `001. ${invoice.description || `${invoice.month} ${invoice.year} Accommodation`}`;
    doc.text(description, margin, yPos);
    
    doc.setTextColor(...darkText);
    doc.text("1.00", margin + 90, yPos, { align: "center" });
    const amount = invoice.amount || invoice.total || 0;
    doc.text(amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 }), margin + 115, yPos, { align: "right" });
    doc.text(provider.vatRegistered ? "15%" : "No VAT", margin + 140, yPos, { align: "center" });
    doc.text(amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 }), pageWidth - margin, yPos, { align: "right" });
    yPos += 8;
  }
  
  // ============================================
  // TOTALS SECTION
  // ============================================
  
  yPos += 7;
  const totalsX = pageWidth - margin - 80;
  const subtotal = invoice.subtotal || invoice.amount || invoice.total || 0;
  const vatAmount = invoice.vatAmount || 0;
  const total = invoice.total || invoice.amount || 0;
  
  // Subtotal
  doc.setTextColor(...grayText);
  doc.text("Subtotal", totalsX, yPos);
  doc.setTextColor(...darkText);
  doc.text(subtotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 }), pageWidth - margin, yPos, { align: "right" });
  
  if (invoice.vatRate || provider.vatRegistered) {
    yPos += 6;
    doc.setTextColor(...grayText);
    doc.text(`VAT (${invoice.vatRate || 15}%)`, totalsX, yPos);
    doc.setTextColor(...darkText);
    doc.text(vatAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 }), pageWidth - margin, yPos, { align: "right" });
  }
  
  yPos += 4;
  doc.setDrawColor(...lineColor);
  doc.line(totalsX - 10, yPos, pageWidth - margin, yPos);
  
  yPos += 6;
  doc.setTextColor(...grayText);
  doc.text("Invoice Total ZAR", totalsX, yPos);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(total.toLocaleString("en-ZA", { minimumFractionDigits: 2 }), pageWidth - margin, yPos, { align: "right" });
  
  yPos += 4;
  doc.line(totalsX - 10, yPos, pageWidth - margin, yPos);
  
  // Amount Due (highlighted)
  yPos += 8;
  doc.setFillColor(249, 250, 251);
  doc.rect(totalsX - 15, yPos - 5, pageWidth - margin - totalsX + 20, 12, "F");
  
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Amount Due ZAR", totalsX, yPos + 2);
  doc.setFontSize(12);
  const amountDue = invoice.status === "paid" ? "0.00" : total.toLocaleString("en-ZA", { minimumFractionDigits: 2 });
  doc.text(amountDue, pageWidth - margin, yPos + 2, { align: "right" });
  
  // ============================================
  // DUE DATE & PAYMENT INFO
  // ============================================
  
  yPos = 210;
  
  // Due date
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 7);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkText);
  doc.text(`Due Date: ${dueDate.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`, margin, yPos);
  
  yPos += 10;
  
  // Payment Methods
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Methods", margin, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayText);
  doc.text("Direct Deposits/Internet Transfers/Cash Payments can be made into:", margin, yPos);
  
  yPos += 8;
  if (provider.bankName) {
    doc.text(`Account Name: ${provider.accountHolder || provider.companyName}`, margin, yPos);
    yPos += 4;
    doc.text(`Bank: ${provider.bankName}`, margin, yPos);
    yPos += 4;
    if (provider.accountNumber) {
      doc.text(`Account Number: ${provider.accountNumber}`, margin, yPos);
      yPos += 4;
    }
    if (provider.branchCode) {
      doc.text(`Branch Code: ${provider.branchCode}`, margin, yPos);
      yPos += 4;
    }
    doc.text(`Reference: ${invoiceNumber}`, margin, yPos);
  }
  
  // ============================================
  // FOOTER
  // ============================================
  
  yPos = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  
  if (provider.companyRegistrationNumber) {
    doc.text(`Reg No: ${provider.companyRegistrationNumber}`, margin, yPos);
  }
  if (provider.vatNumber) {
    doc.text(`VAT No: ${provider.vatNumber}`, margin + 60, yPos);
  }
  
  // Save the PDF
  const fileName = `Invoice_${invoice.month}_${invoice.year}_${invoiceNumber}.pdf`;
  doc.save(fileName);
}

/**
 * Generate invoice PDF and return as blob (for preview or upload)
 */
export function generateInvoicePDFBlob({
  invoice,
  provider,
  propertyName,
}: InvoiceGenerationOptions): Blob {
  const doc = new jsPDF();
  // ... same generation code would go here
  // For now, just return the blob
  return doc.output("blob");
}
