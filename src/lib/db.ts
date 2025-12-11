/**
 * DATABASE SERVICE
 * 
 * Provides CRUD operations for all normalized collections.
 * Implements the new data model with proper relationships.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  User,
  Address,
  AccommodationProvider,
  ProviderContactPerson,
  ProviderDocument,
  Property,
  RoomConfiguration,
  PropertyRoom,
  PropertyBed,
  Student,
  StudentPropertyAssignment,
  PropertyImage,
  PropertyDocument as PropertyDoc,
  PlatformResource,
  ResourceCategory,
  COLLECTIONS,
  ProviderWithDetails,
  PropertyWithDetails,
  ApprovalStatus,
  getPropertiesPath,
  getPropertyPath,
  getPropertyRoomsPath,
  getPropertyBedsPath,
  getPropertyImagesPath,
  getPropertyDocumentsPath,
} from "./schema";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generateId(): string {
  return doc(collection(db!, "temp")).id;
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function createUser(userId: string, userData: Omit<User, "uid" | "userId" | "createdAt">): Promise<User> {
  if (!db) throw new Error("Database not initialized");
  const user = {
    ...userData,
    uid: userId,           // Legacy field
    userId,                // New schema field
    createdAt: serverTimestamp() as Timestamp,
    isActive: true,
    emailVerified: false,
  } as User;
  
  await setDoc(doc(db, COLLECTIONS.USERS, userId), user);
  return user;
}

export async function getUserById(userId: string): Promise<User | null> {
  if (!db) return null;
  const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
  return docSnap.exists() ? (docSnap.data() as User) : null;
}

export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { ...data, updatedAt: serverTimestamp() });
}

// ============================================================================
// ADDRESS OPERATIONS
// ============================================================================

export async function createAddress(addressData: Omit<Address, "addressId" | "createdAt">): Promise<Address> {
  if (!db) throw new Error("Database not initialized");

  const addressId = generateId();

  // Filter out undefined values to avoid Firestore errors
  const cleanedData: Record<string, any> = {};
  Object.entries(addressData).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanedData[key] = value;
    }
  });

  const address: Address = {
    ...cleanedData,
    addressId,
    country: cleanedData.country || "South Africa",
    createdAt: serverTimestamp() as Timestamp,
  } as Address;

  await setDoc(doc(db, COLLECTIONS.ADDRESSES, addressId), address);
  return address;
}

export async function getAddressById(addressId: string): Promise<Address | null> {
  if (!db) return null;
  const docSnap = await getDoc(doc(db, COLLECTIONS.ADDRESSES, addressId));
  return docSnap.exists() ? (docSnap.data() as Address) : null;
}

export async function updateAddress(addressId: string, data: Partial<Address>): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, COLLECTIONS.ADDRESSES, addressId), { ...data, updatedAt: serverTimestamp() });
}

// ============================================================================
// ACCOMMODATION PROVIDER OPERATIONS
// ============================================================================

export async function createProvider(
  providerData: Omit<AccommodationProvider, "providerId" | "createdAt" | "approvalStatus">
): Promise<AccommodationProvider> {
  if (!db) throw new Error("Database not initialized");
  
  const providerId = generateId();
  const provider: AccommodationProvider = {
    ...providerData,
    providerId,
    approvalStatus: "Pending",
    nsfasAccredited: false,
    createdAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(doc(db, COLLECTIONS.ACCOMMODATION_PROVIDERS, providerId), provider);
  return provider;
}

export async function getProviderById(providerId: string): Promise<AccommodationProvider | null> {
  if (!db) return null;
  const docSnap = await getDoc(doc(db, COLLECTIONS.ACCOMMODATION_PROVIDERS, providerId));
  return docSnap.exists() ? (docSnap.data() as AccommodationProvider) : null;
}

export async function getProviderByUserId(userId: string): Promise<AccommodationProvider | null> {
  if (!db) return null;
  const q = query(
    collection(db, COLLECTIONS.ACCOMMODATION_PROVIDERS),
    where("userId", "==", userId),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as AccommodationProvider);
}

export async function updateProvider(providerId: string, data: Partial<AccommodationProvider>): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, COLLECTIONS.ACCOMMODATION_PROVIDERS, providerId), { 
    ...data, 
    updatedAt: serverTimestamp() 
  });
}

export async function updateProviderApproval(
  providerId: string,
  status: ApprovalStatus,
  approvedBy: string,
  rejectionReason?: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, COLLECTIONS.ACCOMMODATION_PROVIDERS, providerId), {
    approvalStatus: status,
    approvalTimestamp: serverTimestamp(),
    approvedBy,
    rejectionReason: rejectionReason || null,
    updatedAt: serverTimestamp(),
  });
}

export async function getProviderWithDetails(providerId: string): Promise<ProviderWithDetails | null> {
  if (!db) return null;
  
  const provider = await getProviderById(providerId);
  if (!provider) return null;
  
  const [user, physicalAddress, postalAddress, contacts, documents, properties] = await Promise.all([
    getUserById(provider.userId),
    provider.physicalAddressId ? getAddressById(provider.physicalAddressId) : null,
    provider.postalAddressId ? getAddressById(provider.postalAddressId) : null,
    getProviderContacts(providerId),
    getProviderDocuments(providerId),
    getPropertiesByProvider(providerId),
  ]);
  
  return {
    ...provider,
    user: user || undefined,
    physicalAddress: physicalAddress || undefined,
    postalAddress: postalAddress || undefined,
    contacts,
    documents,
    properties,
  };
}

// ============================================================================
// PROVIDER CONTACT PERSON OPERATIONS
// ============================================================================

export async function createProviderContact(
  contactData: Omit<ProviderContactPerson, "contactId" | "createdAt">
): Promise<ProviderContactPerson> {
  if (!db) throw new Error("Database not initialized");
  
  const contactId = generateId();
  const contact: ProviderContactPerson = {
    ...contactData,
    contactId,
    isActive: true,
    createdAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(doc(db, COLLECTIONS.PROVIDER_CONTACT_PERSONS, contactId), contact);
  return contact;
}

export async function getProviderContacts(providerId: string): Promise<ProviderContactPerson[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTIONS.PROVIDER_CONTACT_PERSONS),
    where("providerId", "==", providerId),
    where("isActive", "==", true),
    orderBy("isPrimary", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as ProviderContactPerson);
}

export async function updateProviderContact(contactId: string, data: Partial<ProviderContactPerson>): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, COLLECTIONS.PROVIDER_CONTACT_PERSONS, contactId), { 
    ...data, 
    updatedAt: serverTimestamp() 
  });
}

// ============================================================================
// PROVIDER DOCUMENT OPERATIONS
// ============================================================================

export async function createProviderDocument(
  docData: Omit<ProviderDocument, "documentId" | "uploadedAt" | "verified">
): Promise<ProviderDocument> {
  if (!db) throw new Error("Database not initialized");
  
  const documentId = generateId();
  const document: ProviderDocument = {
    ...docData,
    documentId,
    verified: false,
    uploadedAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(doc(db, COLLECTIONS.PROVIDER_DOCUMENTS, documentId), document);
  return document;
}

export async function getProviderDocuments(providerId: string): Promise<ProviderDocument[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTIONS.PROVIDER_DOCUMENTS),
    where("providerId", "==", providerId),
    orderBy("uploadedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as ProviderDocument);
}

export async function verifyProviderDocument(
  documentId: string,
  verifiedBy: string,
  notes?: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, COLLECTIONS.PROVIDER_DOCUMENTS, documentId), {
    verified: true,
    verifiedAt: serverTimestamp(),
    verifiedBy,
    verificationNotes: notes || null,
  });
}

// ============================================================================
// PROPERTY OPERATIONS (Subcollection: accommodationProviders/{providerId}/properties)
// ============================================================================

export async function createProperty(
  propertyData: Omit<Property, "propertyId" | "createdAt">
): Promise<Property> {
  if (!db) throw new Error("Database not initialized");
  
  const propertyId = generateId();
  const property: Property = {
    ...propertyData,
    propertyId,
    status: "Draft",
    nsfasApproved: false,
    createdAt: serverTimestamp() as Timestamp,
  };
  
  // Store in subcollection: accommodationProviders/{providerId}/properties/{propertyId}
  await setDoc(doc(db, getPropertyPath(propertyData.providerId, propertyId)), property);
  return property;
}

export async function getPropertyById(providerId: string, propertyId: string): Promise<Property | null> {
  if (!db) return null;
  const docSnap = await getDoc(doc(db, getPropertyPath(providerId, propertyId)));
  return docSnap.exists() ? (docSnap.data() as Property) : null;
}

export async function getPropertiesByProvider(providerId: string): Promise<Property[]> {
  if (!db) return [];
  const q = query(
    collection(db, getPropertiesPath(providerId)),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Property);
}

export async function updateProperty(providerId: string, propertyId: string, data: Partial<Property>): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, getPropertyPath(providerId, propertyId)), { 
    ...data, 
    updatedAt: serverTimestamp() 
  });
}

export async function deleteProperty(providerId: string, propertyId: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await deleteDoc(doc(db, getPropertyPath(providerId, propertyId)));
}

export async function getPropertyWithDetails(providerId: string, propertyId: string): Promise<PropertyWithDetails | null> {
  if (!db) return null;
  
  const property = await getPropertyById(providerId, propertyId);
  if (!property) return null;
  
  const [address, provider, roomConfig, rooms, images] = await Promise.all([
    getAddressById(property.addressId),
    getProviderById(providerId),
    getRoomConfiguration(propertyId),
    getPropertyRooms(providerId, propertyId),
    getPropertyImages(providerId, propertyId),
  ]);
  
  return {
    ...property,
    address: address || undefined,
    provider: provider || undefined,
    roomConfiguration: roomConfig || undefined,
    rooms,
    images,
  };
}

// ============================================================================
// ROOM CONFIGURATION OPERATIONS
// ============================================================================

export async function createRoomConfiguration(
  providerId: string,
  configData: Omit<RoomConfiguration, "configId" | "createdAt" | "totalRooms" | "totalBeds">
): Promise<RoomConfiguration> {
  if (!db) throw new Error("Database not initialized");
  
  const configId = generateId();
  
  // Calculate totals
  const totalRooms = 
    configData.bachelor +
    configData.singleEnSuite +
    configData.singleStandard +
    configData.sharing2Beds_EnSuite +
    configData.sharing2Beds_Standard +
    configData.sharing3Beds_EnSuite +
    configData.sharing3Beds_Standard;
  
  const totalBeds = 
    configData.bachelor * 1 +
    configData.singleEnSuite * 1 +
    configData.singleStandard * 1 +
    configData.sharing2Beds_EnSuite * 2 +
    configData.sharing2Beds_Standard * 2 +
    configData.sharing3Beds_EnSuite * 3 +
    configData.sharing3Beds_Standard * 3;
  
  const config: RoomConfiguration = {
    ...configData,
    configId,
    totalRooms,
    totalBeds,
    createdAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(doc(db, COLLECTIONS.ROOM_CONFIGURATIONS, configId), config);
  
  // Update property with bed counts
  await updateProperty(providerId, configData.propertyId, { totalBeds, availableBeds: totalBeds });
  
  return config;
}

export async function getRoomConfiguration(propertyId: string): Promise<RoomConfiguration | null> {
  if (!db) return null;
  const q = query(
    collection(db, COLLECTIONS.ROOM_CONFIGURATIONS),
    where("propertyId", "==", propertyId),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as RoomConfiguration);
}

export async function updateRoomConfiguration(configId: string, data: Partial<RoomConfiguration>): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, COLLECTIONS.ROOM_CONFIGURATIONS, configId), { 
    ...data, 
    updatedAt: serverTimestamp() 
  });
}

// ============================================================================
// PROPERTY ROOM OPERATIONS (Subcollection: .../properties/{propertyId}/rooms)
// ============================================================================

export async function createPropertyRoom(
  providerId: string,
  roomData: Omit<PropertyRoom, "roomId" | "createdAt">
): Promise<PropertyRoom> {
  if (!db) throw new Error("Database not initialized");
  
  const roomId = generateId();
  const room: PropertyRoom = {
    ...roomData,
    roomId,
    status: "Available",
    createdAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(doc(db, `${getPropertyRoomsPath(providerId, roomData.propertyId)}/${roomId}`), room);
  return room;
}

export async function getPropertyRooms(providerId: string, propertyId: string): Promise<PropertyRoom[]> {
  if (!db) return [];
  const q = query(
    collection(db, getPropertyRoomsPath(providerId, propertyId)),
    orderBy("roomNumber")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as PropertyRoom);
}

export async function getPropertyRoomById(providerId: string, propertyId: string, roomId: string): Promise<PropertyRoom | null> {
  if (!db) return null;
  const docSnap = await getDoc(doc(db, `${getPropertyRoomsPath(providerId, propertyId)}/${roomId}`));
  return docSnap.exists() ? (docSnap.data() as PropertyRoom) : null;
}

// ============================================================================
// PROPERTY BED OPERATIONS (Subcollection: .../properties/{propertyId}/beds)
// ============================================================================

export async function createPropertyBed(
  providerId: string,
  bedData: Omit<PropertyBed, "bedId" | "createdAt">
): Promise<PropertyBed> {
  if (!db) throw new Error("Database not initialized");
  
  const bedId = generateId();
  const bed: PropertyBed = {
    ...bedData,
    bedId,
    status: "Available",
    createdAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(doc(db, `${getPropertyBedsPath(providerId, bedData.propertyId)}/${bedId}`), bed);
  return bed;
}

export async function getPropertyBeds(providerId: string, propertyId: string): Promise<PropertyBed[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, getPropertyBedsPath(providerId, propertyId)));
  return snap.docs.map(d => d.data() as PropertyBed);
}

export async function getRoomBeds(providerId: string, propertyId: string, roomId: string): Promise<PropertyBed[]> {
  if (!db) return [];
  const q = query(
    collection(db, getPropertyBedsPath(providerId, propertyId)),
    where("roomId", "==", roomId),
    orderBy("bedLabel")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as PropertyBed);
}

export async function updateBedStatus(
  providerId: string, 
  propertyId: string, 
  bedId: string, 
  status: PropertyBed["status"], 
  studentId?: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, `${getPropertyBedsPath(providerId, propertyId)}/${bedId}`), {
    status,
    currentStudentId: studentId || null,
    updatedAt: serverTimestamp(),
  });
}

// ============================================================================
// STUDENT OPERATIONS
// ============================================================================

export async function createStudent(
  studentData: Omit<Student, "studentId" | "createdAt">
): Promise<Student> {
  if (!db) throw new Error("Database not initialized");
  
  const studentId = generateId();
  const student: Student = {
    ...studentData,
    studentId,
    status: "Pending",
    createdAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(doc(db, COLLECTIONS.STUDENTS, studentId), student);
  return student;
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  if (!db) return null;
  const docSnap = await getDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
  return docSnap.exists() ? (docSnap.data() as Student) : null;
}

export async function getStudentByIdNumber(idNumber: string): Promise<Student | null> {
  if (!db) return null;
  const q = query(
    collection(db, COLLECTIONS.STUDENTS),
    where("idNumber", "==", idNumber),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as Student);
}

export async function updateStudent(studentId: string, data: Partial<Student>): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, COLLECTIONS.STUDENTS, studentId), { 
    ...data, 
    updatedAt: serverTimestamp() 
  });
}

// ============================================================================
// STUDENT PROPERTY ASSIGNMENT OPERATIONS
// ============================================================================

export async function createStudentAssignment(
  assignmentData: Omit<StudentPropertyAssignment, "assignmentId" | "createdAt" | "status">
): Promise<StudentPropertyAssignment> {
  if (!db) throw new Error("Database not initialized");
  
  const assignmentId = generateId();
  const assignment: StudentPropertyAssignment = {
    ...assignmentData,
    assignmentId,
    status: "Active",
    createdAt: serverTimestamp() as Timestamp,
  };
  
  // Use batch to update assignment and bed status atomically
  const batch = writeBatch(db);
  
  batch.set(doc(db, COLLECTIONS.STUDENT_PROPERTY_ASSIGNMENTS, assignmentId), assignment);
  
  // Update bed status if bedId provided
  if (assignmentData.bedId) {
    batch.update(doc(db, COLLECTIONS.PROPERTY_BEDS, assignmentData.bedId), {
      status: "Occupied",
      currentStudentId: assignmentData.studentId,
      currentAssignmentId: assignmentId,
      updatedAt: serverTimestamp(),
    });
  }
  
  await batch.commit();
  return assignment;
}

export async function getStudentAssignments(studentId: string): Promise<StudentPropertyAssignment[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTIONS.STUDENT_PROPERTY_ASSIGNMENTS),
    where("studentId", "==", studentId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as StudentPropertyAssignment);
}

export async function getPropertyAssignments(propertyId: string, status?: string): Promise<StudentPropertyAssignment[]> {
  if (!db) return [];
  let q = query(
    collection(db, COLLECTIONS.STUDENT_PROPERTY_ASSIGNMENTS),
    where("propertyId", "==", propertyId)
  );
  if (status) {
    q = query(q, where("status", "==", status));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as StudentPropertyAssignment);
}

export async function closeStudentAssignment(
  assignmentId: string,
  closedBy: string,
  reason?: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  
  const assignmentDoc = await getDoc(doc(db, COLLECTIONS.STUDENT_PROPERTY_ASSIGNMENTS, assignmentId));
  if (!assignmentDoc.exists()) throw new Error("Assignment not found");
  
  const assignment = assignmentDoc.data() as StudentPropertyAssignment;
  
  const batch = writeBatch(db);
  
  // Update assignment
  batch.update(doc(db, COLLECTIONS.STUDENT_PROPERTY_ASSIGNMENTS, assignmentId), {
    status: "Closed",
    closedAt: serverTimestamp(),
    closedBy,
    closureReason: reason || null,
    updatedAt: serverTimestamp(),
  });
  
  // Free up the bed if assigned
  if (assignment.bedId) {
    batch.update(doc(db, COLLECTIONS.PROPERTY_BEDS, assignment.bedId), {
      status: "Available",
      currentStudentId: null,
      currentAssignmentId: null,
      updatedAt: serverTimestamp(),
    });
  }
  
  await batch.commit();
}

// ============================================================================
// PROPERTY IMAGE OPERATIONS (Subcollection: .../properties/{propertyId}/images)
// ============================================================================

export async function createPropertyImage(
  providerId: string,
  imageData: Omit<PropertyImage, "imageId" | "uploadedAt">
): Promise<PropertyImage> {
  if (!db) throw new Error("Database not initialized");
  
  const imageId = generateId();
  const image: PropertyImage = {
    ...imageData,
    imageId,
    uploadedAt: serverTimestamp() as Timestamp,
  };
  
  await setDoc(doc(db, `${getPropertyImagesPath(providerId, imageData.propertyId)}/${imageId}`), image);
  return image;
}

export async function getPropertyImages(providerId: string, propertyId: string): Promise<PropertyImage[]> {
  if (!db) return [];
  const q = query(
    collection(db, getPropertyImagesPath(providerId, propertyId)),
    orderBy("sortOrder")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as PropertyImage);
}

// ============================================================================
// PROPERTY DOCUMENT OPERATIONS
// ============================================================================

export async function createPropertyDocument(
  providerId: string,
  docData: Omit<PropertyDoc, "documentId" | "uploadedAt" | "verified">
): Promise<PropertyDoc> {
  if (!db) throw new Error("Database not initialized");

  const documentId = generateId();
  const document: PropertyDoc = {
    ...docData,
    documentId,
    verified: false,
    uploadedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(doc(db, `${getPropertyDocumentsPath(providerId, docData.propertyId)}/${documentId}`), document);
  return document;
}

export async function getPropertyDocuments(providerId: string, propertyId: string): Promise<PropertyDoc[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, getPropertyDocumentsPath(providerId, propertyId)));
  return snap.docs.map(d => d.data() as PropertyDoc);
}

// ============================================================================
// DASHBOARD STATISTICS
// ============================================================================

export async function getProviderDashboardStats(providerId: string) {
  if (!db) return null;
  
  const [properties, assignments] = await Promise.all([
    getPropertiesByProvider(providerId),
    Promise.all([]).then(async () => {
      // Get all active assignments for provider's properties
      const propertyIds = (await getPropertiesByProvider(providerId)).map(p => p.propertyId);
      if (propertyIds.length === 0) return [];
      
      const assignmentPromises = propertyIds.map(pid => getPropertyAssignments(pid, "Active"));
      const results = await Promise.all(assignmentPromises);
      return results.flat();
    }),
  ]);
  
  const totalBeds = properties.reduce((sum, p) => sum + (p.totalBeds || 0), 0);
  const occupiedBeds = properties.reduce((sum, p) => sum + ((p.totalBeds || 0) - (p.availableBeds || 0)), 0);
  
  return {
    totalProperties: properties.length,
    totalBeds,
    occupiedBeds,
    availableBeds: totalBeds - occupiedBeds,
    occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    activeStudents: assignments.length,
  };
}

// ============================================================================
// PLATFORM RESOURCES
// ============================================================================

export async function createPlatformResource(
  resourceData: Omit<PlatformResource, "resourceId" | "uploadedAt" | "uploadedBy">,
  uploadedBy: string
): Promise<PlatformResource> {
  if (!db) throw new Error("Database not initialized");

  const resourceId = generateId();
  const resource: PlatformResource = {
    ...resourceData,
    resourceId,
    uploadedAt: serverTimestamp() as Timestamp,
    uploadedBy,
  };

  await setDoc(doc(db, COLLECTIONS.PLATFORM_RESOURCES, resourceId), resource);
  return resource;
}

export async function getPlatformResources(
  category?: ResourceCategory
): Promise<PlatformResource[]> {
  if (!db) {
    console.log("DB not initialized");
    return [];
  }

  try {
    let q;
    if (category) {
      q = query(
        collection(db, COLLECTIONS.PLATFORM_RESOURCES),
        where("category", "==", category)
      );
    } else {
      // Simple query without orderBy to avoid index requirements
      q = query(collection(db, COLLECTIONS.PLATFORM_RESOURCES));
    }

    console.log("Querying collection:", COLLECTIONS.PLATFORM_RESOURCES);
    const snap = await getDocs(q);
    console.log("Query returned", snap.docs.length, "documents");
    
    const resources = snap.docs.map(d => {
      const data = d.data();
      console.log("Document data:", data);
      return data as PlatformResource;
    });
    
    // Sort by uploadedAt client-side
    return resources.sort((a, b) => {
      const aTime = a.uploadedAt?.toMillis?.() || 0;
      const bTime = b.uploadedAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Error in getPlatformResources:", error);
    return [];
  }
}

export async function getPlatformResourceById(
  resourceId: string
): Promise<PlatformResource | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COLLECTIONS.PLATFORM_RESOURCES, resourceId));
  return snap.exists() ? (snap.data() as PlatformResource) : null;
}

export async function updatePlatformResource(
  resourceId: string,
  updates: Partial<PlatformResource>
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, COLLECTIONS.PLATFORM_RESOURCES, resourceId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePlatformResource(resourceId: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await deleteDoc(doc(db, COLLECTIONS.PLATFORM_RESOURCES, resourceId));
}

export async function incrementDownloadCount(resourceId: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  await updateDoc(doc(db, COLLECTIONS.PLATFORM_RESOURCES, resourceId), {
    downloadCount: increment(1),
  });
}
