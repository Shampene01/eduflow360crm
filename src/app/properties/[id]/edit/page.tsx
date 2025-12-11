"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Lock, Info } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Property, Address, RoomConfiguration } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  getProviderByUserId,
  getPropertyById,
  getAddressById,
  getRoomConfiguration,
  updateProperty,
  updateRoomConfiguration,
} from "@/lib/db";

const availableAmenities = [
  "WiFi",
  "24/7 Security",
  "CCTV",
  "Parking",
  "Laundry",
  "Study Room",
  "Common Room",
  "Kitchen",
  "Backup Power",
  "Water Tank",
  "Cleaning Service",
  "Meal Plan",
  "Gym",
  "Swimming Pool",
  "Air Conditioning",
  "Heating",
];

const ROOM_TYPES = [
  { key: "bachelor", label: "Bachelor", description: "Single occupancy, self-contained unit" },
  { key: "singleEnSuite", label: "Single En-Suite", description: "Single room with private bathroom" },
  { key: "singleStandard", label: "Single Standard", description: "Single room with shared bathroom" },
  { key: "sharing2Beds_EnSuite", label: "Sharing (2 Beds) En-Suite", description: "2 beds per room with private bathroom" },
  { key: "sharing2Beds_Standard", label: "Sharing (2 Beds) Standard", description: "2 beds per room with shared bathroom" },
  { key: "sharing3Beds_EnSuite", label: "Sharing (3 Beds) En-Suite", description: "3 beds per room with private bathroom" },
  { key: "sharing3Beds_Standard", label: "Sharing (3 Beds) Standard", description: "3 beds per room with shared bathroom" },
];

interface PropertyWithAddress extends Property {
  address?: Address;
}

function PropertyEditContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [property, setProperty] = useState<PropertyWithAddress | null>(null);
  const [roomConfig, setRoomConfig] = useState<RoomConfiguration | null>(null);
  const [providerId, setProviderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    institution: "",
    amenities: [] as string[],
    managerName: "",
    managerId: "",
    managerEmail: "",
    managerPhone: "",
  });

  // Room configuration (editable)
  const [roomData, setRoomData] = useState({
    bachelor: 0,
    singleEnSuite: 0,
    singleStandard: 0,
    sharing2Beds_EnSuite: 0,
    sharing2Beds_Standard: 0,
    sharing3Beds_EnSuite: 0,
    sharing3Beds_Standard: 0,
    bachelorPrice: 0,
    singleEnSuitePrice: 0,
    singleStandardPrice: 0,
    sharing2Beds_EnSuitePrice: 0,
    sharing2Beds_StandardPrice: 0,
    sharing3Beds_EnSuitePrice: 0,
    sharing3Beds_StandardPrice: 0,
  });

  useEffect(() => {
    const fetchProperty = async () => {
      const uid = user?.userId || user?.uid;
      if (!id || !uid) return;

      try {
        const provider = await getProviderByUserId(uid);
        if (!provider) {
          toast.error("No provider found for user");
          setLoading(false);
          return;
        }
        setProviderId(provider.providerId);

        const propertyData = await getPropertyById(provider.providerId, id as string);
        if (!propertyData) {
          toast.error("Property not found");
          setLoading(false);
          return;
        }

        const address = propertyData.addressId ? await getAddressById(propertyData.addressId) : null;
        setProperty({ ...propertyData, address: address || undefined });

        // Load room configuration
        const config = await getRoomConfiguration(provider.providerId, id as string);
        setRoomConfig(config);

        // Initialize editable fields
        setEditData({
          name: propertyData.name || "",
          description: propertyData.description || "",
          institution: propertyData.institution || "",
          amenities: propertyData.amenities || [],
          managerName: propertyData.managerName || "",
          managerId: propertyData.managerId || "",
          managerEmail: propertyData.managerEmail || "",
          managerPhone: propertyData.managerPhone || "",
        });

        // Initialize room data
        if (config) {
          setRoomData({
            bachelor: config.bachelor || 0,
            singleEnSuite: config.singleEnSuite || 0,
            singleStandard: config.singleStandard || 0,
            sharing2Beds_EnSuite: config.sharing2Beds_EnSuite || 0,
            sharing2Beds_Standard: config.sharing2Beds_Standard || 0,
            sharing3Beds_EnSuite: config.sharing3Beds_EnSuite || 0,
            sharing3Beds_Standard: config.sharing3Beds_Standard || 0,
            bachelorPrice: config.bachelorPrice || 0,
            singleEnSuitePrice: config.singleEnSuitePrice || 0,
            singleStandardPrice: config.singleStandardPrice || 0,
            sharing2Beds_EnSuitePrice: config.sharing2Beds_EnSuitePrice || 0,
            sharing2Beds_StandardPrice: config.sharing2Beds_StandardPrice || 0,
            sharing3Beds_EnSuitePrice: config.sharing3Beds_EnSuitePrice || 0,
            sharing3Beds_StandardPrice: config.sharing3Beds_StandardPrice || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching property:", error);
        toast.error("Failed to load property");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, user?.userId, user?.uid]);

  const handleSave = async () => {
    if (!property || !providerId) return;

    setSaving(true);
    try {
      // Update property details
      await updateProperty(providerId, property.propertyId, {
        name: editData.name,
        description: editData.description,
        institution: editData.institution,
        amenities: editData.amenities,
        managerName: editData.managerName,
        managerId: editData.managerId,
        managerEmail: editData.managerEmail,
        managerPhone: editData.managerPhone,
      });

      // Update room configuration if it exists
      if (roomConfig) {
        // Calculate new totals
        const totalRooms = 
          roomData.bachelor +
          roomData.singleEnSuite +
          roomData.singleStandard +
          roomData.sharing2Beds_EnSuite +
          roomData.sharing2Beds_Standard +
          roomData.sharing3Beds_EnSuite +
          roomData.sharing3Beds_Standard;

        const totalBeds = 
          roomData.bachelor * 1 +
          roomData.singleEnSuite * 1 +
          roomData.singleStandard * 1 +
          roomData.sharing2Beds_EnSuite * 2 +
          roomData.sharing2Beds_Standard * 2 +
          roomData.sharing3Beds_EnSuite * 3 +
          roomData.sharing3Beds_Standard * 3;

        const potentialRevenue = 
          (roomData.bachelor * 1 * roomData.bachelorPrice) +
          (roomData.singleEnSuite * 1 * roomData.singleEnSuitePrice) +
          (roomData.singleStandard * 1 * roomData.singleStandardPrice) +
          (roomData.sharing2Beds_EnSuite * 2 * roomData.sharing2Beds_EnSuitePrice) +
          (roomData.sharing2Beds_Standard * 2 * roomData.sharing2Beds_StandardPrice) +
          (roomData.sharing3Beds_EnSuite * 3 * roomData.sharing3Beds_EnSuitePrice) +
          (roomData.sharing3Beds_Standard * 3 * roomData.sharing3Beds_StandardPrice);

        await updateRoomConfiguration(providerId, property.propertyId, {
          ...roomData,
          totalRooms,
          totalBeds,
          potentialRevenue,
        });

        // Update property bed counts
        await updateProperty(providerId, property.propertyId, {
          totalBeds,
          availableBeds: totalBeds, // Reset available beds (may need adjustment based on occupancy)
        });
      }

      toast.success("Property updated successfully");
      router.push(`/properties/${property.propertyId}`);
    } catch (error) {
      console.error("Error updating property:", error);
      toast.error("Failed to update property");
    } finally {
      setSaving(false);
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
              <CardContent className="py-12 text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Property Not Found</h2>
                <p className="text-gray-500 mb-4">The property you're looking for doesn't exist or you don't have access.</p>
                <Button asChild>
                  <Link href="/properties">Back to Properties</Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  // Calculate totals for display
  const totalRooms = 
    roomData.bachelor + roomData.singleEnSuite + roomData.singleStandard +
    roomData.sharing2Beds_EnSuite + roomData.sharing2Beds_Standard +
    roomData.sharing3Beds_EnSuite + roomData.sharing3Beds_Standard;

  const totalBeds = 
    roomData.bachelor + roomData.singleEnSuite + roomData.singleStandard +
    (roomData.sharing2Beds_EnSuite * 2) + (roomData.sharing2Beds_Standard * 2) +
    (roomData.sharing3Beds_EnSuite * 3) + (roomData.sharing3Beds_Standard * 3);

  const potentialRevenue = 
    (roomData.bachelor * roomData.bachelorPrice) +
    (roomData.singleEnSuite * roomData.singleEnSuitePrice) +
    (roomData.singleStandard * roomData.singleStandardPrice) +
    (roomData.sharing2Beds_EnSuite * 2 * roomData.sharing2Beds_EnSuitePrice) +
    (roomData.sharing2Beds_Standard * 2 * roomData.sharing2Beds_StandardPrice) +
    (roomData.sharing3Beds_EnSuite * 3 * roomData.sharing3Beds_EnSuitePrice) +
    (roomData.sharing3Beds_Standard * 3 * roomData.sharing3Beds_StandardPrice);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <div className="flex">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link href={`/properties/${property.propertyId}`}>
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
                <p className="text-gray-500">{property.name}</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Non-editable fields notice */}
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Note:</strong> Property address, ownership type, and property type cannot be changed after creation. 
              Contact support if you need to update these details.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Property Details</TabsTrigger>
              <TabsTrigger value="manager">Manager Details</TabsTrigger>
              <TabsTrigger value="rooms">Room Configuration</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
            </TabsList>

            {/* Property Details Tab */}
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Editable Fields */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Property Name *</Label>
                      <Input
                        id="name"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        rows={4}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="institution">Nearby Institution</Label>
                      <Input
                        id="institution"
                        value={editData.institution}
                        onChange={(e) => setEditData({ ...editData, institution: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  {/* Non-editable Fields */}
                  <div className="pt-6 border-t">
                    <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Non-editable Fields
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-500">Property Type</Label>
                        <Input value={property.propertyType} disabled className="mt-2 bg-gray-100" />
                      </div>
                      <div>
                        <Label className="text-gray-500">Ownership Type</Label>
                        <Input value={property.ownershipType} disabled className="mt-2 bg-gray-100" />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-gray-500">Address</Label>
                        <Input 
                          value={`${property.address?.street || ""}, ${property.address?.townCity || ""}, ${property.address?.province || ""}`} 
                          disabled 
                          className="mt-2 bg-gray-100" 
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manager Details Tab */}
            <TabsContent value="manager">
              <Card>
                <CardHeader>
                  <CardTitle>Property Manager Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="managerName">Manager Name</Label>
                      <Input
                        id="managerName"
                        value={editData.managerName}
                        onChange={(e) => setEditData({ ...editData, managerName: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="managerId">Manager ID Number</Label>
                      <Input
                        id="managerId"
                        value={editData.managerId}
                        onChange={(e) => setEditData({ ...editData, managerId: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="managerEmail">Manager Email</Label>
                      <Input
                        id="managerEmail"
                        type="email"
                        value={editData.managerEmail}
                        onChange={(e) => setEditData({ ...editData, managerEmail: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="managerPhone">Manager Phone</Label>
                      <Input
                        id="managerPhone"
                        value={editData.managerPhone}
                        onChange={(e) => setEditData({ ...editData, managerPhone: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Room Configuration Tab */}
            <TabsContent value="rooms">
              <Card>
                <CardHeader>
                  <CardTitle>Room Configuration & Pricing</CardTitle>
                  <p className="text-sm text-gray-500">Update room counts and bed prices</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ROOM_TYPES.map((roomType) => {
                    const countKey = roomType.key as keyof typeof roomData;
                    const priceKey = `${roomType.key}Price` as keyof typeof roomData;
                    const roomCount = roomData[countKey] as number;
                    const bedPrice = roomData[priceKey] as number;
                    const bedsPerRoom = roomType.key.includes("sharing3") ? 3 : roomType.key.includes("sharing2") ? 2 : 1;
                    const roomTotalBeds = roomCount * bedsPerRoom;
                    const monthlyRevenue = roomTotalBeds * bedPrice;

                    return (
                      <div key={roomType.key} className="p-4 border rounded-lg space-y-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{roomType.label}</h4>
                          <p className="text-sm text-gray-500">{roomType.description}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                          <div>
                            <Label className="text-xs text-gray-500">Number of Rooms</Label>
                            <Input
                              type="number"
                              min="0"
                              value={roomCount}
                              onChange={(e) => setRoomData({ ...roomData, [countKey]: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Bed Price/Month (R)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={bedPrice || ""}
                              onChange={(e) => setRoomData({ ...roomData, [priceKey]: parseInt(e.target.value) || 0 })}
                              disabled={roomCount === 0}
                            />
                          </div>
                          <div className="text-center">
                            <Label className="text-xs text-gray-500">Total Beds</Label>
                            <p className="text-lg font-semibold text-gray-700">{roomTotalBeds}</p>
                          </div>
                          <div className="text-center">
                            <Label className="text-xs text-gray-500">Monthly Revenue</Label>
                            <p className="text-lg font-semibold text-amber-600">R{monthlyRevenue.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Summary */}
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Rooms</p>
                        <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Beds</p>
                        <p className="text-2xl font-bold text-gray-900">{totalBeds}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Potential Monthly Revenue</p>
                        <p className="text-2xl font-bold text-amber-600">R{potentialRevenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Amenities Tab */}
            <TabsContent value="amenities">
              <Card>
                <CardHeader>
                  <CardTitle>Property Amenities</CardTitle>
                  <p className="text-sm text-gray-500">Select all amenities available at this property</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableAmenities.map((amenity) => (
                      <label
                        key={amenity}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          editData.amenities.includes(amenity)
                            ? "bg-amber-50 border-amber-500 text-amber-700"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={editData.amenities.includes(amenity)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditData({ ...editData, amenities: [...editData.amenities, amenity] });
                            } else {
                              setEditData({ ...editData, amenities: editData.amenities.filter(a => a !== amenity) });
                            }
                          }}
                          className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                        />
                        <span className="text-sm">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

export default function PropertyEditPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider", "admin"]}>
      <PropertyEditContent />
    </ProtectedRoute>
  );
}
