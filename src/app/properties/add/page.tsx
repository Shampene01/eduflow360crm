"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  Plus,
  X,
  Upload,
  Loader2,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getProviderByUserId, createProperty, createAddress } from "@/lib/db";
import { db } from "@/lib/firebase";
import { AccommodationProvider } from "@/lib/schema";
import { syncPropertyToCRMBackground } from "@/lib/crmSync";

const provinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

const amenitiesList = [
  "WiFi",
  "Parking",
  "Security",
  "Laundry",
  "Kitchen",
  "Study Room",
  "Gym",
  "Swimming Pool",
  "CCTV",
  "Backup Power",
  "Water Tank",
  "Furnished",
];

function AddPropertyContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<AccommodationProvider | null>(null);

  // Fetch provider on mount
  useEffect(() => {
    const fetchProvider = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid) return;
      
      try {
        const providerData = await getProviderByUserId(uid);
        setProvider(providerData);
      } catch (err) {
        console.error("Error fetching provider:", err);
      }
    };
    fetchProvider();
  }, [user?.userId, user?.uid]);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    description: "",
    totalRooms: "",
    pricePerMonth: "",
    amenities: [] as string[],
    nsfasApproved: true,
  });

  const updateFormData = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.address || !formData.city || !formData.province) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!formData.totalRooms || parseInt(formData.totalRooms) <= 0) {
      setError("Please enter a valid number of rooms.");
      return;
    }

    if (!formData.pricePerMonth || parseFloat(formData.pricePerMonth) <= 0) {
      setError("Please enter a valid price per month.");
      return;
    }

    if (!db) {
      setError("Database not initialized. Please try again.");
      return;
    }

    if (!provider) {
      setError("Provider not found. Please complete your provider application first.");
      return;
    }

    setLoading(true);

    try {
      // First create the address
      const address = await createAddress({
        street: formData.address,
        townCity: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
        country: "South Africa",
      });

      // Then create the property in the subcollection
      const property = await createProperty({
        providerId: provider.providerId,
        name: formData.name,
        ownershipType: "Owned",
        propertyType: "Student Residence",
        description: formData.description,
        addressId: address.addressId,
        totalBeds: parseInt(formData.totalRooms),
        availableBeds: parseInt(formData.totalRooms),
        pricePerBedPerMonth: parseFloat(formData.pricePerMonth),
        amenities: formData.amenities,
        nsfasApproved: formData.nsfasApproved,
        status: "Pending",
      });

      // Sync property to Dataverse CRM (background, non-blocking)
      // Requires both provider and user to have Dataverse IDs
      const providerDataverseId = provider.dataverseId;
      const userDataverseId = user?.dataverseId;
      if (providerDataverseId && userDataverseId) {
        syncPropertyToCRMBackground(
          property,
          providerDataverseId,
          userDataverseId,
          address
        );
      } else {
        console.warn("Provider or user does not have a Dataverse ID - property will not be synced to CRM");
      }

      toast.success("Property added successfully!");
      router.push("/properties");
    } catch (err: any) {
      console.error("Error adding property:", err);
      setError("Failed to add property. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <div className="flex">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button asChild variant="ghost" size="icon">
              <Link href="/properties">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
              <p className="text-gray-500">Register a new accommodation property</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-amber-500" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Property Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => updateFormData("name", e.target.value)}
                        placeholder="e.g., Sunrise Student Residence"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateFormData("description", e.target.value)}
                        placeholder="Describe your property..."
                        rows={4}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="totalRooms">Total Rooms *</Label>
                        <Input
                          id="totalRooms"
                          type="number"
                          min="1"
                          value={formData.totalRooms}
                          onChange={(e) => updateFormData("totalRooms", e.target.value)}
                          placeholder="e.g., 50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pricePerMonth">Price per Month (ZAR) *</Label>
                        <Input
                          id="pricePerMonth"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.pricePerMonth}
                          onChange={(e) => updateFormData("pricePerMonth", e.target.value)}
                          placeholder="e.g., 3500"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardHeader>
                    <CardTitle>Location</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateFormData("address", e.target.value)}
                        placeholder="e.g., 123 University Road"
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => updateFormData("city", e.target.value)}
                          placeholder="e.g., Johannesburg"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="province">Province *</Label>
                        <Select
                          value={formData.province}
                          onValueChange={(value) => updateFormData("province", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select province" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces.map((province) => (
                              <SelectItem key={province} value={province}>
                                {province}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e) => updateFormData("postalCode", e.target.value)}
                          placeholder="e.g., 2000"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Amenities */}
                <Card>
                  <CardHeader>
                    <CardTitle>Amenities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {amenitiesList.map((amenity) => (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            formData.amenities.includes(amenity)
                              ? "bg-amber-500 border-amber-500 text-gray-900"
                              : "bg-white border-gray-200 text-gray-700 hover:border-amber-500"
                          }`}
                        >
                          {amenity}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* NSFAS Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>NSFAS Accreditation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.nsfasApproved}
                        onChange={(e) => updateFormData("nsfasApproved", e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-sm text-gray-700">
                        This property is NSFAS approved
                      </span>
                    </label>
                  </CardContent>
                </Card>

                {/* Images Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle>Property Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-amber-500 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-1">
                        Click to upload images
                      </p>
                      <p className="text-xs text-gray-400">
                        PNG, JPG up to 5MB each
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Image upload will be available after property creation
                    </p>
                  </CardContent>
                </Card>

                {/* Submit */}
                <Card>
                  <CardContent className="p-4">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding Property...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Property
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => router.push("/properties")}
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default function AddPropertyPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <AddPropertyContent />
    </ProtectedRoute>
  );
}
