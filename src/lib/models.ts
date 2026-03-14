import { Timestamp } from "firebase/firestore";

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string; // Changed from uid to id to match backend.json and rules
  email: string | null;
  displayName: string | null;
  role: UserRole;
  collegeId: string; // Changed from college to collegeId for institutional consistency
  isBlocked: boolean;
  createdAt: Timestamp;
}

export interface VisitLog {
  id: string;
  userId: string;
  userDisplayName: string;
  timestamp: Timestamp;
  purposeOfVisit: string;
  collegeId: string;
}

export interface College {
  id: string;
  name: string;
  addedAt: Timestamp;
}
