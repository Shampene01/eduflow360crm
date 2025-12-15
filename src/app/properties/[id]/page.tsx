"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  MapPin,
  Users,
  DollarSign,
  Edit,
  Trash2,
  CheckCircle,
  Wifi,
  Car,
  Shield,
  Loader2,
  UserPlus,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Property, Address, RoomConfiguration, PropertyDocument, PropertyImage } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProviderByUserId, getPropertyById, getAddressById, getRoomConfiguration, updateProperty, getPropertyAssignments, getPropertyDocuments, getPropertyImages } from "@/lib/db";
import { syncPropertyToCRM } from "@/lib/crmSync";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PropertyWithAddress extends Property {
  address?: Address;
  roomConfig?: RoomConfiguration;
  documents?: PropertyDocument[];
  images?: PropertyImage[];
}

function PropertyDetailsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [property, setProperty] = useState<PropertyWithAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState<string>("");
  const [deactivating, setDeactivating] = useState(false);
  const [assignedStudentsCount, setAssignedStudentsCount] = useState<number>(0);
  const [syncingToDataverse, setSyncingToDataverse] = useState(false);
  const [providerDataverseId, setProviderDataverseId] = useState<string>("");
  const [userDataverseId, setUserDataverseId] = useState<string>("");

  useEffect(() => {
    const fetchProperty = async () => {
      const uid = user?.userId || user?.uid;
      if (!id || !uid) return;

      try {
        // First get the provider for this user
        const provider = await getProviderByUserId(uid);
        if (!provider) {
          console.error("No provider found for user");
          setLoading(false);
          return;
        }
        setProviderId(provider.providerId);

        // Store provider and user Dataverse IDs for sync
        setProviderDataverseId(provider.dataverseId || "");
        setUserDataverseId(user?.dataverseId || "");

        // Fetch property from subcollection using provider ID
        const propertyData = await getPropertyById(provider.providerId, id as string);
        if (propertyData) {
          // Fetch address if addressId exists
          const address = propertyData.addressId ? await getAddressById(propertyData.addressId) : null;
          // Fetch room configuration for pricing
          const roomConfig = await getRoomConfiguration(provider.providerId, id as string);
          // Fetch documents and images for the property
          const documents = await getPropertyDocuments(provider.providerId, id as string);
          const images = await getPropertyImages(provider.providerId, id as string);
          setProperty({ 
            ...propertyData, 
            address: address || undefined, 
            roomConfig: roomConfig || undefined,
            documents: documents || [],
            images: images || []
          });
          
          // Fetch active student assignments to calculate occupancy
          const assignments = await getPropertyAssignments(id as string);
          const activeAssignments = assignments.filter(a => a.status === "Active");
          setAssignedStudentsCount(activeAssignments.length);
        }
      } catch (error) {
        console.error("Error fetching property:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, user?.userId, user?.uid]);

  // Soft delete - set property status to Inactive
  const handleDeactivateProperty = async () => {
    if (!property || !providerId) return;
    
    setDeactivating(true);
    try {
      await updateProperty(providerId, property.propertyId, { status: "Inactive" });
      setProperty({ ...property, status: "Inactive" });
      toast.success("Property has been deactivated");
    } catch (error) {
      console.error("Error deactivating property:", error);
      toast.error("Failed to deactivate property");
    } finally {
      setDeactivating(false);
    }
  };

  // Handle Sync to Dataverse
  const handleSyncToDataverse = async () => {
    if (!property || !providerId) return;
    
    // Check if provider has been synced to Dataverse first
    if (!providerDataverseId) {
      toast.error("Provider must be synced to Dataverse first");
      return;
    }
    
    setSyncingToDataverse(true);
    try {
      // Fetch latest documents and images before sync
      const latestDocs = await getPropertyDocuments(providerId, property.propertyId);
      const latestImages = await getPropertyImages(providerId, property.propertyId);
      
      const result = await syncPropertyToCRM(
        property,
        providerDataverseId,
        userDataverseId,
        property.address || null,
        latestDocs,
        latestImages,
        property.roomConfig || null
      );
      
      if (result.success) {
        toast.success("Property synced to Dataverse successfully");
        if (result.propertyDataverseId) {
          setProperty({ ...property, dataverseId: result.propertyDataverseId });
        }
      } else {
        toast.error(result.message || "Failed to sync to Dataverse");
        console.error("Dataverse sync error:", result.error);
      }
    } catch (error) {
      console.error("Error syncing to Dataverse:", error);
      toast.error("Failed to sync to Dataverse");
    } finally {
      setSyncingToDataverse(false);
    }
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

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="flex">
          <Sidebar userType="provider" />
          <main className="flex-1 p-8">
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Property not found
                </h3>
                <p className="text-gray-500 mb-6">
                  The property you&apos;re looking for doesn&apos;t exist or has been removed.
                </p>
                <Button asChild>
                  <Link href="/properties">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Properties
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const totalBeds = property.totalBeds || 0;
  const availableBeds = Math.max(0, totalBeds - assignedStudentsCount);
  const occupancyRate = totalBeds > 0
    ? Math.round((assignedStudentsCount / totalBeds) * 100)
    : 0;

  // Calculate lowest bed price from room configuration
  const getLowestBedPrice = () => {
    if (!property.roomConfig) return 0;
    const prices = [
      property.roomConfig.bachelor > 0 ? property.roomConfig.bachelorPrice : null,
      property.roomConfig.singleEnSuite > 0 ? property.roomConfig.singleEnSuitePrice : null,
      property.roomConfig.singleStandard > 0 ? property.roomConfig.singleStandardPrice : null,
      property.roomConfig.sharing2Beds_EnSuite > 0 ? property.roomConfig.sharing2Beds_EnSuitePrice : null,
      property.roomConfig.sharing2Beds_Standard > 0 ? property.roomConfig.sharing2Beds_StandardPrice : null,
      property.roomConfig.sharing3Beds_EnSuite > 0 ? property.roomConfig.sharing3Beds_EnSuitePrice : null,
      property.roomConfig.sharing3Beds_Standard > 0 ? property.roomConfig.sharing3Beds_StandardPrice : null,
    ].filter((p): p is number => p !== null && p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };
  const lowestBedPrice = getLowestBedPrice();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <div className="flex">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link href="/properties">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                  <Badge
                    className={
                      property.status === "Active"
                        ? "bg-green-500"
                        : property.status === "Pending"
                        ? "bg-yellow-500"
                        : property.status === "Draft"
                        ? "bg-blue-500"
                        : "bg-gray-500"
                    }
                  >
                    {property.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-gray-500 mt-1">
                  <MapPin className="w-4 h-4" />
                  {property.address?.townCity || "Location not set"}{property.address?.province ? `, ${property.address.province}` : ""}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                <Link href={`/properties/${property.propertyId}/students`}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Students
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/properties/${property.propertyId}/edit`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Link>
              </Button>
              {/* Sync to Dataverse button - only visible for Admin (roleCode >= 3) */}
              {(user?.roleCode ?? 0) >= 3 && (
                <Button
                  onClick={handleSyncToDataverse}
                  disabled={syncingToDataverse}
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {syncingToDataverse ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync to Dataverse
                    </>
                  )}
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={property.status === "Inactive" || deactivating}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {property.status === "Inactive" ? "Deactivated" : "Deactivate"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Deactivate Property
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to deactivate <strong>{property.name}</strong>? 
                      This will set the property status to Inactive. Students will no longer be able to be assigned to this property.
                      You can reactivate the property later from the edit page.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeactivateProperty}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {deactivating ? "Deactivating..." : "Yes, Deactivate"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Image */}
              <Card className="overflow-hidden">
                <div className="h-64 md:h-80 bg-gradient-to-br from-gray-200 to-gray-300 relative">
                  {property.coverImageUrl ? (
                    <img
                      src={property.coverImageUrl}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-24 h-24 text-gray-400" />
                    </div>
                  )}
                  {property.nsfasApproved && (
                    <Badge className="absolute top-4 left-4 bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      NSFAS Approved
                    </Badge>
                  )}
                </div>
              </Card>

              {/* Description & Details */}
              <Card>
                <CardHeader>
                  <CardTitle>About This Property</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600 leading-relaxed">
                      {property.description || "No description provided."}
                    </p>
                  </div>

                  {/* Property Details */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Property Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Property Type</p>
                        <p className="font-medium text-gray-900">{property.propertyType || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Ownership Type</p>
                        <p className="font-medium text-gray-900">{property.ownershipType || "Not specified"}</p>
                      </div>
                      {property.institution && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Nearby Institution</p>
                          <p className="font-medium text-gray-900">{property.institution}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Property Manager Details */}
                  {(property.managerName || property.managerEmail || property.managerPhone) && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Property Manager</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {property.managerName && (
                          <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="font-medium text-gray-900">{property.managerName}</p>
                          </div>
                        )}
                        {property.managerId && (
                          <div>
                            <p className="text-sm text-gray-500">ID Number</p>
                            <p className="font-medium text-gray-900">{property.managerId}</p>
                          </div>
                        )}
                        {property.managerEmail && (
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium text-gray-900">{property.managerEmail}</p>
                          </div>
                        )}
                        {property.managerPhone && (
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium text-gray-900">{property.managerPhone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Amenities */}
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  {property.amenities && property.amenities.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {property.amenities.map((amenity) => (
                        <div
                          key={amenity}
                          className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No amenities listed.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-amber-500" />
                      <span className="text-gray-600">Monthly Rent</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">Starts from</span>
                      <p className="font-semibold text-gray-900">
                        R{lowestBedPrice > 0 ? lowestBedPrice.toLocaleString() : "0"}/bed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      <span className="text-gray-600">Total Beds</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {totalBeds}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-500" />
                      <span className="text-gray-600">Available Beds</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {availableBeds}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <span className="text-gray-600">Occupancy Rate</span>
                    <span className="font-semibold text-amber-600">
                      {occupancyRate}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">{property.address?.street || "Address not set"}</p>
                    <p className="text-gray-600">
                      {property.address?.townCity || ""}{property.address?.province ? `, ${property.address.province}` : ""}
                    </p>
                    {property.address?.postalCode && (
                      <p className="text-gray-600">{property.address.postalCode}</p>
                    )}
                  </div>
                  <div className="mt-4 h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Map view coming soon</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900">
                    <Link href={`/properties/${property.propertyId}/students`}>
                      <Users className="w-4 h-4 mr-2" />
                      Manage Students
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full">
                    View Invoices
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <DashboardFooter />
      </div>
    </div>
  );
}

export default function PropertyDetailsPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <PropertyDetailsContent />
    </ProtectedRoute>
  );
}
