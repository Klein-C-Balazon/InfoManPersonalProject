
import { Timestamp } from "firebase/firestore";

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string; 
  email: string | null;
  displayName: string | null;
  role: UserRole;
  collegeId: string;
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
  collegeName?: string;
}

export interface College {
  id: string;
  name: string;
  addedAt: Timestamp;
}
