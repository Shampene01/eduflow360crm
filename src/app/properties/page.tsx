"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Users,
  Eye,
  Edit,
  Trash2,
  Filter,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Property } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function PropertiesContent() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProperties = async () => {
      const uid = user?.userId || user?.uid;
      if (!uid || !db) {
        setLoading(false);
        return;
      }

      try {
        const propertiesQuery = query(
          collection(db, "properties"),
          where("providerId", "==", uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(propertiesQuery);
        const propertiesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Property[];
        setProperties(propertiesData);
      } catch (error) {
        console.error("Error fetching properties:", error);
        // If there's an error (like missing index), set empty properties
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user?.userId, user?.uid]);

  const filteredProperties = properties.filter(
    (property) =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />

      <div className="flex flex-1">
        <Sidebar userType="provider" />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
              <p className="text-gray-500">Manage your accommodation properties</p>
            </div>
            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
              <Link href="/properties/add">
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Link>
            </Button>
          </div>

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search properties..."
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

          {/* Properties Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-lg" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProperties.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchTerm ? "No properties found" : "No properties yet"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Add your first property to get started"}
                </p>
                {!searchTerm && (
                  <Button asChild className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                    <Link href="/properties/add">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Property
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Property Image */}
                  <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative">
                    {property.images?.[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    <Badge
                      className={`absolute top-3 right-3 ${
                        property.status === "active"
                          ? "bg-green-500"
                          : property.status === "pending"
                          ? "bg-yellow-500"
                          : "bg-gray-500"
                      }`}
                    >
                      {property.status}
                    </Badge>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{property.name}</h3>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                      <MapPin className="w-4 h-4" />
                      {property.city}, {property.province}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>
                          {property.totalRooms - property.availableRooms}/{property.totalRooms} occupied
                        </span>
                      </div>
                      <span className="font-semibold text-amber-600">
                        R{property.pricePerMonth?.toLocaleString()}/mo
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/properties/${property.id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/properties/${property.id}/edit`}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <ProtectedRoute allowedUserTypes={["provider"]}>
      <PropertiesContent />
    </ProtectedRoute>
  );
}
