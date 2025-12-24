

import { StudentData, Department } from './types';

export const JHS_SUBJECT_LIST = [
  "English Language",
  "Mathematics",
  "Science",
  "Social Studies",
  "Career Technology",
  "Creative Arts and Designing",
  "Ghana Language (Twi)",
  "Religious and Moral Education",
  "Computing",
  "French"
];

// Mapped subjects for Basic School (Lower and Upper)
export const BASIC_SUBJECT_LIST = [
  "English Language",
  "Mathematics",
  "Science",
  "History",
  "Physical Education",
  "Creativity", // Renamed from Creative Arts as requested
  "Ghana Language (Twi)",
  "Religious and Moral Education",
  "I.C.T",
  "French"
];

export const DAYCARE_SUBJECTS = [
  "LANGUAGE AND LITERACY",
  "NUMERACY",
  "CREATIVE ACTIVITIES",
  "OUR WORLD OUR PEOPLE"
];

export const DAYCARE_SKILLS = [
  "ENJOY RUNNING AND CLIMBING",
  "INDICATE TOILET NEEDS",
  "PERFORM SELFHELP ACTIVITIES – DRESSING UP / WASHING",
  "ENJOY PLAYING WITH OTHER CHILDREN",
  "WILLINGLY SHARES FOOD / PLAY WITH OTHERS",
  "INTEREST IN DANCE, DRAMA, SOCIAL AND CULTURAL ACTIVITIES",
  "LOOKS HAPPY AND CHEERFUL DURING PLAY AND OTHER ACTIVITIES",
  "INDENTIFY FAMILIAR NATURE SOUNDS",
  "IDENTIFY MECHANICAL SOUNDS",
  "INTEREST IN PAINTING, MOULDING, ART AND CREATIVE WORK",
  "SAY AND ACT SIMPLE NURSERY RHYMES"
];

export const DAYCARE_INDICATORS = [
  "ENJOY RUNNING AND CLIMBING",
  "INDICATE TOILET NEEDS",
  "PERFORM SELFHELP ACTIVITIES – DRESSING UP / WASHING",
  "ENJOY PLAYING WITH OTHER CHILDREN",
  "WILLINGLY SHARES FOOD / PLAY WITH OTHERS",
  "INTEREST IN DANCE, DRAMA, SOCIAL AND CULTURAL ACTIVITIES",
  "LOOKS HAPPY AND CHEERFUL DURING PLAY AND OTHER ACTIVITIES",
  "INDENTIFY FAMILIAR NATURE SOUNDS",
  "IDENTIFY MECHANICAL SOUNDS",
  "INTEREST IN PAINTING, MOULDING, ART AND CREATIVE WORK",
  "SAY AND ACT SIMPLE NURSERY RHYMES"
];

// Helper to get subjects based on department
export const getSubjectsForDepartment = (dept: Department): string[] => {
    if (dept === "Daycare" || dept === "Nursery" || dept === "Kindergarten") return DAYCARE_SUBJECTS;
    if (dept === "Junior High School") return JHS_SUBJECT_LIST;
    if (dept === "Lower Basic School" || dept === "Upper Basic School") return BASIC_SUBJECT_LIST;
    return JHS_SUBJECT_LIST; // Default fallback
};

export const SUBJECT_LIST = JHS_SUBJECT_LIST; // Default legacy export

export const CORE_SUBJECTS = ["Mathematics", "English Language", "Social Studies", "Science", "History"];
// Remaining are treated as Electives for the purpose of "Best 2 Electives" calculation

export const FACILITATORS: Record<string, string> = {
  "Science": "SIR JOSHUA",
  "Computing": "SIR ISAAC",
  "I.C.T": "SIR ISAAC",
  "Mathematics": "SIR SAMMY",
  "Religious and Moral Education": "MADAM JANE",
  "Creative Arts and Designing": "MADAM NORTEY", // JHS Name
  "Creative Arts": "MADAM NORTEY", // Legacy/Variant
  "Creativity": "MADAM NORTEY", // Basic School Name
  "CREATIVE ACTIVITIES": "MADAM NORTEY", // Daycare Name
  "French": "SIR CHARLES",
  "Social Studies": "SIR ASHMIE",
  "History": "SIR ASHMIE",
  "English Language": "MADAM NANCY",
  "LANGUAGE AND LITERACY": "MADAM NANCY",
  "Ghana Language (Twi)": "MADAM RITA",
  "Career Technology": "SIR JOSHUA",
  "Physical Education": "SIR JOSHUA",
  "OUR WORLD OUR PEOPLE": "MADAM JANE",
  "NUMERACY": "SIR SAMMY"
};

// Default Grading Remarks
export const DEFAULT_GRADING_REMARKS: Record<string, string> = {
    'A1': 'Excellent',
    'B2': 'Very Good',
    'B3': 'Good',
    'C4': 'Credit',
    'C5': 'Credit',
    'C6': 'Credit',
    'D7': 'Pass',
    'E8': 'Pass',
    'F9': 'Fail'
};

// Raw data parsed from the user prompt
export const RAW_STUDENTS: StudentData[] = [
  { id: 1, name: "MASOUD HARUNA", scores: { "English Language": 73, "Mathematics": 70, "Science": 84, "Social Studies": 86, "Career Technology": 84, "Creative Arts and Designing": 80, "Ghana Language (Twi)": 72, "Religious and Moral Education": 100, "Computing": 71, "French": 88 } },
  { id: 2, name: "OFFEI OSEI EDMUND", scores: { "English Language": 76, "Mathematics": 69, "Science": 79, "Social Studies": 84, "Career Technology": 76, "Creative Arts and Designing": 81, "Ghana Language (Twi)": 90, "Religious and Moral Education": 97, "Computing": 73, "French": 71 } },
  { id: 3, name: "FRIMPONG CHARLES", scores: { "English Language": 71, "Mathematics": 75, "Science": 81, "Social Studies": 90, "Career Technology": 81, "Creative Arts and Designing": 82, "Ghana Language (Twi)": 85, "Religious and Moral Education": 91, "Computing": 72, "French": 65 } },
  { id: 4, name: "ADDY GODWILL", scores: { "English Language": 64, "Mathematics": 63, "Science": 89, "Social Studies": 85, "Career Technology": 80, "Creative Arts and Designing": 82, "Ghana Language (Twi)": 69, "Religious and Moral Education": 88, "Computing": 67, "French": 64 } },
  { id: 5, name: "SEDOFIA HEPHZIBA", scores: { "English Language": 68, "Mathematics": 63, "Science": 66, "Social Studies": 84, "Career Technology": 91, "Creative Arts and Designing": 77, "Ghana Language (Twi)": 68, "Religious and Moral Education": 98, "Computing": 61, "French": 79 } },
  { id: 6, name: "HAMMOND EMMANUELLA", scores: { "English Language": 65, "Mathematics": 60, "Science": 69, "Social Studies": 84, "Career Technology": 84, "Creative Arts and Designing": 83, "Ghana Language (Twi)": 81, "Religious and Moral Education": 96, "Computing": 63, "French": 60 } },
  { id: 7, name: "AGYEMANG DANIEL", scores: { "English Language": 56, "Mathematics": 66, "Science": 72, "Social Studies": 91, "Career Technology": 88, "Creative Arts and Designing": 72, "Ghana Language (Twi)": 71, "Religious and Moral Education": 93, "Computing": 65, "French": 69 } },
  { id: 8, name: "ADAMS LATIFA", scores: { "English Language": 61, "Mathematics": 55, "Science": 73, "Social Studies": 70, "Career Technology": 91, "Creative Arts and Designing": 79, "Ghana Language (Twi)": 78, "Religious and Moral Education": 99, "Computing": 64, "French": 69 } },
  { id: 9, name: "NAZAR REGINA", scores: { "English Language": 63, "Mathematics": 47, "Science": 66, "Social Studies": 84, "Career Technology": 82, "Creative Arts and Designing": 78, "Ghana Language (Twi)": 83, "Religious and Moral Education": 92, "Computing": 56, "French": 58 } },
  { id: 10, name: "EUGEINA MILLS", scores: { "English Language": 67, "Mathematics": 54, "Science": 64, "Social Studies": 82, "Career Technology": 84, "Creative Arts and Designing": 72, "Ghana Language (Twi)": 70, "Religious and Moral Education": 96, "Computing": 56, "French": 65 } },
  { id: 11, name: "BENTIL BAABA", scores: { "English Language": 64, "Mathematics": 53, "Science": 64, "Social Studies": 80, "Career Technology": 90, "Creative Arts and Designing": 74, "Ghana Language (Twi)": 69, "Religious and Moral Education": 94, "Computing": 53, "French": 64 } },
  { id: 12, name: "KPEKPO COMFORT", scores: { "English Language": 64, "Mathematics": 54, "Science": 68, "Social Studies": 73, "Career Technology": 80, "Creative Arts and Designing": 71, "Ghana Language (Twi)": 75, "Religious and Moral Education": 96, "Computing": 62, "French": 64 } },
  { id: 13, name: "KANZONI GRACIOUS", scores: { "English Language": 55, "Mathematics": 56, "Science": 72, "Social Studies": 78, "Career Technology": 84, "Creative Arts and Designing": 76, "Ghana Language (Twi)": 57, "Religious and Moral Education": 90, "Computing": 60, "French": 58 } },
  { id: 14, name: "CUDJOE FLORENCE", scores: { "English Language": 68, "Mathematics": 75, "Science": 90, "Social Studies": 80, "Career Technology": 60, "Creative Arts and Designing": 92, "Ghana Language (Twi)": 35, "Religious and Moral Education": 65, "Computing": 71, "French": 63 } },
  { id: 15, name: "ANIAPAM MARNAL", scores: { "English Language": 67, "Mathematics": 52, "Science": 91, "Social Studies": 58, "Career Technology": 57, "Creative Arts and Designing": 95, "Ghana Language (Twi)": 42, "Religious and Moral Education": 73, "Computing": 72, "French": 58 } },
  { id: 16, name: "BINMEY JOSEPHINE", scores: { "English Language": 58, "Mathematics": 61, "Science": 85, "Social Studies": 77, "Career Technology": 57, "Creative Arts and Designing": 90, "Ghana Language (Twi)": 46, "Religious and Moral Education": 77, "Computing": 76, "French": 66 } },
  { id: 17, name: "SHAIBU FARIDA", scores: { "English Language": 61, "Mathematics": 62, "Science": 74, "Social Studies": 68, "Career Technology": 57, "Creative Arts and Designing": 92, "Ghana Language (Twi)": 49, "Religious and Moral Education": 71, "Computing": 71, "French": 68 } },
  { id: 18, name: "OWUSU ISAAC", scores: { "English Language": 51, "Mathematics": 49, "Science": 81, "Social Studies": 77, "Career Technology": 50, "Creative Arts and Designing": 86, "Ghana Language (Twi)": 33, "Religious and Moral Education": 73, "Computing": 64, "French": 62 } },
  { id: 19, name: "ANANE FELICITY", scores: { "English Language": 45, "Mathematics": 45, "Science": 81, "Social Studies": 73, "Career Technology": 54, "Creative Arts and Designing": 91, "Ghana Language (Twi)": 48, "Religious and Moral Education": 62, "Computing": 70, "French": 58 } },
  { id: 20, name: "ANDANI SULLEYMAN", scores: { "English Language": 51, "Mathematics": 33, "Science": 82, "Social Studies": 63, "Career Technology": 52, "Creative Arts and Designing": 87, "Ghana Language (Twi)": 25, "Religious and Moral Education": 64, "Computing": 68, "French": 75 } },
  { id: 21, name: "ANIAPAM ALHAJI", scores: { "English Language": 47, "Mathematics": 49, "Science": 84, "Social Studies": 54, "Career Technology": 50, "Creative Arts and Designing": 94, "Ghana Language (Twi)": 42, "Religious and Moral Education": 60, "Computing": 47, "French": 43 } },
  { id: 22, name: "YELEBI ALI FAWAZ", scores: { "English Language": 39, "Mathematics": 52, "Science": 78, "Social Studies": 62, "Career Technology": 44, "Creative Arts and Designing": 94, "Ghana Language (Twi)": 41, "Religious and Moral Education": 54, "Computing": 64, "French": 60 } },
  { id: 23, name: "YAKUBU NAAHIMA", scores: { "English Language": 40, "Mathematics": 41, "Science": 73, "Social Studies": 76, "Career Technology": 40, "Creative Arts and Designing": 88, "Ghana Language (Twi)": 23, "Religious and Moral Education": 51, "Computing": 76, "French": 70 } },
  { id: 24, name: "KISSI OSEI KELVIN", scores: { "English Language": 48, "Mathematics": 45, "Science": 67, "Social Studies": 68, "Career Technology": 54, "Creative Arts and Designing": 90, "Ghana Language (Twi)": 26, "Religious and Moral Education": 56, "Computing": 64, "French": 52 } },
  { id: 25, name: "YAJUBU NIHAAD", scores: { "English Language": 44, "Mathematics": 42, "Science": 66, "Social Studies": 76, "Career Technology": 40, "Creative Arts and Designing": 93, "Ghana Language (Twi)": 25, "Religious and Moral Education": 59, "Computing": 59, "French": 68 } },
  { id: 26, name: "BOTCHWAY KATURAH", scores: { "English Language": 37, "Mathematics": 50, "Science": 72, "Social Studies": 59, "Career Technology": 35, "Creative Arts and Designing": 82, "Ghana Language (Twi)": 26, "Religious and Moral Education": 53, "Computing": 67, "French": 63 } },
];
