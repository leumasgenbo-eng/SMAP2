import React, { useState, useMemo, useEffect } from 'react';
import EditableField from './EditableField';
import { Department, Module, SchoolClass, GlobalSettings, StudentData, StaffMember } from '../types';
import { DAYCARE_INDICATORS, getSubjectsForDepartment } from '../constants';

interface GenericModuleProps {
  department: Department;
  schoolClass: SchoolClass;
  module: Module;
  settings?: GlobalSettings;
  onSettingChange?: (key: keyof GlobalSettings, value: any) => void;
  students?: StudentData[]; // Shared State
  setStudents?: React.Dispatch<React.SetStateAction<StudentData[]>>; // Shared Setter
}

// Mock Data Types for Attendance
type AttendanceStatus = 'P' | 'A' | 'WP' | 'WOP' | 'H'; // Present, Absent, With Permission, Without Permission, Holiday

// Exercise Assessment Types
interface AssessmentExercise {
    id: string;
    date: string;
    type: 'Class' | 'Home';
    source: 'Exercise Book' | 'Textbook';
    exerciseNo: string;
    maxScore: number;
    topic?: string;
    subject?: string;
    term?: string;
}

interface MonitoringLog {
    id: string;
    date: string;
    week: string;
    subject: string;
    source: string;
    term?: string;
    unmarked: number;
    undated: number;
    untitled: number;
    uncorrected: number;
    correctedNotMarked: number;
    missingBooks: number;
    exerciseDefaulters: string[]; // List of names
    homeworkDefaulters: string[]; // List of names
}

const GenericModule: React.FC<GenericModuleProps> = ({ department, schoolClass, module, settings, onSettingChange, students = [], setStudents }) => {
  // Generic State for Tables
  const [tableData, setTableData] = useState<Record<string, string>[]>([]);
  const [newIndicator, setNewIndicator] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newStaff, setNewStaff] = useState<Partial<StaffMember>>({ role: 'Subject Teacher', status: 'Full Time' });

  // Enrolment Specific State
  const [enrolmentView, setEnrolmentView] = useState<'records' | 'attendance' | 'history'>('records');
  // NOTE: Enrolment students are now synced via `students` prop from App.tsx.

  // Attendance State: Map Week Number -> Student ID -> Day -> Status
  const [attendanceHistory, setAttendanceHistory] = useState<Record<string, Record<number, Record<string, AttendanceStatus>>>>({});
  
  // Week Info State
  const [weekInfo, setWeekInfo] = useState({ number: "1", start: "", end: "" });

  // Academic Calendar Specific State
  const [calendarView, setCalendarView] = useState<'activities' | 'assessment' | 'mock' | 'extra'>('activities');
  
  // Time Table Specific State (Daycare)
  const [timetableDay, setTimetableDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
  const [showTimetablePanel, setShowTimetablePanel] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  // TLM (Teaching Learning Materials) State
  const DEFAULT_TLMS = [
      "Language and Literarcy TLR's", "Colouring textbook", "scribbling textbook", 
      "O.W.O.P TLR's", "Numerarcy TLR's", "Picture Books", "Jolly Phonics Book", 
      "Writing Textbook", "Picture Reading book", "picture Story book", 
      "Learning Centre TLR's", "Play logos", "toys", "counters", "shaped objects"
  ];
  const [availableTLMs, setAvailableTLMs] = useState<string[]>(DEFAULT_TLMS);
  const [inactiveTLMs, setInactiveTLMs] = useState<string[]>([]); // List of items marked as inactive
  const [showTLMPanel, setShowTLMPanel] = useState(false);
  const [activeTLMRowIndex, setActiveTLMRowIndex] = useState<number | null>(null);
  const [selectedTLMs, setSelectedTLMs] = useState<string[]>([]);
  const [newTLMInput, setNewTLMInput] = useState("");
  const [isManageTLMMode, setIsManageTLMMode] = useState(false);


  // Exercise Assessment State
  const [exerciseView, setExerciseView] = useState<'entry' | 'monitoring' | 'sheet_assignments' | 'sheet_inspection'>('entry');
  const [exerciseTerm, setExerciseTerm] = useState("Term 1");
  const [exercises, setExercises] = useState<AssessmentExercise[]>([]);
  const [exerciseScores, setExerciseScores] = useState<Record<string, Record<number, string>>>({}); // ExID -> StudentID -> Score (string to allow empty)
  const [newExercise, setNewExercise] = useState<Partial<AssessmentExercise>>({
      type: 'Class',
      source: 'Exercise Book',
      exerciseNo: '',
      date: new Date().toISOString().split('T')[0],
      maxScore: 10,
      subject: ''
  });
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [exerciseListFilter, setExerciseListFilter] = useState("");
  
  // Master Sheet Filter State
  const [sheetSubjectFilter, setSheetSubjectFilter] = useState("");

  // Monitoring / Book Inspection State
  const [monitoringLogs, setMonitoringLogs] = useState<MonitoringLog[]>([]);
  const [newLog, setNewLog] = useState<Partial<MonitoringLog>>({
      date: new Date().toISOString().split('T')[0],
      week: '1',
      subject: '',
      source: 'Exercise Book',
      unmarked: 0,
      undated: 0,
      untitled: 0,
      uncorrected: 0,
      correctedNotMarked: 0,
      missingBooks: 0,
      exerciseDefaulters: [],
      homeworkDefaulters: []
  });

  const isEarlyChildhood = department === 'Daycare' || department === 'Nursery';
  const isPreSchool = ['Daycare', 'Nursery', 'Kindergarten'].includes(department);
  const isDaycareSpecific = department === 'Daycare' && (schoolClass === 'D1' || schoolClass === 'Creche');
  
  // Feature flag for the monitoring system
  const showMonitoringSystem = true; // Enabled for all departments

  const coreSubjects = useMemo(() => getSubjectsForDepartment(department), [department]);

  // Constants
  const ACADEMIC_ACTIVITIES_PRESET = [
    "REOPENING/ORIENTATION/STAFF MEETING",
    "SUBMISSION PREPARED OF SCHEME OF WORK",
    "ADMINISTER AND RECORD C.A.T",
    "CLOSING OF REGISTERS",
    "SUBMISSION OF END OF TERM QUESTIONS",
    "ADMINISTER MID TERM EXAMINATION AND RECORD",
    "INSPECTION OF S.B.A/REGISTERS",
    "CRITERION ASSESSMENT",
    "ADMINISTER AND RECORD C.A.T",
    "REVISION",
    "EXAMINATION",
    "WEEK OF VACATION"
  ];

  // Daycare Timetable Constants (X:Y)
  const TIMETABLE_METHODS = [
      "Circle Time",
      "Group Activity 1",
      "Group Activity 2",
      "Phonics Time",
      "Learning Centre"
  ];

  const TIMETABLE_SUBJECTS = [
      "Language & Literacy",
      "Numeracy",
      "Our World Our People",
      "Creative Activities",
      "Writing",
      "Scribbling",
      "Story Sharing"
  ];
  
  // Excluded slots (L0, L1, B1, B2, L7)
  const EXCLUDED_SLOTS = ["L0", "L1", "B1", "B2", "L7"];

  // Daycare Timetable Data
  const DAYCARE_TIMETABLE_DATA = useMemo(() => ({
    Monday: [
        { 'Time Period': 'L0: 7:30 am–8:00 am', 'Activity': 'Arrival & Welcome to School', 'Details': 'Settling learners', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L1: 8:30 am–9:25 am', 'Activity': 'Morning Assembly / Settling', 'Details': 'Rhymes, songs, routines', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L2: 9:25 am–10:20 am', 'Activity': 'Circle Time', 'Details': 'Rhymes, recitations, songs, poems', 'Teaching & Learning Materials': 'Fun Science, Fun Colouring, Math Book, TLRs', 'Remarks': '—' },
        { 'Time Period': 'B1: 10:20 am–10:35 am', 'Activity': 'Break', 'Details': 'Snack Break – Eating habits & table manners', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L3: 10:35 am–11:30 am', 'Activity': 'Group (Creativity)', 'Details': 'Shoe polishing, dressing skills, pushing & pulling, conversation, class rules, parts of body, wiping practice', 'Teaching & Learning Materials': 'Picture books, posters, audio-visual, TLRs', 'Remarks': '—' },
        { 'Time Period': 'L4: 11:30 am–12:25 pm', 'Activity': 'Group (OWOP)', 'Details': 'Rolling, tracing, washing hands, colouring, scooping', 'Teaching & Learning Materials': 'TLRs, OWOP books', 'Remarks': '—' },
        { 'Time Period': 'B2: 12:25 pm–1:10 pm', 'Activity': 'Lunch Break', 'Details': 'Good eating habits', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L5: 1:10 pm–1:55 pm', 'Activity': 'Phonics Time (Jolly Phonics)', 'Details': 'Rhymes & songs, writing letters, action songs, picture story, picture matching, dance', 'Teaching & Learning Materials': 'Jolly Phonics, AV devices, posters', 'Remarks': '—' },
        { 'Time Period': 'L6: 1:55 pm–2:50 pm', 'Activity': 'Writing (Language & Literacy)', 'Details': 'Picture story, tracing, conversation', 'Teaching & Learning Materials': 'Writing books, TLRs', 'Remarks': '—' },
        { 'Time Period': 'L7: 2:50 pm–3:30 pm', 'Activity': 'Story Telling & Sharing → Cleaning & Closing', 'Details': 'Story time, sharing, bagging, dressing, waiting to go home', 'Teaching & Learning Materials': 'Chapter book (for nap/homework)', 'Remarks': 'Closing' },
    ],
    Tuesday: [
        { 'Time Period': 'L0: 7:30 am–8:00 am', 'Activity': 'Arrival & Welcome', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L1: 8:30 am–9:25 am', 'Activity': 'Morning Assembly/Settling', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L2: 9:25 am–10:20 am', 'Activity': 'Circle Time (Language & Literacy)', 'Details': 'Talk About: Myself, family, sitting room, kitchen, etc', 'Teaching & Learning Materials': 'Fun Creativity, Fun Scribbling, TLRs', 'Remarks': '—' },
        { 'Time Period': 'B1: 10:20 am–10:35 am', 'Activity': 'Break', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L3: 10:35 am–11:30 am', 'Activity': 'Group (Language & Literacy)', 'Details': 'Action words, painting, scribbling, colouring, tracing', 'Teaching & Learning Materials': 'Fun Write & Colour, Fun Science, TLRs', 'Remarks': '—' },
        { 'Time Period': 'L4: 11:30 am–12:25 pm', 'Activity': 'Group (Numeracy)', 'Details': 'Counting, puzzles, pattern maps, tracing, eye-movement training', 'Teaching & Learning Materials': 'Posters, AV devices, TLRs', 'Remarks': '—' },
        { 'Time Period': 'B2: 12:25 pm–1:10 pm', 'Activity': 'Lunch', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L5: 1:10 pm–1:55 pm', 'Activity': 'Phonics (Jolly Phonics)', 'Details': 'Grooming, sound of animals, washing hands, counting items, drawing', 'Teaching & Learning Materials': 'Jolly Phonics Materials', 'Remarks': '—' },
        { 'Time Period': 'L6: 1:55 pm–2:50 pm', 'Activity': 'Writing (Lang & Lit)', 'Details': 'Letters & sounds, weaving, toys', 'Teaching & Learning Materials': 'Writing books, TLRs', 'Remarks': '—' },
        { 'Time Period': 'L7: 2:50 pm–3:30 pm', 'Activity': 'Story Telling & Sharing', 'Details': 'Homework/Naptime', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
    ],
    Wednesday: [
        { 'Time Period': 'L0: 7:30 am–8:00 am', 'Activity': 'Arrival', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L1: 8:30 am–9:25 am', 'Activity': 'Worship', 'Details': 'Class worship routine', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L2: 9:25 am–10:20 am', 'Activity': 'Group (Numeracy)', 'Details': 'Folding, sorting, counting, pairing, tracing, shapes', 'Teaching & Learning Materials': 'Fun Creativity, TLRs', 'Remarks': '—' },
        { 'Time Period': 'B1: 10:20 am–10:35 am', 'Activity': 'Break', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L3: 10:35 am–11:30 am', 'Activity': 'Group (OWOP)', 'Details': 'Picture story, puzzles, counting words, rhymes, letters, memory games', 'Teaching & Learning Materials': 'Fun Picture Reading Book', 'Remarks': '—' },
        { 'Time Period': 'L4: 11:30 am–12:25 pm', 'Activity': 'Group (Lang & Lit – Comprehension)', 'Details': 'Picture description, naming objects, threading, matching', 'Teaching & Learning Materials': 'AV devices, TLRs', 'Remarks': '—' },
        { 'Time Period': 'B2: 12:25 pm–1:10 pm', 'Activity': 'Lunch', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L5: 1:10 pm–1:55 pm', 'Activity': 'Writing (Lang & Lit)', 'Details': 'Comprehension-based writing', 'Teaching & Learning Materials': 'Writing books', 'Remarks': '—' },
        { 'Time Period': 'L6: 1:55 pm–2:50 pm', 'Activity': 'Story Telling & Sharing', 'Details': 'Naptime/homework', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L7: 2:50 pm–3:30 pm', 'Activity': 'Closing Activities', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
    ],
    Thursday: [
        { 'Time Period': 'L0: 7:30 am–8:00 am', 'Activity': 'Arrival', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L1: 8:30 am–9:25 am', 'Activity': 'Singing & Music Notation', 'Details': 'Music, sounds, rhythm', 'Teaching & Learning Materials': 'Jolly Phonics, Math Book', 'Remarks': '—' },
        { 'Time Period': 'L2: 9:25 am–10:20 am', 'Activity': 'Group (OWOP)', 'Details': 'Counting, picture story, action songs', 'Teaching & Learning Materials': 'TLRs', 'Remarks': '—' },
        { 'Time Period': 'B1: 10:20 am–10:35 am', 'Activity': 'Break', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L3: 10:35 am–11:30 am', 'Activity': 'Group (Colouring)', 'Details': 'Construction, moulding, modelling, painting, weaving', 'Teaching & Learning Materials': 'Drawing Book, Fun Colouring', 'Remarks': '—' },
        { 'Time Period': 'L4: 11:30 am–12:25 pm', 'Activity': 'Phonics', 'Details': 'Jolly phonics drills', 'Teaching & Learning Materials': 'Posters, AV Devices', 'Remarks': '—' },
        { 'Time Period': 'B2: 12:25 pm–1:10 pm', 'Activity': 'Lunch', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L5: 1:10 pm–1:55 pm', 'Activity': 'Writing', 'Details': 'Literacy writing activities', 'Teaching & Learning Materials': 'Writing books', 'Remarks': '—' },
        { 'Time Period': 'L6: 1:55 pm–2:50 pm', 'Activity': 'Story Telling', 'Details': 'Picture reading, literacy centres', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L7: 2:50 pm–3:30 pm', 'Activity': 'Naptime / Homework', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
    ],
    Friday: [
        { 'Time Period': 'L0: 7:30 am–8:00 am', 'Activity': 'Arrival', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L1: 8:30 am–9:25 am', 'Activity': 'Physical Education', 'Details': 'Outdoor poem, rhyme, recitation', 'Teaching & Learning Materials': 'Audio recordings, TV', 'Remarks': '—' },
        { 'Time Period': 'L2: 9:25 am–10:20 am', 'Activity': 'Group (OWOP)', 'Details': 'Sewing, setting table, letters/sounds, dusting, arranging chairs', 'Teaching & Learning Materials': 'Fun Creativity, Colours, TLRs', 'Remarks': '—' },
        { 'Time Period': 'B1: 10:20 am–10:35 am', 'Activity': 'Break', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L3: 10:35 am–11:30 am', 'Activity': 'Group (Creativity)', 'Details': 'Play equipment, physical development, Lego, role play, ID objects', 'Teaching & Learning Materials': 'Creativity materials', 'Remarks': '—' },
        { 'Time Period': 'L4: 11:30 am–12:25 pm', 'Activity': 'Phonics', 'Details': 'Jolly Phonics', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'B2: 12:25 pm–1:10 pm', 'Activity': 'Lunch', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L5: 1:10 pm–1:55 pm', 'Activity': 'Extra-Curricular Activities', 'Details': 'Games, play, exploration', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L6: 1:55 pm–2:50 pm', 'Activity': 'Story Telling', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
        { 'Time Period': 'L7: 2:50 pm–3:30 pm', 'Activity': 'Closing', 'Details': '—', 'Teaching & Learning Materials': '—', 'Remarks': '—' },
    ]
  }), []);

  // Initialize sheet filter if empty
  useEffect(() => {
      if (module === 'Exercise Assessment' && !sheetSubjectFilter && coreSubjects.length > 0) {
          setSheetSubjectFilter(coreSubjects[0]);
      }
  }, [module, coreSubjects, sheetSubjectFilter]);

  // Reset calendar view if class changes and 'mock' is selected but not allowed
  useEffect(() => {
    if (module === 'Academic Calendar' && calendarView === 'mock' && schoolClass !== 'Basic 9') {
        setCalendarView('activities');
    }
  }, [schoolClass, module, calendarView]);

  // Initialize Generic Table Data based on Module/View
  useEffect(() => {
      if (module === 'Academic Calendar' && calendarView === 'activities') {
          // Pre-fill activities
          const initialData = ACADEMIC_ACTIVITIES_PRESET.map((activity, index) => ({
              'Week Number': (index + 1).toString(),
              'Period (Date Start - Date End)': '',
              'Activities': activity,
              'Venue / Remarks': '',
              'Responsible Person(s)': ''
          }));
          setTableData(initialData);
      } else if (module === 'Academic Calendar' && calendarView === 'assessment') {
          if (isEarlyChildhood) {
              const initialData = [
                   { 'Assessment Series': 'Milestone Check 1', 'Developmental Domain': 'Physical / Motor', 'Method': 'Observation', 'Documentation': 'Checklist' },
                   { 'Assessment Series': 'Portfolio Review', 'Developmental Domain': 'Social / Emotional', 'Method': 'Portfolio', 'Documentation': 'Photos/Notes' },
                   { 'Assessment Series': 'Milestone Check 2', 'Developmental Domain': 'Cognitive / Language', 'Method': 'Observation', 'Documentation': 'Checklist' },
              ];
              setTableData(initialData);
          } else {
              // Pre-fill CAT 1, 2, 3 structure
              const initialData = [
                   { 'CAT Series': 'CAT 1', 'Mode (Ind/Group)': 'Individual', 'Question Type': 'Obj/Subj', 'Bloom\'s Taxonomy': 'Know/Comp/App' },
                   { 'CAT Series': 'CAT 2', 'Mode (Ind/Group)': 'Group Project', 'Question Type': 'Practical/Report', 'Bloom\'s Taxonomy': 'Application/Analysis' },
                   { 'CAT Series': 'CAT 3', 'Mode (Ind/Group)': 'Individual', 'Question Type': 'Obj/Subj', 'Bloom\'s Taxonomy': 'Synthesis/Evaluation' },
              ];
              setTableData(initialData);
          }
      } else if (module === 'Academic Calendar' && calendarView === 'extra') {
          if (isPreSchool) {
              // Tailored Activities for Daycare, Nursery, Kindergarten
              const initialData = [
                  { 'Date': 'Week 1', 'Activity': 'Storytelling Circle', 'Group / House': 'Class Activity', 'Venue': 'Classroom/Library Corner', 'Coordinator': 'Class Teacher' },
                  { 'Date': 'Week 2', 'Activity': 'Coloring & Finger Painting', 'Group / House': 'Art Group', 'Venue': 'Art Room / Class', 'Coordinator': 'Art Facilitator' },
                  { 'Date': 'Week 3', 'Activity': 'Music & Movement (Rhymes)', 'Group / House': 'Whole Class', 'Venue': 'Activity Room', 'Coordinator': 'Music Teacher' },
                  { 'Date': 'Week 4', 'Activity': 'Sandpit & Water Play', 'Group / House': 'Sensory Play', 'Venue': 'Playground', 'Coordinator': 'Class Teacher' },
                  { 'Date': 'Week 5', 'Activity': 'Role Play / Dress Up Day', 'Group / House': 'Creative Play', 'Venue': 'Classroom', 'Coordinator': 'Class Teacher' },
                  { 'Date': 'Week 6', 'Activity': 'Clay Modeling / Playdough', 'Group / House': 'Fine Motor Skills', 'Venue': 'Classroom', 'Coordinator': 'Art Facilitator' },
                  { 'Date': 'Week 7', 'Activity': 'Puppet Show', 'Group / House': 'Story Time', 'Venue': 'Assembly Hall', 'Coordinator': 'Drama Group' },
                  { 'Date': 'Week 8', 'Activity': 'Nature Walk / Garden Tour', 'Group / House': 'Nature Club', 'Venue': 'School Garden', 'Coordinator': 'Science Dept' },
                  { 'Date': 'Week 9', 'Activity': 'Building Blocks Challenge', 'Group / House': 'Constructive Play', 'Venue': 'Classroom', 'Coordinator': 'Class Teacher' },
                  { 'Date': 'Week 10', 'Activity': 'Simple Obstacle Course', 'Group / House': 'Gross Motor Skills', 'Venue': 'Playground', 'Coordinator': 'PE Teacher' },
                  { 'Date': 'Week 11', 'Activity': 'Fruit Salad Day', 'Group / House': 'Healthy Eating', 'Venue': 'Dining Hall', 'Coordinator': 'Welfare' },
                  { 'Date': 'Week 12', 'Activity': 'Mini Talent Show', 'Group / House': 'Whole Class', 'Venue': 'Classroom', 'Coordinator': 'Class Teacher' },
              ];
              setTableData(initialData);
          } else {
              // Pre-fill Extra-Curricular Activities for Basic School
              const initialData = [
                  { 'Date': 'Week 1', 'Activity': 'Quiz Competition', 'Group / House': 'Inter-Class', 'Venue': 'Assembly Hall', 'Coordinator': 'Academic Dept' },
                  { 'Date': 'Week 2', 'Activity': 'Debate', 'Group / House': 'Debaters Club', 'Venue': 'Classroom Block B', 'Coordinator': 'English Dept' },
                  { 'Date': 'Week 3', 'Activity': 'Poetry & Drama', 'Group / House': 'Cultural Troupe', 'Venue': 'Assembly Hall', 'Coordinator': 'Creative Arts Dept' },
                  { 'Date': 'Week 4', 'Activity': 'Music & Dance', 'Group / House': 'Music Club', 'Venue': 'Music Room', 'Coordinator': 'Music Director' },
                  { 'Date': 'Week 5', 'Activity': 'Cadet Corps Drill', 'Group / House': 'Cadet Corps', 'Venue': 'School Field', 'Coordinator': 'Drill Instructor' },
                  { 'Date': 'Week 6', 'Activity': 'First Aid Training', 'Group / House': 'Red Cross Society', 'Venue': 'Science Lab', 'Coordinator': 'School Nurse' },
                  { 'Date': 'Week 7', 'Activity': 'Journalism / Reporting', 'Group / House': 'Writers / Press Club', 'Venue': 'Library', 'Coordinator': 'English Dept' },
                  { 'Date': 'Week 8', 'Activity': 'Athletics', 'Group / House': 'Inter-House Sports', 'Venue': 'Sports Stadium / Field', 'Coordinator': 'PE Department' },
                  { 'Date': 'Week 9', 'Activity': 'Picnics and Excursion', 'Group / House': 'Whole School', 'Venue': 'External Site', 'Coordinator': 'Welfare Comm.' },
                  { 'Date': 'Week 10', 'Activity': 'Sports (Football/Volleyball)', 'Group / House': 'Inter-Section', 'Venue': 'School Field', 'Coordinator': 'PE Department' },
                  { 'Date': 'Week 11', 'Activity': 'Spelling Bee', 'Group / House': 'Lower/Upper Basic', 'Venue': 'Assembly Hall', 'Coordinator': 'English Dept' },
                  { 'Date': 'Week 12', 'Activity': 'Video Games / Recreational', 'Group / House': 'ICT Club', 'Venue': 'Computer Lab', 'Coordinator': 'ICT Dept' },
              ];
              setTableData(initialData);
          }
      } else if (module === 'Time Table' && isDaycareSpecific) {
          setTableData(DAYCARE_TIMETABLE_DATA[timetableDay] as any);
      } else if (module !== 'Pupil Enrolment' && module !== 'Exercise Assessment' && module !== 'Facilitator List') {
          setTableData(Array(5).fill({}));
      }
  }, [module, calendarView, schoolClass, department, isEarlyChildhood, isPreSchool, timetableDay, isDaycareSpecific, DAYCARE_TIMETABLE_DATA]);


  // --- Daycare Timetable Logic (X:Y Matrix Selection & TLM Selection) ---
  const handleTimetableCellClick = (index: number) => {
    // Only apply logic for Daycare/Creche Timetable
    if (module !== 'Time Table' || !isDaycareSpecific) return;

    // Check Exclusion
    const row = tableData[index];
    const timePeriod = row['Time Period'] || '';
    const prefix = timePeriod.split(':')[0]; // Gets L0, L1, B1, etc.
    
    if (EXCLUDED_SLOTS.includes(prefix)) {
        return; // Do nothing for excluded slots
    }

    // Open Selection Panel
    setActiveRowIndex(index);
    setShowTimetablePanel(true);
  };

  const getSubjectUsageCount = (subject: string) => {
      let count = 0;
      tableData.forEach((row, idx) => {
          // Exclude the current row being edited to avoid self-counting issues during logic check
          if (idx === activeRowIndex) return;

          const activity = row['Activity'] || '';
          if (activity.includes(subject)) {
              count++;
          }
      });
      return count;
  };

  const applyTimetableSelection = (method: string, subject: string) => {
      if (activeRowIndex === null) return;
      
      const newActivity = `${method} (${subject})`;
      handleTableChange(activeRowIndex, 'Activity', newActivity);
      setShowTimetablePanel(false);
      setActiveRowIndex(null);
  };

  // TLM Logic
  const handleTLMCellClick = (index: number) => {
      if (module !== 'Time Table' || !isDaycareSpecific) return;
      const row = tableData[index];
      const currentVal = row['Teaching & Learning Materials'] || '';
      
      // Parse current selection
      const selected = currentVal === '—' || currentVal === '' ? [] : currentVal.split(', ').map(s => s.trim());
      
      setSelectedTLMs(selected);
      setActiveTLMRowIndex(index);
      setShowTLMPanel(true);
  };

  const toggleTLMSelection = (tlm: string) => {
      setSelectedTLMs(prev => {
          if (prev.includes(tlm)) return prev.filter(t => t !== tlm);
          return [...prev, tlm];
      });
  };

  const applyTLMSelection = () => {
      if (activeTLMRowIndex === null) return;
      const finalString = selectedTLMs.length > 0 ? selectedTLMs.join(', ') : '—';
      handleTableChange(activeTLMRowIndex, 'Teaching & Learning Materials', finalString);
      setShowTLMPanel(false);
      setActiveTLMRowIndex(null);
  };
  
  const handleAddNewTLM = () => {
      if (!newTLMInput.trim()) return;
      const newItem = newTLMInput.trim();
      if (!availableTLMs.includes(newItem)) {
          setAvailableTLMs([...availableTLMs, newItem]);
      }
      setNewTLMInput("");
  };

  const toggleTLMActive = (tlm: string) => {
      setInactiveTLMs(prev => {
          if (prev.includes(tlm)) return prev.filter(t => t !== tlm);
          return [...prev, tlm];
      });
  };


  // --- Enrolment Logic ---

  // Sort: Boys first (Alpha), then Girls (Alpha)
  const sortedStudents = useMemo(() => {
    const boys = students.filter(s => s.gender === 'Male').sort((a, b) => a.name.localeCompare(b.name));
    const girls = students.filter(s => s.gender === 'Female').sort((a, b) => a.name.localeCompare(b.name));
    const others = students.filter(s => !s.gender).sort((a,b) => a.name.localeCompare(b.name));
    return [...boys, ...girls, ...others];
  }, [students]);

  const handleStudentChange = (id: number, field: keyof StudentData, value: string) => {
    if (!setStudents) return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleGenderChange = (id: number, val: string) => {
      if (!setStudents) return;
      const normalized = val.toLowerCase().startsWith('m') ? 'Male' : 'Female';
      setStudents(prev => prev.map(s => s.id === id ? { ...s, gender: normalized } : s));
  };

  const addNewStudent = () => {
    if (!setStudents) return;
    const newId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;
    setStudents([...students, { 
        id: newId, 
        name: "NEW PUPIL", 
        gender: "Male",
        scores: {},
        scoreDetails: {},
        dob: "", 
        guardian: "", 
        contact: "", 
        address: "" 
    }]);
  };

  // --- Attendance Logic ---
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // Get current week's attendance map
  const currentWeekAttendance = attendanceHistory[weekInfo.number] || {};

  const markAttendance = (studentId: number, day: string, status: AttendanceStatus) => {
    setAttendanceHistory(prev => ({
        ...prev,
        [weekInfo.number]: {
            ...(prev[weekInfo.number] || {}),
            [studentId]: {
                ...(prev[weekInfo.number]?.[studentId] || {}),
                [day]: status
            }
        }
    }));
  };

  const markAllDay = (day: string, status: AttendanceStatus) => {
      setAttendanceHistory(prev => {
          const weekData = prev[weekInfo.number] || {};
          const newWeekData = { ...weekData };
          
          sortedStudents.forEach(s => {
              if (!newWeekData[s.id]) newWeekData[s.id] = {};
              newWeekData[s.id][day] = status;
          });

          return {
              ...prev,
              [weekInfo.number]: newWeekData
          };
      });
  };

  // Calculate stats for current week
  const getWeekRowTotal = (studentId: number, specificWeekNum?: string) => {
      const weekData = specificWeekNum ? (attendanceHistory[specificWeekNum] || {}) : currentWeekAttendance;
      const studentAtt = weekData[studentId] || {};
      let count = 0;
      Object.values(studentAtt).forEach(status => {
          if (status === 'P' || status === 'WP') count++;
      });
      return count;
  };

  // Calculate cumulative stats across ALL weeks
  const getTermTotal = (studentId: number) => {
      let total = 0;
      Object.values(attendanceHistory).forEach(weekData => {
          const studentAtt = weekData[studentId] || {};
          Object.values(studentAtt).forEach(status => {
              if (status === 'P' || status === 'WP') total++;
          });
      });
      return total;
  };

  // Calculate Holidays for a student across all weeks (to adjust possible attendance)
  const getHolidayCount = (studentId: number) => {
      let count = 0;
      Object.values(attendanceHistory).forEach(weekData => {
          const studentAtt = weekData[studentId] || {};
          Object.values(studentAtt).forEach(status => {
              if (status === 'H') count++;
          });
      });
      return count;
  };

  const getDayTotal = (day: string, type: 'current' | 'cumulative') => {
      let count = 0;
      if (type === 'current') {
          sortedStudents.forEach(s => {
              const status = currentWeekAttendance[s.id]?.[day];
              if (status === 'P' || status === 'WP') count++;
          });
      } else {
          // Cumulative for a specific day across all weeks
          Object.values(attendanceHistory).forEach(weekData => {
              sortedStudents.forEach(s => {
                  const status = weekData[s.id]?.[day];
                  if (status === 'P' || status === 'WP') count++;
              });
          });
      }
      return count;
  };

  const getAttendanceStats = () => {
      let boysPresent = 0;
      let girlsPresent = 0;

      sortedStudents.forEach(s => {
          const studentAtt = currentWeekAttendance[s.id] || {};
          Object.values(studentAtt).forEach(status => {
              if (status === 'P' || status === 'WP') {
                  if (s.gender === 'Male') boysPresent++;
                  else girlsPresent++;
              }
          });
      });
      return { boysPresent, girlsPresent, total: boysPresent + girlsPresent };
  };

  const stats = getAttendanceStats();

  // Helper for Class Totals in History View
  const getClassHistoryStats = () => {
      const weeksList = Object.keys(attendanceHistory).sort();
      const totalWeeks = weeksList.length;
      
      let totalClassTermAttendance = 0;
      let totalPossibleClassAttendance = 0;

      sortedStudents.forEach(s => {
          const present = getTermTotal(s.id);
          const holidays = getHolidayCount(s.id);
          // Assuming 5 days per week. Possible days = (Total Weeks * 5) - Holidays
          const possible = Math.max((totalWeeks * 5) - holidays, 1);
          
          totalClassTermAttendance += present;
          totalPossibleClassAttendance += possible;
      });

      const classAttendancePercentage = totalPossibleClassAttendance > 0 
        ? ((totalClassTermAttendance / totalPossibleClassAttendance) * 100).toFixed(1) 
        : "0.0";

      return {
          weeksList,
          totalWeeks,
          totalClassTermAttendance,
          totalPossibleClassAttendance,
          classAttendancePercentage
      };
  };

  const historyStats = getClassHistoryStats();

  const handleSaveEnrolment = () => {
      alert("Enrolment and Attendance records saved successfully!");
  };

  const handleDownload = () => {
      const headers = enrolmentView === 'records' 
        ? "ID,Name,Gender,DOB,Guardian,Contact,Address"
        : `Week ${weekInfo.number},Date: ${weekInfo.start} to ${weekInfo.end}\nID,Name,Gender,Mon,Tue,Wed,Thu,Fri,Week Total,Term Total`;
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + headers + "\n"
        + sortedStudents.map(s => {
            if (enrolmentView === 'records') {
                return `${s.id},${s.name},${s.gender},${s.dob},${s.guardian},${s.contact},${s.address}`;
            } else {
                const att = currentWeekAttendance[s.id] || {};
                const wkTotal = getWeekRowTotal(s.id);
                const termTotal = getTermTotal(s.id);
                return `${s.id},${s.name},${s.gender},${att['Mon']||'-'},${att['Tue']||'-'},${att['Wed']||'-'},${att['Thu']||'-'},${att['Fri']||'-'},${wkTotal},${termTotal}`;
            }
        }).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${schoolClass}_${enrolmentView}_Week${weekInfo.number}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
  };

  // Indicator Management Logic
  const toggleIndicator = (indicator: string) => {
      if (!settings || !onSettingChange) return;
      
      const current = settings.activeIndicators || [];
      let next;
      if (current.includes(indicator)) {
          next = current.filter(i => i !== indicator);
      } else {
          next = [...current, indicator];
      }
      onSettingChange('activeIndicators', next);
  };
  
  const handleAddIndicator = () => {
      if (!newIndicator.trim()) return;
      if (!settings || !onSettingChange) return;
      
      const trimmed = newIndicator.trim();
      const currentCustom = settings.customIndicators || [];
      
      // Prevent duplicates
      if (!currentCustom.includes(trimmed)) {
          onSettingChange('customIndicators', [...currentCustom, trimmed]);
      }
      setNewIndicator("");
  };

  const handleDeleteIndicator = (indicator: string) => {
    if (DAYCARE_INDICATORS.includes(indicator)) {
        alert("Standard indicators cannot be deleted. You can disable them instead.");
        return;
    }
    if (!settings || !onSettingChange) return;

    // Check if active before deleting
    const active = settings.activeIndicators || [];
    if (active.includes(indicator)) {
        alert("Please disable (uncheck 'Active') this indicator before deleting it.");
        return;
    }

    if (window.confirm(`Are you sure you want to permanently delete the custom indicator "${indicator}"?`)) {
        const currentCustom = settings.customIndicators || [];
        const next = currentCustom.filter(i => i !== indicator);
        onSettingChange('customIndicators', next);
    }
  };
  
  // Combine Standard + Custom Indicators for the list
  const allIndicators = useMemo(() => {
      const custom = settings?.customIndicators || [];
      // Combine and dedupe
      return Array.from(new Set([...DAYCARE_INDICATORS, ...custom]));
  }, [settings?.customIndicators]);


  // Subject List Management Logic
  const handleAddSubject = () => {
    if (!newSubject.trim()) return;
    if (!settings || !onSettingChange) return;
    
    const trimmed = newSubject.trim();
    const currentCustom = settings.customSubjects || [];
    
    // Prevent duplicates
    if (!currentCustom.includes(trimmed)) {
        onSettingChange('customSubjects', [...currentCustom, trimmed]);
    }
    setNewSubject("");
  };

  const handleDeleteSubject = (subject: string) => {
      if (!settings || !onSettingChange) return;
      
      if (window.confirm(`Are you sure you want to delete the custom subject "${subject}"? This will hide it from dropdowns, but data entered for it will remain in raw records.`)) {
          const currentCustom = settings.customSubjects || [];
          const next = currentCustom.filter(s => s !== subject);
          onSettingChange('customSubjects', next);
      }
  };

  // --- FACILITATOR MANAGEMENT ---
  const handleAddStaff = () => {
      if (!newStaff.name) {
          alert("Please enter a staff name");
          return;
      }
      if (!settings || !onSettingChange) return;
      
      const staff: StaffMember = {
          id: Date.now().toString(),
          name: newStaff.name,
          role: newStaff.role || 'Subject Teacher',
          status: newStaff.status || 'Full Time',
          subjects: [],
          contact: '',
          qualification: ''
      };
      
      const currentList = settings.staffList || [];
      onSettingChange('staffList', [...currentList, staff]);
      setNewStaff({ role: 'Subject Teacher', status: 'Full Time', name: '' });
  };

  const handleDeleteStaff = (id: string) => {
      if (window.confirm("Are you sure you want to remove this facilitator?")) {
          const currentList = settings?.staffList || [];
          onSettingChange?.('staffList', currentList.filter(s => s.id !== id));
      }
  };

  const handleStaffChange = (id: string, field: keyof StaffMember, value: any) => {
      const currentList = settings?.staffList || [];
      onSettingChange?.('staffList', currentList.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const toggleSubjectForStaff = (id: string, subject: string) => {
      const currentList = settings?.staffList || [];
      onSettingChange?.('staffList', currentList.map(s => {
          if (s.id === id) {
              const subs = s.subjects || [];
              if (subs.includes(subject)) {
                  return { ...s, subjects: subs.filter(sub => sub !== subject) };
              } else {
                  return { ...s, subjects: [...subs, subject] };
              }
          }
          return s;
      }));
  };

  // --- Exercise Assessment Logic ---
  const handleAddExercise = () => {
      if (!newExercise.exerciseNo || !newExercise.date || !newExercise.subject) {
          alert("Please fill in Subject, Exercise Number and Date");
          return;
      }
      const newId = Date.now().toString();
      const exercise: AssessmentExercise = {
          id: newId,
          type: newExercise.type as any,
          source: newExercise.source as any,
          exerciseNo: newExercise.exerciseNo,
          date: newExercise.date,
          maxScore: newExercise.maxScore || 10,
          topic: newExercise.topic || '',
          subject: newExercise.subject,
          term: exerciseTerm
      };
      setExercises([...exercises, exercise]);
      setSelectedExerciseId(newId);
      // Reset form but keep date for convenience
      setNewExercise(prev => ({ ...prev, exerciseNo: '', topic: '' }));
  };

  const handleScoreEntry = (studentId: number, score: string) => {
      if (!selectedExerciseId) return;
      setExerciseScores(prev => ({
          ...prev,
          [selectedExerciseId]: {
              ...(prev[selectedExerciseId] || {}),
              [studentId]: score
          }
      }));
  };

  const getExerciseParticipationCount = (studentId: number) => {
      let count = 0;
      Object.values(exerciseScores).forEach(scores => {
          if (scores[studentId] && scores[studentId] !== '') count++;
      });
      return count;
  };
  
  // Sort students for Master Sheet: Least participation first (Ascending)
  const sortedStudentsForMasterSheet = useMemo(() => {
      return [...sortedStudents].sort((a, b) => {
          const countA = getExerciseParticipationCount(a.id);
          const countB = getExerciseParticipationCount(b.id);
          return countA - countB;
      });
  }, [sortedStudents, exerciseScores]);

  // Filter exercises by the selected subject in Master Sheet view
  const filteredExercisesForSheet = useMemo(() => {
      return exercises.filter(ex => ex.subject === sheetSubjectFilter && ex.term === exerciseTerm);
  }, [exercises, sheetSubjectFilter, exerciseTerm]);


  // --- Monitoring Log Logic ---
  const handleSaveLog = () => {
      if (!newLog.subject || !newLog.week) {
          alert("Please select a subject and week number.");
          return;
      }
      const logEntry: MonitoringLog = {
          id: Date.now().toString(),
          date: newLog.date || new Date().toISOString().split('T')[0],
          week: newLog.week || '1',
          subject: newLog.subject || '',
          source: newLog.source || 'Exercise Book',
          term: exerciseTerm,
          unmarked: newLog.unmarked || 0,
          undated: newLog.undated || 0,
          untitled: newLog.untitled || 0,
          uncorrected: newLog.uncorrected || 0,
          correctedNotMarked: newLog.correctedNotMarked || 0,
          missingBooks: newLog.missingBooks || 0,
          exerciseDefaulters: newLog.exerciseDefaulters || [],
          homeworkDefaulters: newLog.homeworkDefaulters || []
      };
      setMonitoringLogs([...monitoringLogs, logEntry]);
      // Reset counts but keep date/week/subject for ease of next entry
      setNewLog(prev => ({ 
          ...prev, 
          unmarked: 0, undated: 0, untitled: 0, uncorrected: 0, correctedNotMarked: 0, missingBooks: 0,
          exerciseDefaulters: [], homeworkDefaulters: []
      }));
      alert("Inspection Log Saved!");
  };

  const filteredLogsForSheet = useMemo(() => {
      return monitoringLogs.filter(log => log.subject === sheetSubjectFilter && log.term === exerciseTerm);
  }, [monitoringLogs, sheetSubjectFilter, exerciseTerm]);

  const toggleDefaulter = (type: 'exercise' | 'homework', name: string) => {
      setNewLog(prev => {
          const list = type === 'exercise' ? (prev.exerciseDefaulters || []) : (prev.homeworkDefaulters || []);
          if (list.includes(name)) {
              return { ...prev, [type === 'exercise' ? 'exerciseDefaulters' : 'homeworkDefaulters']: list.filter(n => n !== name) };
          } else {
              return { ...prev, [type === 'exercise' ? 'exerciseDefaulters' : 'homeworkDefaulters']: [...list, name] };
          }
      });
  };

  // --- Generic Logic for other modules ---
  const addRow = () => {
    setTableData([...tableData, {}]);
  };

  const handleTableChange = (index: number, column: string, value: string) => {
      setTableData(prev => {
          const newData = [...prev];
          newData[index] = { ...newData[index], [column]: value };
          return newData;
      });
  };

  const getColumns = () => {
    switch (module) {
      case 'Time Table': 
        if (isDaycareSpecific) {
            return ['Time Period', 'Activity', 'Details', 'Teaching & Learning Materials', 'Remarks'];
        }
        return ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      case 'Academic Calendar': 
        if (calendarView === 'activities') return ['Week Number', 'Period (Date Start - Date End)', 'Activities', 'Venue / Remarks', 'Responsible Person(s)'];
        if (calendarView === 'assessment') {
            if (isEarlyChildhood) {
                return ['Assessment Series', 'Developmental Domain', 'Focus Area', 'Method', 'Documentation', 'Start Date', 'End Date'];
            }
            return ['CAT Series', 'Subject', 'Question Type', 'No. of Questions', 'Bloom\'s Taxonomy', 'Mode (Ind/Group)', 'Max Marks', 'Start Date', 'End Date'];
        }
        if (calendarView === 'mock') return ['Mock Series', 'Start Date', 'End Date', 'Subjects Involved', 'Supervisor'];
        if (calendarView === 'extra') return ['Date', 'Activity', 'Group / House', 'Venue', 'Coordinator'];
        return ['Date', 'Event / Activity', 'Duration', 'Remarks'];
      case 'Facilitator List': return ['Staff ID', 'Name', 'Role', 'Status', 'Subjects'];
      case 'Staff Movement': return ['Date', 'Staff Name', 'Movement Type', 'Reason', 'Authorized By'];
      case 'Materials & Logistics': return ['Item Name', 'Quantity In Stock', 'Condition', 'Last Restocked', 'Needs Replacement'];
      case 'Learner Materials & Booklist': return ['Item / Book Title', 'Author / Publisher', 'Required Qty', 'Mandatory?', 'Price (Est)'];
      case 'Disciplinary': return ['Date', 'Pupil Name', 'Offense / Issue', 'Action Taken', 'Parent Notified'];
      case 'Special Event Day': return ['Date', 'Event Name', 'Activities', 'Dress Code', 'Resources Needed'];
      case 'Exercise Assessment': return ['Date', 'Subject', 'Topic', 'Total Marks', 'Average Score']; // Fallback
      case 'Examination':
        // These keys are just used for the columns of the generic table when not in reporting mode
        return ['Date', 'Time', 'Subject', 'Class', 'Venue', 'Supervisor'];
      default: return ['Item', 'Description', 'Date', 'Status'];
    }
  };

  // ---------------- RENDER ----------------
  
  if (module === 'Facilitator List') {
      const staffList = settings?.staffList || [];
      
      return (
          <div className="bg-white p-6 rounded shadow-md min-h-[500px]">
              <div className="border-b pb-4 mb-6">
                <h2 className="text-2xl font-bold text-blue-900 uppercase">Facilitator Management</h2>
                <p className="text-sm text-gray-500">Manage staff roles, statuses, and subject assignments.</p>
              </div>

              {/* Add New Staff */}
              <div className="bg-gray-50 p-4 border rounded mb-6 flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Staff Name</label>
                      <input 
                         type="text" 
                         value={newStaff.name || ''} 
                         onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                         className="w-full border p-2 rounded"
                         placeholder="Enter full name"
                      />
                  </div>
                   <div className="w-full md:w-48">
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Role</label>
                      <select 
                        value={newStaff.role} 
                        onChange={(e) => setNewStaff({...newStaff, role: e.target.value as any})}
                        className="w-full border p-2 rounded"
                      >
                          <option value="Subject Teacher">Subject Teacher</option>
                          <option value="Class Teacher">Class Teacher</option>
                          <option value="Both">Both</option>
                      </select>
                  </div>
                  <div className="w-full md:w-48">
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Status</label>
                      <select 
                        value={newStaff.status} 
                        onChange={(e) => setNewStaff({...newStaff, status: e.target.value as any})}
                        className="w-full border p-2 rounded"
                      >
                          <option value="Full Time">Full Time</option>
                          <option value="Part Time">Part Time</option>
                      </select>
                  </div>
                  <button onClick={handleAddStaff} className="bg-green-600 text-white font-bold py-2 px-6 rounded shadow hover:bg-green-700 w-full md:w-auto">Add Staff</button>
              </div>

              {/* Staff List */}
              <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border">
                      <thead className="bg-gray-100 uppercase text-xs font-bold">
                          <tr>
                              <th className="p-3 border text-left">Name</th>
                              <th className="p-3 border w-40">Role</th>
                              <th className="p-3 border w-40">Status</th>
                              <th className="p-3 border text-left">Assigned Subjects</th>
                              <th className="p-3 border w-20">Action</th>
                          </tr>
                      </thead>
                      <tbody>
                          {staffList.map(staff => (
                              <tr key={staff.id} className="hover:bg-gray-50">
                                  <td className="p-2 border">
                                      <EditableField value={staff.name} onChange={(v) => handleStaffChange(staff.id, 'name', v)} className="w-full font-bold" />
                                  </td>
                                  <td className="p-2 border text-center">
                                      <select 
                                        value={staff.role} 
                                        onChange={(e) => handleStaffChange(staff.id, 'role', e.target.value)}
                                        className="bg-transparent border-b border-gray-300 w-full text-center"
                                      >
                                          <option value="Subject Teacher">Subject Teacher</option>
                                          <option value="Class Teacher">Class Teacher</option>
                                          <option value="Both">Both</option>
                                      </select>
                                  </td>
                                  <td className="p-2 border text-center">
                                      <select 
                                        value={staff.status} 
                                        onChange={(e) => handleStaffChange(staff.id, 'status', e.target.value)}
                                        className="bg-transparent border-b border-gray-300 w-full text-center"
                                      >
                                          <option value="Full Time">Full Time</option>
                                          <option value="Part Time">Part Time</option>
                                      </select>
                                  </td>
                                  <td className="p-2 border">
                                      <div className="flex flex-wrap gap-1">
                                          {coreSubjects.map(sub => (
                                              <button
                                                key={sub}
                                                onClick={() => toggleSubjectForStaff(staff.id, sub)}
                                                className={`px-2 py-0.5 text-[10px] rounded border ${staff.subjects?.includes(sub) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-500 border-gray-200 hover:border-gray-400'}`}
                                              >
                                                  {sub}
                                              </button>
                                          ))}
                                      </div>
                                  </td>
                                  <td className="p-2 border text-center">
                                      <button onClick={() => handleDeleteStaff(staff.id)} className="text-red-500 hover:text-red-700 font-bold">X</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  }

  // EXERCISE ASSESSMENT MODULE
  if (module === 'Exercise Assessment') {
      return (
        <div className="bg-white p-6 rounded shadow-md min-h-[600px] font-sans">
             <div className="border-b pb-4 mb-4 flex justify-between items-center no-print flex-wrap gap-2">
                <div>
                    <h2 className="text-2xl font-bold text-blue-900 uppercase">Exercise Assessment & Monitoring</h2>
                    <p className="text-sm text-gray-500">Record daily assignments and monitor book compliance.</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Term Selector */}
                    <select 
                        className="bg-gray-100 border border-gray-300 text-gray-700 text-sm font-bold py-1 px-3 rounded"
                        value={exerciseTerm}
                        onChange={(e) => setExerciseTerm(e.target.value)}
                    >
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2">Term 2</option>
                        <option value="Term 3">Term 3</option>
                    </select>

                    <div className="flex gap-2 bg-gray-100 p-1 rounded">
                        <button 
                            onClick={() => setExerciseView('entry')}
                            className={`px-4 py-2 text-sm font-bold rounded transition-colors ${exerciseView === 'entry' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'}`}
                        >
                            Score Entry
                        </button>
                        {showMonitoringSystem && (
                            <button 
                                onClick={() => setExerciseView('monitoring')}
                                className={`px-4 py-2 text-sm font-bold rounded transition-colors ${exerciseView === 'monitoring' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'}`}
                            >
                                Book Inspection
                            </button>
                        )}
                        <button 
                            onClick={() => setExerciseView('sheet_assignments')}
                            className={`px-4 py-2 text-sm font-bold rounded transition-colors ${exerciseView === 'sheet_assignments' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'}`}
                        >
                            Assignments Sheet
                        </button>
                         <button 
                            onClick={() => setExerciseView('sheet_inspection')}
                            className={`px-4 py-2 text-sm font-bold rounded transition-colors ${exerciseView === 'sheet_inspection' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'}`}
                        >
                            Inspection Sheet
                        </button>
                    </div>
                </div>
             </div>

             {exerciseView === 'entry' && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     {/* Creation Form */}
                     <div className="lg:col-span-1 bg-gray-50 p-4 rounded border border-gray-200 h-fit">
                         <h3 className="font-bold text-lg text-gray-700 mb-4 border-b pb-2">Add New Assignment</h3>
                         <div className="space-y-3">
                             <div>
                                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Subject</label>
                                 <select 
                                    className="w-full border p-2 rounded"
                                    value={newExercise.subject}
                                    onChange={(e) => setNewExercise({...newExercise, subject: e.target.value})}
                                 >
                                     <option value="">Select Subject</option>
                                     {coreSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Type</label>
                                 <select 
                                    className="w-full border p-2 rounded"
                                    value={newExercise.type}
                                    onChange={(e) => setNewExercise({...newExercise, type: e.target.value as any})}
                                 >
                                     <option value="Class">Class Assignment</option>
                                     <option value="Home">Home Assignment</option>
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Source</label>
                                 <select 
                                    className="w-full border p-2 rounded"
                                    value={newExercise.source}
                                    onChange={(e) => setNewExercise({...newExercise, source: e.target.value as any})}
                                 >
                                     <option value="Exercise Book">Exercise Book</option>
                                     {showMonitoringSystem && <option value="Textbook">Textbook</option>}
                                 </select>
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Exercise No.</label>
                                    <input 
                                        type="text" 
                                        className="w-full border p-2 rounded" 
                                        placeholder="e.g. 1, 2"
                                        value={newExercise.exerciseNo}
                                        onChange={(e) => setNewExercise({...newExercise, exerciseNo: e.target.value})}
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Max Score</label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2 rounded" 
                                        value={newExercise.maxScore}
                                        onChange={(e) => setNewExercise({...newExercise, maxScore: parseInt(e.target.value) || 10})}
                                    />
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Date</label>
                                 <input 
                                    type="date" 
                                    className="w-full border p-2 rounded" 
                                    value={newExercise.date}
                                    onChange={(e) => setNewExercise({...newExercise, date: e.target.value})}
                                 />
                             </div>
                             <div>
                                 <button 
                                    onClick={handleAddExercise}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded shadow transition-colors"
                                 >
                                     Create Exercise
                                 </button>
                             </div>
                         </div>

                         {/* List of Exercises */}
                         <div className="mt-8">
                             <div className="flex justify-between items-end mb-2">
                                <h4 className="font-bold text-sm text-gray-600 uppercase">Recorded Exercises</h4>
                                <select 
                                    className="border p-1 rounded text-xs w-32"
                                    value={exerciseListFilter}
                                    onChange={(e) => setExerciseListFilter(e.target.value)}
                                >
                                    <option value="">All Subjects</option>
                                    {coreSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                             </div>
                             <div className="max-h-64 overflow-y-auto space-y-2">
                                 {exercises
                                    .filter(ex => ex.term === exerciseTerm)
                                    .filter(ex => !exerciseListFilter || ex.subject === exerciseListFilter)
                                    .map(ex => (
                                     <div 
                                        key={ex.id}
                                        onClick={() => setSelectedExerciseId(ex.id)}
                                        className={`p-2 rounded border cursor-pointer text-sm ${selectedExerciseId === ex.id ? 'bg-blue-100 border-blue-400' : 'bg-white hover:bg-gray-100'}`}
                                     >
                                         <div className="flex justify-between font-bold text-gray-800">
                                             <span>Ex {ex.exerciseNo} ({ex.type})</span>
                                             <span>{ex.date}</span>
                                         </div>
                                         <div className="text-xs text-gray-500">
                                             <span className="font-bold text-blue-900">{ex.subject}</span> - {ex.source} - Max: {ex.maxScore}
                                         </div>
                                     </div>
                                 ))}
                                 {exercises.filter(ex => ex.term === exerciseTerm).length === 0 && <p className="text-xs text-gray-400 italic">No exercises recorded for {exerciseTerm}.</p>}
                             </div>
                         </div>
                     </div>

                     {/* Score Entry Table */}
                     <div className="lg:col-span-2">
                         {selectedExerciseId ? (
                             <div className="bg-white border rounded shadow-sm">
                                 <div className="p-3 bg-gray-100 border-b font-bold text-gray-700 flex justify-between items-center">
                                     <span>Entering Scores for {exercises.find(e => e.id === selectedExerciseId)?.subject} - Ex {exercises.find(e => e.id === selectedExerciseId)?.exerciseNo}</span>
                                     <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">Max Score: {exercises.find(e => e.id === selectedExerciseId)?.maxScore}</span>
                                 </div>
                                 <table className="w-full text-sm">
                                     <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                         <tr>
                                             <th className="p-2 border-b text-left">Pupil Name</th>
                                             <th className="p-2 border-b w-32 text-center">Score</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {sortedStudents.map(student => {
                                             const val = exerciseScores[selectedExerciseId]?.[student.id] || '';
                                             return (
                                                 <tr key={student.id} className="hover:bg-blue-50">
                                                     <td className="p-3 border-b font-semibold">{student.name}</td>
                                                     <td className="p-2 border-b text-center">
                                                         <input 
                                                            type="number"
                                                            value={val}
                                                            onChange={(e) => handleScoreEntry(student.id, e.target.value)}
                                                            className="border p-1 w-20 text-center rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                         />
                                                     </td>
                                                 </tr>
                                             );
                                         })}
                                     </tbody>
                                 </table>
                             </div>
                         ) : (
                             <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded p-8">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                 <p className="mt-2">Select an exercise to enter scores</p>
                             </div>
                         )}
                     </div>
                 </div>
             )}

             {/* MONITORING / BOOK INSPECTION VIEW */}
             {exerciseView === 'monitoring' && showMonitoringSystem && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="bg-gray-50 p-4 rounded border border-gray-200">
                         <h3 className="font-bold text-lg text-blue-900 mb-4 border-b pb-2 uppercase">Log New Inspection</h3>
                         
                         {/* Row 1: Context */}
                         <div className="grid grid-cols-2 gap-4 mb-4">
                             <div>
                                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Week No.</label>
                                 <input type="number" value={newLog.week} onChange={e => setNewLog({...newLog, week: e.target.value})} className="w-full border p-2 rounded" />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Date</label>
                                 <input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="w-full border p-2 rounded" />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Subject</label>
                                 <select value={newLog.subject} onChange={e => setNewLog({...newLog, subject: e.target.value})} className="w-full border p-2 rounded">
                                     <option value="">Select Subject</option>
                                     {coreSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Source</label>
                                 <select value={newLog.source} onChange={e => setNewLog({...newLog, source: e.target.value})} className="w-full border p-2 rounded">
                                     <option value="Exercise Book">Exercise Book</option>
                                     <option value="Textbook">Textbook</option>
                                 </select>
                             </div>
                         </div>

                         {/* Row 2: Metrics */}
                         <h4 className="font-bold text-xs uppercase text-gray-600 mb-2 mt-6 border-b">Compliance Metrics (Count)</h4>
                         <div className="grid grid-cols-3 gap-3 mb-6">
                             {[
                                 { label: 'Unmarked', key: 'unmarked' },
                                 { label: 'Undated', key: 'undated' },
                                 { label: 'Untitled', key: 'untitled' },
                                 { label: 'Uncorrected', key: 'uncorrected' },
                                 { label: 'Corr. Not Marked', key: 'correctedNotMarked' },
                                 { label: 'Missing Books', key: 'missingBooks' },
                             ].map((field) => (
                                 <div key={field.key}>
                                     <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 truncate" title={field.label}>{field.label}</label>
                                     <input 
                                        type="number" 
                                        min="0"
                                        value={(newLog as any)[field.key]} 
                                        onChange={e => setNewLog({...newLog, [field.key]: parseInt(e.target.value) || 0})} 
                                        className="w-full border p-2 rounded text-center font-bold" 
                                     />
                                 </div>
                             ))}
                         </div>

                         {/* Row 3: Defaulters */}
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <h4 className="font-bold text-xs uppercase text-red-600 mb-2">Exercise Defaulters</h4>
                                 <div className="h-32 overflow-y-auto border p-2 bg-white rounded text-xs">
                                     {sortedStudents.map(s => (
                                         <label key={s.id} className="flex items-center gap-2 mb-1 cursor-pointer hover:bg-red-50">
                                             <input 
                                                type="checkbox" 
                                                checked={newLog.exerciseDefaulters?.includes(s.name)}
                                                onChange={() => toggleDefaulter('exercise', s.name)}
                                             />
                                             {s.name}
                                         </label>
                                     ))}
                                 </div>
                             </div>
                             <div>
                                 <h4 className="font-bold text-xs uppercase text-red-600 mb-2">Homework Defaulters</h4>
                                 <div className="h-32 overflow-y-auto border p-2 bg-white rounded text-xs">
                                     {sortedStudents.map(s => (
                                         <label key={s.id} className="flex items-center gap-2 mb-1 cursor-pointer hover:bg-red-50">
                                             <input 
                                                type="checkbox" 
                                                checked={newLog.homeworkDefaulters?.includes(s.name)}
                                                onChange={() => toggleDefaulter('homework', s.name)}
                                             />
                                             {s.name}
                                         </label>
                                     ))}
                                 </div>
                             </div>
                         </div>

                         <button onClick={handleSaveLog} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded shadow">
                             Save Inspection Log
                         </button>
                     </div>

                     {/* Log Table */}
                     <div>
                         <h3 className="font-bold text-lg text-gray-700 mb-4 border-b pb-2 uppercase">Recent Inspection Logs</h3>
                         <div className="space-y-3 max-h-[600px] overflow-y-auto">
                             {monitoringLogs.filter(log => log.term === exerciseTerm).slice().reverse().map(log => (
                                 <div key={log.id} className="bg-white border rounded p-3 shadow-sm text-sm">
                                     <div className="flex justify-between font-bold text-blue-900 border-b pb-1 mb-2">
                                         <span>Wk {log.week} - {log.date}</span>
                                         <span>{log.subject} ({log.source})</span>
                                     </div>
                                     <div className="grid grid-cols-3 gap-y-2 text-xs text-gray-600 mb-2">
                                         <div>Unmarked: <span className="font-bold text-black">{log.unmarked}</span></div>
                                         <div>Undated: <span className="font-bold text-black">{log.undated}</span></div>
                                         <div>Untitled: <span className="font-bold text-black">{log.untitled}</span></div>
                                         <div>Uncorrected: <span className="font-bold text-black">{log.uncorrected}</span></div>
                                         <div>Corr. No Mark: <span className="font-bold text-black">{log.correctedNotMarked}</span></div>
                                         <div className="text-red-600">Missing: <span className="font-bold">{log.missingBooks}</span></div>
                                     </div>
                                     {(log.exerciseDefaulters.length > 0 || log.homeworkDefaulters.length > 0) && (
                                         <div className="bg-red-50 p-2 rounded text-xs mt-2 border border-red-100">
                                             {log.exerciseDefaulters.length > 0 && (
                                                 <div className="mb-1"><strong className="text-red-700">Ex. Defaulters:</strong> {log.exerciseDefaulters.join(', ')}</div>
                                             )}
                                             {log.homeworkDefaulters.length > 0 && (
                                                 <div><strong className="text-red-700">HW Defaulters:</strong> {log.homeworkDefaulters.join(', ')}</div>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             ))}
                             {monitoringLogs.filter(log => log.term === exerciseTerm).length === 0 && <p className="text-gray-400 italic text-center">No logs recorded for {exerciseTerm}.</p>}
                         </div>
                     </div>
                 </div>
             )}

             {/* ASSIGNMENTS MASTER SHEET */}
             {exerciseView === 'sheet_assignments' && (
                 <div className="overflow-x-auto">
                     <div className="flex justify-between items-center mb-4 no-print gap-4">
                         <h3 className="text-lg font-bold uppercase text-gray-700">Class Assignments Master Sheet</h3>
                         <div className="flex gap-2">
                             <select 
                                value={sheetSubjectFilter}
                                onChange={(e) => setSheetSubjectFilter(e.target.value)}
                                className="border border-gray-300 rounded p-1 text-sm"
                             >
                                 <option value="">Select Subject</option>
                                 {coreSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                             <button 
                                onClick={() => window.print()} 
                                className="bg-gray-800 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-black"
                             >
                                Print Sheet
                             </button>
                         </div>
                     </div>
                     
                     {sheetSubjectFilter ? (
                         <div className="border border-black p-4 w-full print:border-none print:p-0">
                            <div className="text-center mb-6">
                                <h1 className="text-xl font-bold uppercase underline">Assignments Master Sheet: {sheetSubjectFilter}</h1>
                                <div className="flex gap-4 justify-center text-sm font-bold mt-2 uppercase">
                                    <span>Class: {schoolClass}</span>
                                    <span>Term: {exerciseTerm}</span>
                                    <span>Year: {settings?.academicYear}</span>
                                </div>
                            </div>

                            <table className="w-full border-collapse border border-black text-xs">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th rowSpan={2} className="border border-black p-2 sticky left-0 bg-gray-200 z-10">#</th>
                                        <th rowSpan={2} className="border border-black p-2 text-left sticky left-8 bg-gray-200 z-10 min-w-[150px]">Name</th>
                                        <th colSpan={2} className="border border-black p-1 text-center font-bold">Participation</th>
                                        {filteredExercisesForSheet.map(ex => (
                                            <th key={ex.id} className="border border-black p-1 min-w-[30px] h-32 align-bottom bg-gray-100 relative">
                                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 origin-bottom text-[9px] whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                                    <span className="font-bold">{ex.date}</span> (Ex{ex.exerciseNo})
                                                </div>
                                            </th>
                                        ))}
                                        {filteredExercisesForSheet.length === 0 && <th className="border border-black p-2 text-gray-500 italic font-normal">No exercises recorded</th>}
                                    </tr>
                                    <tr className="bg-gray-200 text-[9px]">
                                        <th className="border border-black p-1 w-10">Class<br/>(Min 5)</th>
                                        <th className="border border-black p-1 w-10">Home<br/>(Min 3)</th>
                                        {filteredExercisesForSheet.map(ex => (
                                            <th key={ex.id} className="border border-black p-1 text-center bg-gray-100">{ex.maxScore}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStudentsForMasterSheet.map((student, idx) => {
                                        // Calc counts for this subject only
                                        let classC = 0, homeC = 0;
                                        filteredExercisesForSheet.forEach(ex => {
                                            const s = exerciseScores[ex.id]?.[student.id];
                                            if(s && s!=='') {
                                                if(ex.type==='Class') classC++;
                                                else homeC++;
                                            }
                                        });
                                        
                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50 border-b border-black">
                                                <td className="border border-black p-1 text-center">{idx + 1}</td>
                                                <td className="border border-black p-1 font-bold whitespace-nowrap">{student.name}</td>
                                                <td className={`border border-black p-1 text-center font-bold ${classC < 5 ? 'text-red-600 bg-red-50' : 'text-green-800'}`}>{classC}</td>
                                                <td className={`border border-black p-1 text-center font-bold ${homeC < 3 ? 'text-red-600 bg-red-50' : 'text-green-800'}`}>{homeC}</td>
                                                {filteredExercisesForSheet.map(ex => (
                                                    <td key={ex.id} className="border border-black p-1 text-center">
                                                        {exerciseScores[ex.id]?.[student.id] || '-'}
                                                    </td>
                                                ))}
                                                {filteredExercisesForSheet.length === 0 && <td className="border border-black p-1"></td>}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            <div className="mt-4 text-[10px] text-gray-500">
                                * Students sorted by lowest participation first to prioritize monitoring.
                            </div>
                        </div>
                     ) : (
                         <div className="text-center p-8 text-gray-500 border-2 border-dashed">
                             Please select a subject to view the Master Sheet.
                         </div>
                     )}
                 </div>
             )}

            {/* INSPECTION MASTER SHEET */}
            {exerciseView === 'sheet_inspection' && (
                 <div className="overflow-x-auto">
                     <div className="flex justify-between items-center mb-4 no-print gap-4">
                         <h3 className="text-lg font-bold uppercase text-gray-700">Inspection Log Master Sheet</h3>
                         <div className="flex gap-2">
                             <select 
                                value={sheetSubjectFilter}
                                onChange={(e) => setSheetSubjectFilter(e.target.value)}
                                className="border border-gray-300 rounded p-1 text-sm"
                             >
                                 <option value="">Select Subject</option>
                                 {coreSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                             <button 
                                onClick={() => window.print()} 
                                className="bg-gray-800 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-black"
                             >
                                Print Sheet
                             </button>
                         </div>
                     </div>
                     
                     {sheetSubjectFilter ? (
                         <div className="border border-black p-4 w-full print:border-none print:p-0">
                            <div className="text-center mb-6">
                                <h1 className="text-xl font-bold uppercase underline">Book Inspection Master Sheet: {sheetSubjectFilter}</h1>
                                <div className="flex gap-4 justify-center text-sm font-bold mt-2 uppercase">
                                    <span>Class: {schoolClass}</span>
                                    <span>Term: {exerciseTerm}</span>
                                    <span>Year: {settings?.academicYear}</span>
                                </div>
                            </div>

                            <table className="w-full border-collapse border border-black text-xs">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-2 text-left">Week</th>
                                        <th className="border border-black p-2 text-left">Date</th>
                                        <th className="border border-black p-2 text-center w-20" title="Unmarked">Un-Mk</th>
                                        <th className="border border-black p-2 text-center w-20" title="Undated">Un-Dt</th>
                                        <th className="border border-black p-2 text-center w-20" title="Untitled">Un-Tl</th>
                                        <th className="border border-black p-2 text-center w-20" title="Uncorrected">Un-Cr</th>
                                        <th className="border border-black p-2 text-center w-20" title="Corrected Not Marked">Cr-NM</th>
                                        <th className="border border-black p-2 text-center w-20" title="Missing Books">Miss</th>
                                        <th className="border border-black p-2 text-left">Exercise Defaulters</th>
                                        <th className="border border-black p-2 text-left">Homework Defaulters</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogsForSheet.map((log, idx) => (
                                        <tr key={log.id} className="hover:bg-gray-50 border-b border-black">
                                            <td className="border border-black p-2 font-bold text-center">{log.week}</td>
                                            <td className="border border-black p-2 text-center whitespace-nowrap">{log.date}</td>
                                            <td className={`border border-black p-2 text-center font-bold ${log.unmarked > 0 ? 'text-red-600' : 'text-gray-400'}`}>{log.unmarked}</td>
                                            <td className={`border border-black p-2 text-center font-bold ${log.undated > 0 ? 'text-red-600' : 'text-gray-400'}`}>{log.undated}</td>
                                            <td className={`border border-black p-2 text-center font-bold ${log.untitled > 0 ? 'text-red-600' : 'text-gray-400'}`}>{log.untitled}</td>
                                            <td className={`border border-black p-2 text-center font-bold ${log.uncorrected > 0 ? 'text-red-600' : 'text-gray-400'}`}>{log.uncorrected}</td>
                                            <td className={`border border-black p-2 text-center font-bold ${log.correctedNotMarked > 0 ? 'text-red-600' : 'text-gray-400'}`}>{log.correctedNotMarked}</td>
                                            <td className={`border border-black p-2 text-center font-bold ${log.missingBooks > 0 ? 'text-red-600' : 'text-gray-400'}`}>{log.missingBooks}</td>
                                            <td className="border border-black p-2 text-red-800 italic">{log.exerciseDefaulters.join(', ')}</td>
                                            <td className="border border-black p-2 text-red-800 italic">{log.homeworkDefaulters.join(', ')}</td>
                                        </tr>
                                    ))}
                                    {filteredLogsForSheet.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="border border-black p-4 text-center text-gray-500 italic">No inspection logs recorded for this subject/term.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                     ) : (
                         <div className="text-center p-8 text-gray-500 border-2 border-dashed">
                             Please select a subject to view the Inspection Sheet.
                         </div>
                     )}
                 </div>
             )}
        </div>
      );
  }

  if (module === 'Indicators List' as any) {
      // ... (Indicators List code remains unchanged but ensuring it returns if matched)
      return (
        <div className="bg-white p-6 rounded shadow-md min-h-[500px]">
             {/* ... (Existing Indicators List UI) ... */}
             <div className="border-b pb-4 mb-6">
                <h2 className="text-2xl font-bold text-blue-900 uppercase">{department}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-bold">{schoolClass}</span>
                    <span className="text-gray-400">/</span>
                    <h3 className="text-xl text-gray-600 font-bold">Indicators Management</h3>
                </div>
            </div>

            <p className="mb-4 text-sm text-gray-500">
                Create custom indicators and select which ones to display in the Score Entry Dashboard.
            </p>
            
            <div className="flex gap-2 mb-6">
                <input 
                    type="text" 
                    value={newIndicator}
                    onChange={(e) => setNewIndicator(e.target.value)}
                    placeholder="Enter new custom indicator..."
                    className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                    onClick={handleAddIndicator}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition-colors text-sm"
                >
                    Create
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allIndicators.map(ind => {
                    const isActive = settings?.activeIndicators?.includes(ind);
                    const isStandard = DAYCARE_INDICATORS.includes(ind);
                    return (
                        <div key={ind} className={`p-3 border rounded flex items-center justify-between transition-colors ${isActive ? 'bg-blue-50 border-blue-400' : 'bg-gray-50'}`}>
                            <div className="flex flex-col">
                                <span className={`font-semibold text-sm ${isActive ? 'text-blue-900' : 'text-gray-600'}`}>{ind}</span>
                                {!isStandard && <span className="text-[10px] text-gray-400 italic">Custom</span>}
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => toggleIndicator(ind)}
                                    className={`px-3 py-1 rounded text-xs font-bold ${isActive ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                >
                                    {isActive ? 'Active' : 'Enable'}
                                </button>
                                {!isStandard && (
                                    <button 
                                        onClick={() => handleDeleteIndicator(ind)}
                                        className={`px-3 py-1 rounded text-xs font-bold shadow-sm ${isActive ? 'bg-red-200 text-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                                        title={isActive ? "Disable first" : "Delete Permanently"}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      );
  }

  if (module === 'Subject List' as any) {
      // ... (Subject List code remains unchanged but ensuring it returns if matched)
      return (
        <div className="bg-white p-6 rounded shadow-md min-h-[500px]">
             {/* ... (Existing Subject List UI) ... */}
             <div className="border-b pb-4 mb-6">
                <h2 className="text-2xl font-bold text-blue-900 uppercase">{department}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-bold">{schoolClass}</span>
                    <span className="text-gray-400">/</span>
                    <h3 className="text-xl text-gray-600 font-bold">Subject Management</h3>
                </div>
            </div>

            <p className="mb-4 text-sm text-gray-500">
                Manage the subjects available in the Score Entry Dashboard for this department.
            </p>
            
            <div className="flex gap-2 mb-6">
                <input 
                    type="text" 
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Enter new subject name..."
                    className="border border-gray-300 p-2 rounded flex-1 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                    onClick={handleAddSubject}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition-colors text-sm"
                >
                    Add Subject
                </button>
            </div>

            <div className="space-y-4">
                 <h4 className="font-bold text-gray-700 uppercase border-b pb-1">Core Subjects (Default)</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                     {coreSubjects.map(sub => (
                         <div key={sub} className="p-2 bg-gray-100 border rounded text-gray-700 font-semibold text-sm">
                             {sub}
                         </div>
                     ))}
                 </div>

                 {settings?.customSubjects && settings.customSubjects.length > 0 && (
                     <>
                        <h4 className="font-bold text-blue-800 uppercase border-b pb-1 mt-6">Custom Subjects</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {settings.customSubjects.map(sub => (
                                <div key={sub} className="p-2 bg-blue-50 border border-blue-200 rounded flex justify-between items-center">
                                    <span className="font-bold text-blue-900 text-sm">{sub}</span>
                                    <button 
                                        onClick={() => handleDeleteSubject(sub)}
                                        className="text-red-600 hover:bg-red-100 px-2 py-1 rounded text-xs font-bold"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                     </>
                 )}

                 {isPreSchool && settings?.activeIndicators && settings.activeIndicators.length > 0 && (
                     <div className="mt-8 opacity-75">
                         <h4 className="font-bold text-gray-500 uppercase border-b pb-1">Active Indicators (Visible in Dropdown)</h4>
                         <div className="flex flex-wrap gap-2 mt-2">
                             {settings.activeIndicators.map(ind => (
                                 <span key={ind} className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs border">
                                     {ind}
                                 </span>
                             ))}
                         </div>
                         <p className="text-xs text-gray-400 mt-1 italic">Manage these in "Indicators List" tab.</p>
                     </div>
                 )}
            </div>
        </div>
      );
  }

  // Specific override for Examination Module sub-views when passed via props or state
  const getExamColumns = () => {
      // These are accessed if module prop is exactly these strings
      if (module === 'Examination Time Table' as any) return ['Date', 'Time', 'Subject Code', 'Subject Title', 'Duration', 'Venue'];
      if (module === 'Invigilators List' as any) return ['Date', 'Time', 'Subject', 'Venue', 'Invigilator 1', 'Invigilator 2'];
      
      // Early Childhood specifics
      if (module === 'Observation Time Table' as any) return ['Date', 'Time', 'Activity / Learning Area', 'Duration', 'Venue / Location'];
      if (module === 'Observers List' as any) return ['Date', 'Time', 'Activity', 'Venue', 'Observer 1', 'Observer 2'];
      
      // Kindergarten specific labels if passed
      if (module === 'Facilitators List' as any) return ['Date', 'Time', 'Subject', 'Venue', 'Facilitator 1', 'Facilitator 2'];

      return getColumns();
  };

  const finalColumns = (
      module === 'Examination Time Table' as any || 
      module === 'Invigilators List' as any ||
      module === 'Observation Time Table' as any ||
      module === 'Observers List' as any ||
      module === 'Facilitators List' as any
    ) ? getExamColumns() : getColumns();

  if (module === 'Pupil Enrolment') {
      // ... (Existing Enrolment Render - Unchanged)
      return (
        <div className="bg-white p-6 rounded shadow-md min-h-[600px]">
            {/* Header */}
            <div className="border-b pb-4 mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-blue-900 uppercase">{department}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-bold">{schoolClass}</span>
                        <span className="text-gray-400">/</span>
                        <h3 className="text-xl text-gray-600 font-bold">Pupil Enrolment System</h3>
                    </div>
                </div>
                <div className="flex gap-2">
                     <button onClick={handleDownload} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded border border-blue-200 text-sm font-bold flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download CSV
                     </button>
                     <label className="text-green-600 hover:bg-green-50 px-3 py-1 rounded border border-green-200 text-sm font-bold flex items-center gap-1 cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        Upload Records
                        <input type="file" className="hidden" accept=".csv" onChange={(e) => alert("File upload simulated.")} />
                     </label>
                     <button onClick={handleSaveEnrolment} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm font-bold flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        Save
                     </button>
                </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex gap-4 mb-4 border-b border-gray-200">
                <button 
                  onClick={() => setEnrolmentView('records')}
                  className={`pb-2 px-4 font-bold text-sm border-b-2 transition-colors ${enrolmentView === 'records' ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
                >
                    Pupil Enrolment Records
                </button>
                <button 
                  onClick={() => setEnrolmentView('attendance')}
                  className={`pb-2 px-4 font-bold text-sm border-b-2 transition-colors ${enrolmentView === 'attendance' ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
                >
                    Daily Attendance Register
                </button>
                <button 
                  onClick={() => setEnrolmentView('history')}
                  className={`pb-2 px-4 font-bold text-sm border-b-2 transition-colors ${enrolmentView === 'history' ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
                >
                    Attendance History
                </button>
            </div>

            {/* View: Enrolment Records */}
            {enrolmentView === 'records' && (
                <div>
                    <div className="flex justify-between mb-2">
                        <p className="text-sm text-gray-500">Sorted by Gender (Boys first) then Alphabetical.</p>
                        <button onClick={addNewStudent} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded font-bold">Add Pupil</button>
                    </div>
                    <div className="overflow-x-auto border rounded">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 uppercase text-xs font-bold text-gray-700">
                                <tr>
                                    <th className="p-2 border">#</th>
                                    <th className="p-2 border min-w-[200px]">Full Name</th>
                                    <th className="p-2 border w-24">Gender</th>
                                    <th className="p-2 border">DOB</th>
                                    <th className="p-2 border">Guardian</th>
                                    <th className="p-2 border">Contact</th>
                                    <th className="p-2 border">Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStudents.map((student, idx) => (
                                    <tr key={student.id} className="hover:bg-gray-50 border-b last:border-0">
                                        <td className="p-2 border text-center text-gray-500">{idx + 1}</td>
                                        <td className="p-2 border font-bold">
                                            <EditableField value={student.name} onChange={(v) => handleStudentChange(student.id, 'name', v)} className="w-full uppercase" />
                                        </td>
                                        <td className="p-2 border">
                                            <select 
                                                value={student.gender || 'Male'} 
                                                onChange={(e) => handleGenderChange(student.id, e.target.value)}
                                                className="w-full bg-transparent p-1"
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </td>
                                        <td className="p-2 border">
                                            <EditableField value={student.dob || ''} onChange={(v) => handleStudentChange(student.id, 'dob', v)} placeholder="YYYY-MM-DD" className="w-full" />
                                        </td>
                                        <td className="p-2 border">
                                            <EditableField value={student.guardian || ''} onChange={(v) => handleStudentChange(student.id, 'guardian', v)} className="w-full" />
                                        </td>
                                        <td className="p-2 border">
                                            <EditableField value={student.contact || ''} onChange={(v) => handleStudentChange(student.id, 'contact', v)} className="w-full" />
                                        </td>
                                        <td className="p-2 border">
                                            <EditableField value={student.address || ''} onChange={(v) => handleStudentChange(student.id, 'address', v)} className="w-full" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* View: Attendance Register */}
            {enrolmentView === 'attendance' && (
                <div>
                     {/* Week Info Header */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-gray-50 p-4 rounded border border-gray-200">
                         <div className="flex items-center gap-2">
                             <label className="text-xs font-bold uppercase text-gray-600">Week No:</label>
                             <EditableField 
                                value={weekInfo.number} 
                                onChange={(v) => setWeekInfo({...weekInfo, number: v})} 
                                className="w-16 font-bold text-center bg-white border border-gray-300 rounded"
                             />
                             <span className="text-xs text-gray-400 italic">(Entry Mode)</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <label className="text-xs font-bold uppercase text-gray-600">Date Begin:</label>
                             <EditableField 
                                value={weekInfo.start} 
                                onChange={(v) => setWeekInfo({...weekInfo, start: v})} 
                                placeholder="YYYY-MM-DD"
                                className="w-full bg-white border border-gray-300 rounded px-2"
                             />
                         </div>
                         <div className="flex items-center gap-2">
                             <label className="text-xs font-bold uppercase text-gray-600">Date End:</label>
                             <EditableField 
                                value={weekInfo.end} 
                                onChange={(v) => setWeekInfo({...weekInfo, end: v})} 
                                placeholder="YYYY-MM-DD"
                                className="w-full bg-white border border-gray-300 rounded px-2"
                             />
                         </div>
                     </div>

                     <div className="overflow-x-auto border rounded shadow-sm">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                {/* Keys / Legend Row in Header */}
                                <tr className="bg-white border-b border-gray-300">
                                    <th colSpan={9} className="p-2">
                                        <div className="flex flex-wrap gap-3 text-xs font-bold items-center justify-center text-gray-600 uppercase">
                                            <span className="text-black mr-2">Keys:</span>
                                            <div className="flex items-center gap-1 cursor-pointer" onClick={() => markAllDay('Mon', 'P')} title="Click to fill Mon"><span className="w-3 h-3 bg-green-200 border border-green-300 block"></span> Present (P)</div>
                                            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 border border-red-300 block"></span> Absent (A)</div>
                                            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-200 block"></span> Perm (P/W)</div>
                                            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 border border-gray-300 block"></span> Holiday (H)</div>
                                        </div>
                                    </th>
                                </tr>
                                <tr className="bg-gray-100 uppercase text-xs font-bold text-gray-700">
                                    <th className="p-2 border">#</th>
                                    <th className="p-2 border min-w-[200px]">Name</th>
                                    {daysOfWeek.map(day => <th key={day} className="p-2 border w-12 text-center">{day}</th>)}
                                    <th className="p-2 border w-16 text-center bg-gray-200">Total</th>
                                    <th className="p-2 border w-16 text-center bg-blue-50">Term Cum.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStudents.map((student, idx) => {
                                    const att = currentWeekAttendance[student.id] || {};
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b last:border-0">
                                            <td className="p-2 border text-center text-gray-500">{idx + 1}</td>
                                            <td className="p-2 border font-bold uppercase">{student.name}</td>
                                            {daysOfWeek.map(day => (
                                                <td key={day} className="p-0 border text-center">
                                                    <select 
                                                        value={att[day] || ''} 
                                                        onChange={(e) => markAttendance(student.id, day, e.target.value as any)}
                                                        className={`w-full h-full p-2 text-center outline-none font-bold ${
                                                            att[day] === 'P' ? 'bg-green-100 text-green-800' :
                                                            att[day] === 'A' ? 'bg-red-100 text-red-800' :
                                                            att[day] === 'WP' ? 'bg-blue-50 text-blue-800' : 
                                                            att[day] === 'H' ? 'bg-gray-200 text-gray-600' : ''
                                                        }`}
                                                    >
                                                        <option value=""></option>
                                                        <option value="P">P</option>
                                                        <option value="A">A</option>
                                                        <option value="WP">P/W</option>
                                                        <option value="WOP">A</option>
                                                        <option value="H">H</option>
                                                    </select>
                                                </td>
                                            ))}
                                            <td className="p-2 border text-center font-bold bg-gray-50">{getWeekRowTotal(student.id)}</td>
                                            <td className="p-2 border text-center font-bold bg-blue-50 text-blue-800">{getTermTotal(student.id)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-200 font-bold text-xs uppercase">
                                    <td colSpan={2} className="p-2 border text-right">Daily Total Present:</td>
                                    {daysOfWeek.map(day => (
                                        <td key={day} className="p-2 border text-center">{getDayTotal(day, 'current')}</td>
                                    ))}
                                    <td colSpan={2} className="p-2 border"></td>
                                </tr>
                                <tr className="bg-gray-100 text-xs">
                                    <td colSpan={9} className="p-2 text-right">
                                        <span className="mr-4 font-bold text-gray-600">Boys Present: {stats.boysPresent}</span>
                                        <span className="mr-4 font-bold text-gray-600">Girls Present: {stats.girlsPresent}</span>
                                        <span className="font-bold text-black">Total: {stats.total}</span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* View: Attendance History */}
            {enrolmentView === 'history' && (
                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded border border-blue-100">
                             <h4 className="text-xs font-bold uppercase text-blue-500 mb-1">Total Class Attendance (Term)</h4>
                             <p className="text-2xl font-black text-blue-900">{historyStats.totalClassTermAttendance}</p>
                             <p className="text-xs text-gray-500">Across {historyStats.totalWeeks} weeks</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded border border-green-100">
                             <h4 className="text-xs font-bold uppercase text-green-500 mb-1">Attendance Percentage</h4>
                             <p className="text-2xl font-black text-green-900">{historyStats.classAttendancePercentage}%</p>
                             <p className="text-xs text-gray-500">Target: 95%+</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded border border-gray-200">
                             <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">Total Weeks Recorded</h4>
                             <p className="text-2xl font-black text-gray-800">{historyStats.totalWeeks}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto border rounded shadow-sm">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 uppercase text-xs font-bold text-gray-700">
                                    <th className="p-2 border sticky left-0 bg-gray-100 z-10 w-10">#</th>
                                    <th className="p-2 border sticky left-10 bg-gray-100 z-10 min-w-[150px]">Name</th>
                                    {historyStats.weeksList.map(wk => (
                                        <th key={wk} className="p-2 border text-center w-12">Wk {wk}</th>
                                    ))}
                                    <th className="p-2 border text-center bg-blue-50 w-20">Total</th>
                                    <th className="p-2 border text-center bg-green-50 w-20">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStudents.map((student, idx) => {
                                    const termTotal = getTermTotal(student.id);
                                    const holidays = getHolidayCount(student.id);
                                    const possible = Math.max((historyStats.totalWeeks * 5) - holidays, 1);
                                    const perc = ((termTotal / possible) * 100).toFixed(0);

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b last:border-0">
                                            <td className="p-2 border text-center text-gray-500 sticky left-0 bg-white">{idx + 1}</td>
                                            <td className="p-2 border font-bold uppercase sticky left-10 bg-white shadow-r">{student.name}</td>
                                            {historyStats.weeksList.map(wk => (
                                                <td key={wk} className="p-2 border text-center text-gray-600">
                                                    {getWeekRowTotal(student.id, wk)}
                                                </td>
                                            ))}
                                            <td className="p-2 border text-center font-bold bg-blue-50 text-blue-900">{termTotal}</td>
                                            <td className={`p-2 border text-center font-bold bg-green-50 ${Number(perc) < 70 ? 'text-red-600' : 'text-green-900'}`}>{perc}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // DEFAULT GENERIC RENDER
  return (
    <div className="bg-white p-6 rounded shadow-md min-h-[600px] relative">
      {/* Selection Modal for Daycare Timetable */}
      {showTimetablePanel && activeRowIndex !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                  <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Configure Activity (L{activeRowIndex})</h3>
                      <button onClick={() => { setShowTimetablePanel(false); setActiveRowIndex(null); }} className="text-white hover:text-gray-300 font-bold">X</button>
                  </div>
                  
                  <div className="p-6">
                      <p className="text-sm text-gray-600 mb-4 bg-yellow-50 p-2 border border-yellow-200 rounded">
                          Select a combination of <strong>Method (X)</strong> and <strong>Learning Area (Y)</strong>.
                          <br/><span className="text-xs italic">Note: A Learning Area cannot be repeated more than twice per day.</span>
                      </p>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-2 border bg-gray-100 text-left min-w-[120px]">Area (Y) \ Method (X)</th>
                                    {TIMETABLE_METHODS.map(method => (
                                        <th key={method} className="p-2 border bg-gray-50 font-bold text-center w-24">
                                            {method}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {TIMETABLE_SUBJECTS.map(subject => {
                                    const count = getSubjectUsageCount(subject);
                                    const isDisabled = count >= 2;
                                    
                                    return (
                                        <tr key={subject}>
                                            <td className="p-2 border font-bold text-gray-700 bg-gray-50">
                                                {subject} 
                                                {count > 0 && <span className="ml-1 text-[10px] text-blue-600">({count}/2)</span>}
                                            </td>
                                            {TIMETABLE_METHODS.map(method => (
                                                <td key={method} className="p-2 border text-center">
                                                    <button
                                                        onClick={() => applyTimetableSelection(method, subject)}
                                                        disabled={isDisabled}
                                                        className={`w-full py-2 px-1 rounded text-[10px] font-bold transition-colors border ${
                                                            isDisabled 
                                                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed border-gray-200' 
                                                            : 'bg-white hover:bg-blue-600 hover:text-white text-blue-900 border-blue-200 shadow-sm'
                                                        }`}
                                                    >
                                                        Select
                                                    </button>
                                                </td>
                                            ))}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                      </div>
                  </div>
                  <div className="bg-gray-100 p-3 flex justify-end">
                      <button 
                        onClick={() => { setShowTimetablePanel(false); setActiveRowIndex(null); }}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-bold text-sm"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* TLM Selection Modal for Daycare Timetable */}
      {showTLMPanel && activeTLMRowIndex !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-purple-900 text-white p-4 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Teaching & Learning Materials</h3>
                      <button onClick={() => { setShowTLMPanel(false); setActiveTLMRowIndex(null); }} className="text-white hover:text-gray-300 font-bold">X</button>
                  </div>
                  
                  <div className="p-4 overflow-y-auto flex-1">
                      {isManageTLMMode ? (
                          <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200">
                              <h4 className="text-xs font-bold uppercase text-gray-600 mb-2">Manage Items</h4>
                              <div className="flex gap-2 mb-4">
                                  <input 
                                    type="text" 
                                    value={newTLMInput}
                                    onChange={(e) => setNewTLMInput(e.target.value)}
                                    placeholder="Add new material..."
                                    className="flex-1 border p-1 text-sm rounded"
                                  />
                                  <button onClick={handleAddNewTLM} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Add</button>
                              </div>
                              <div className="space-y-1">
                                  {availableTLMs.map(tlm => {
                                      const isActive = !inactiveTLMs.includes(tlm);
                                      return (
                                          <div key={tlm} className="flex justify-between items-center text-xs border-b pb-1 last:border-0">
                                              <span className={!isActive ? 'text-gray-400 line-through' : ''}>{tlm}</span>
                                              <button 
                                                onClick={() => toggleTLMActive(tlm)}
                                                className={`text-[10px] px-2 py-0.5 rounded border ${isActive ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-500 hover:bg-green-50'}`}
                                              >
                                                  {isActive ? 'Disable' : 'Enable'}
                                              </button>
                                          </div>
                                      );
                                  })}
                              </div>
                              <button onClick={() => setIsManageTLMMode(false)} className="mt-4 text-xs text-blue-600 underline">Back to Selection</button>
                          </div>
                      ) : (
                          <>
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm text-gray-600">Select materials for this period:</p>
                                <button onClick={() => setIsManageTLMMode(true)} className="text-xs text-blue-600 underline">Manage List</button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {availableTLMs.filter(t => !inactiveTLMs.includes(t)).map(tlm => {
                                    const isSelected = selectedTLMs.includes(tlm);
                                    return (
                                        <div 
                                            key={tlm} 
                                            onClick={() => toggleTLMSelection(tlm)}
                                            className={`p-2 rounded border cursor-pointer text-sm flex items-center justify-between transition-colors ${isSelected ? 'bg-purple-100 border-purple-400 text-purple-900' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}
                                        >
                                            <span>{tlm}</span>
                                            {isSelected && <span className="font-bold text-purple-600">✓</span>}
                                        </div>
                                    );
                                })}
                            </div>
                          </>
                      )}
                  </div>
                  
                  {!isManageTLMMode && (
                      <div className="bg-gray-100 p-3 flex justify-end gap-2">
                        <button 
                            onClick={() => { setShowTLMPanel(false); setActiveTLMRowIndex(null); }}
                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-bold text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={applyTLMSelection}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-sm"
                        >
                            Apply Selection
                        </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      <div className="mb-4 pb-2 border-b flex justify-between items-end">
         <div>
            <h2 className="text-2xl font-bold text-blue-900 uppercase">{module}</h2>
            <div className="text-sm text-gray-500 font-semibold mt-1">
                {department} &bull; {schoolClass}
            </div>
         </div>
         {module === 'Academic Calendar' && (
             <div className="flex gap-2">
                 <button onClick={() => setCalendarView('activities')} className={`px-3 py-1 text-xs font-bold rounded ${calendarView === 'activities' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Activities</button>
                 <button onClick={() => setCalendarView('assessment')} className={`px-3 py-1 text-xs font-bold rounded ${calendarView === 'assessment' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Assessment</button>
                 {schoolClass === 'Basic 9' && (
                    <button onClick={() => setCalendarView('mock')} className={`px-3 py-1 text-xs font-bold rounded ${calendarView === 'mock' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Mock Plan</button>
                 )}
                 <button onClick={() => setCalendarView('extra')} className={`px-3 py-1 text-xs font-bold rounded ${calendarView === 'extra' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Extra-Curricular</button>
             </div>
         )}
         
         {/* Specialized Timetable Day Selector for Daycare */}
         {module === 'Time Table' && isDaycareSpecific && (
             <div className="flex gap-2">
                 {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                    <button 
                        key={day} 
                        onClick={() => setTimetableDay(day as any)} 
                        className={`px-3 py-1 text-xs font-bold rounded ${timetableDay === day ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                        {day}
                    </button>
                 ))}
             </div>
         )}
      </div>
      
      {/* Policy / Instructions Box for Assessment */}
      {module === 'Academic Calendar' && calendarView === 'assessment' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 text-sm text-yellow-800">
              {isPreSchool ? (
                  <>
                    <p className="font-bold mb-1">Early Childhood Assessment Policy:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Assessment should focus on <strong>Developmental Milestones</strong> (Physical, Social, Emotional, Cognitive).</li>
                        <li>Use <strong>Observation Checklists</strong> and <strong>Portfolios</strong> (Photos, Work Samples) instead of written tests.</li>
                        <li>Documentation should be continuous and reflective of the child's growth.</li>
                    </ul>
                  </>
              ) : (
                  <>
                    <p className="font-bold mb-1">Class Assessment Test (C.A.T) Policy:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>CAT 1:</strong> Individual Written Test (Objective/Subjective). Bloom's: Knowledge, Comprehension.</li>
                        <li><strong>CAT 2:</strong> Group Project / Practical Work. Bloom's: Application, Analysis.</li>
                        <li><strong>CAT 3:</strong> Individual Written Test / Final Assessment. Bloom's: Synthesis, Evaluation.</li>
                        <li>All assessments must be recorded within the allocated 3-week period.</li>
                    </ul>
                  </>
              )}
          </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse border border-gray-300">
          <thead className="bg-gray-100 uppercase text-xs font-bold text-gray-700">
            <tr>
              {finalColumns.map((col) => (
                <th key={col} className="p-3 border border-gray-300">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => {
                // Determine if this specific cell should trigger the modal
                const isDaycareTimetable = module === 'Time Table' && isDaycareSpecific;
                let isExcluded = false;
                if (isDaycareTimetable) {
                    const timePeriod = row['Time Period'] || '';
                    const prefix = timePeriod.split(':')[0];
                    if (EXCLUDED_SLOTS.includes(prefix)) isExcluded = true;
                }

                return (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {finalColumns.map((col) => {
                        const isActivityCol = col === 'Activity';
                        const isTLMCol = col === 'Teaching & Learning Materials';
                        
                        // Timetable: Activity Column Click
                        if (isDaycareTimetable && isActivityCol && !isExcluded) {
                            return (
                                <td key={col} className="p-2 border border-gray-300 min-w-[150px] cursor-pointer bg-blue-50/30 hover:bg-blue-100" onClick={() => handleTimetableCellClick(rowIndex)}>
                                    <div className="w-full min-h-[20px] text-blue-800 font-semibold">
                                        {row[col] || <span className="text-gray-400 italic">Click to select...</span>}
                                    </div>
                                </td>
                            );
                        }

                        // Timetable: Teaching & Learning Materials Column Click
                        if (isDaycareTimetable && isTLMCol) {
                             return (
                                <td key={col} className="p-2 border border-gray-300 min-w-[150px] cursor-pointer bg-purple-50/30 hover:bg-purple-100" onClick={() => handleTLMCellClick(rowIndex)}>
                                    <div className="w-full min-h-[20px] text-purple-800 font-semibold">
                                        {row[col] || <span className="text-gray-400 italic">Select materials...</span>}
                                    </div>
                                </td>
                            );
                        }

                        return (
                          <td key={col} className="p-2 border border-gray-300 min-w-[150px]">
                            <EditableField
                              value={row[col] || ''}
                              onChange={(val) => handleTableChange(rowIndex, col, val)}
                              className="w-full bg-transparent"
                              multiline={true} 
                            />
                          </td>
                        );
                    })}
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>
      
      <button 
        onClick={addRow}
        className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-xs font-bold transition-colors"
      >
        + Add Row
      </button>
    </div>
  );
};

export default GenericModule;