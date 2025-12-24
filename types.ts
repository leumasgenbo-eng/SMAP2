
export interface SubjectScore {
  subject: string;
  score: number;
}

export interface ComputedSubject extends SubjectScore {
  grade: string;
  gradeValue: number; // 1-9 for calculation
  remark: string;
  facilitator: string;
  zScore: number;
}

export interface ScoreDetail {
  sectionA: number;
  sectionB: number;
  total: number;
}

export interface StudentData {
  id: number;
  name: string;
  scores: Record<string, number>; // Legacy/Simple Total
  scoreDetails?: Record<string, ScoreDetail>; // Detailed breakdown
  subjectRemarks?: Record<string, string>; // Manual overrides for subject remarks
  overallRemark?: string; // Manual override for general remark (Class Teacher)
  finalRemark?: string; // Full override for the Report Card text (includes weakness etc)
  recommendation?: string; // Manual recommendation
  attendance?: string; // Attendance count
  
  // Bio-Data (Enrolment Synchronization)
  gender?: 'Male' | 'Female';
  dob?: string;
  guardian?: string;
  contact?: string;
  address?: string;

  // Daycare Specifics
  age?: string;
  promotedTo?: string;
  conduct?: string;
  interest?: string;
  skills?: Record<string, 'D' | 'A' | 'A+'>;
}

export interface ProcessedStudent {
  id: number;
  name: string;
  subjects: ComputedSubject[];
  totalScore: number;
  bestSixAggregate: number; // Lower is better
  bestCoreSubjects: ComputedSubject[];
  bestElectiveSubjects: ComputedSubject[];
  overallRemark: string;
  recommendation: string;
  weaknessAnalysis: string;
  category: string;
  rank: number;
  attendance?: string;

  // Daycare Specifics (Passed through)
  age?: string;
  promotedTo?: string;
  conduct?: string;
  interest?: string;
  skills?: Record<string, 'D' | 'A' | 'A+'>;
}

export interface ClassStatistics {
  subjectMeans: Record<string, number>;
  subjectStdDevs: Record<string, number>;
}

export interface StaffMember {
    id: string;
    name: string;
    role: 'Class Teacher' | 'Subject Teacher' | 'Both';
    status: 'Full Time' | 'Part Time';
    subjects: string[]; // List of subjects they teach
    contact: string;
    qualification: string;
}

export interface GlobalSettings {
  schoolName: string;
  examTitle: string;
  mockSeries: string;
  mockAnnouncement: string;
  mockDeadline: string;
  submittedSubjects: string[]; // List of subjects that have been "finalized"
  termInfo: string;
  academicYear: string;
  nextTermBegin: string;
  attendanceTotal: string;
  startDate: string;
  endDate: string;
  headTeacherName: string;
  reportDate: string;
  schoolContact: string;
  schoolEmail: string;
  facilitatorMapping: Record<string, string>;
  gradingSystemRemarks: Record<string, string>; // A1: "Excellent", B2: "Very Good" etc.
  activeIndicators: string[]; // List of active developmental indicators for Daycare
  customIndicators: string[]; // List of custom created indicators
  customSubjects: string[]; // List of custom subjects added by user
  
  // Staff / Facilitator Management
  staffList: StaffMember[];
}

export interface FacilitatorStats {
  facilitatorName: string;
  subject: string;
  studentCount: number;
  gradeCounts: Record<string, number>; // A1: 5, B2: 3 etc
  totalGradeValue: number; // Sum of (count * value)
  performancePercentage: number; // New formula result
  averageGradeValue: number;
  performanceGrade: string; // The grade assigned to the facilitator
}

// School System Types
export type Department = 
  | "Daycare"
  | "Nursery"
  | "Kindergarten"
  | "Lower Basic School"
  | "Upper Basic School"
  | "Junior High School";

export type SchoolClass = string; // e.g., "D1", "Basic 1", "JHS 1"

export type Module = 
  | "Time Table"
  | "Academic Calendar"
  | "Facilitator List"
  | "Pupil Enrolment"
  | "Examination"
  | "Lesson Plans"
  | "Exercise Assessment"
  | "Staff Movement"
  | "Materials & Logistics"
  | "Learner Materials & Booklist"
  | "Disciplinary"
  | "Special Event Day";
