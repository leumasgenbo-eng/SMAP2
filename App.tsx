import React, { useState, useMemo, useEffect } from 'react';
import { calculateClassStatistics, processStudentData, calculateFacilitatorStats } from './utils';
import { GlobalSettings, StudentData, Department, Module, SchoolClass } from './types';
import { RAW_STUDENTS, FACILITATORS, getSubjectsForDepartment, DEFAULT_GRADING_REMARKS, DAYCARE_INDICATORS } from './constants';
import MasterSheet from './components/MasterSheet';
import DaycareMasterSheet from './components/DaycareMasterSheet';
import ReportCard from './components/ReportCard';
import DaycareReportCard from './components/DaycareReportCard';
import ScoreEntry from './components/ScoreEntry';
import FacilitatorDashboard from './components/FacilitatorDashboard';
import GenericModule from './components/GenericModule';
import { supabase } from './supabaseClient';

const DEFAULT_SETTINGS: GlobalSettings = {
  schoolName: "UNITED BAYLOR ACADEMY",
  examTitle: "2ND MOCK 2025 BROAD SHEET EXAMINATION",
  mockSeries: "2",
  mockAnnouncement: "Please ensure all scores are entered accurately. Section A is out of 40, Section B is out of 60.",
  mockDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 10 days from now
  submittedSubjects: [],
  termInfo: "TERM 2",
  academicYear: "2024/2025",
  nextTermBegin: "TBA",
  attendanceTotal: "60",
  startDate: "10-02-2025",
  endDate: "15-02-2025",
  headTeacherName: "HEADMASTER NAME",
  reportDate: new Date().toLocaleDateString(),
  schoolContact: "+233 24 000 0000",
  schoolEmail: "info@unitedbaylor.edu.gh",
  facilitatorMapping: FACILITATORS, // Initialize with default constants
  gradingSystemRemarks: DEFAULT_GRADING_REMARKS,
  activeIndicators: DAYCARE_INDICATORS, // Default all active
  customIndicators: [], // Initialize empty
  customSubjects: [], // Initialize empty
  staffList: [] // Initialize empty, will populate from mapping if needed or start fresh
};

const DEPARTMENTS: Department[] = [
  "Daycare",
  "Nursery",
  "Kindergarten",
  "Lower Basic School",
  "Upper Basic School",
  "Junior High School"
];

const DEPARTMENT_CLASSES: Record<Department, SchoolClass[]> = {
  "Daycare": ["D1", "Creche"],
  "Nursery": ["N1", "N2"],
  "Kindergarten": ["K1", "K2"],
  "Lower Basic School": ["Basic 1", "Basic 2", "Basic 3"],
  "Upper Basic School": ["Basic 4", "Basic 5", "Basic 6"],
  "Junior High School": ["Basic 7", "Basic 8", "Basic 9"]
};

const MODULES: Module[] = [
  "Time Table",
  "Academic Calendar",
  "Facilitator List",
  "Pupil Enrolment",
  "Examination",
  "Lesson Plans",
  "Exercise Assessment",
  "Staff Movement",
  "Materials & Logistics",
  "Learner Materials & Booklist",
  "Disciplinary",
  "Special Event Day"
];

const App: React.FC = () => {
  // Navigation State
  const [activeDept, setActiveDept] = useState<Department>("Junior High School");
  const [activeClass, setActiveClass] = useState<SchoolClass>("Basic 9");
  const [activeModule, setActiveModule] = useState<Module>("Examination");
  
  // Loading State
  const [isLoading, setIsLoading] = useState(true);

  // Update active class when department changes
  useEffect(() => {
     const availableClasses = DEPARTMENT_CLASSES[activeDept];
     if (availableClasses && availableClasses.length > 0) {
         setActiveClass(availableClasses[0]);
     }
  }, [activeDept]);

  // JHS Report System Sub-View Mode
  const [reportViewMode, setReportViewMode] = useState<'master' | 'reports' | 'dashboard' | 'facilitators'>('master');
  
  // Examination Module Sub-Tabs (New feature)
  const [examSubTab, setExamSubTab] = useState<'timetable' | 'invigilators' | 'results' | 'indicators' | 'subjects'>('results');

  // Settings State - Init with defaults, then load
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);

  // Student Data State - Central Source of Truth for Enrolment and Scores
  const [students, setStudents] = useState<StudentData[]>([]);

  const [zoomLevel, setZoomLevel] = useState(1.0);

  // Load Data from Supabase on Mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('payload')
          .eq('id', 1)
          .single();

        if (settingsData && settingsData.payload) {
            // Merge defaults in case of new fields
            const loadedSettings = { ...DEFAULT_SETTINGS, ...settingsData.payload };
            
            // Logic for staffList migration (if needed from older saves)
            if (!loadedSettings.staffList || loadedSettings.staffList.length === 0) {
                 const generatedStaff: any[] = [];
                 const seenNames = new Set();
                 Object.entries(loadedSettings.facilitatorMapping || {}).forEach(([subj, name]: [string, any]) => {
                    if (name && !seenNames.has(name)) {
                        generatedStaff.push({
                            id: Date.now().toString() + Math.random(),
                            name: name,
                            role: 'Subject Teacher',
                            status: 'Full Time',
                            subjects: [subj],
                            contact: '',
                            qualification: ''
                        });
                        seenNames.add(name);
                    } else if (name) {
                        const staff = generatedStaff.find(s => s.name === name);
                        if (staff && !staff.subjects.includes(subj)) {
                            staff.subjects.push(subj);
                        }
                    }
                });
                loadedSettings.staffList = generatedStaff;
            }
            setSettings(loadedSettings);
        } else if (settingsError && settingsError.code !== 'PGRST116') {
             // PGRST116 is "Row not found", which is fine for first run
             console.error("Error fetching settings:", JSON.stringify(settingsError));
        }

        // 2. Fetch Students
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('payload');

        if (studentsData && studentsData.length > 0) {
            // Map payload back to student objects
            const loadedStudents = studentsData.map((row: any) => row.payload);
            setStudents(loadedStudents);
        } else {
             if (studentsError && studentsError.code !== 'PGRST116') {
                console.error("Error fetching students:", JSON.stringify(studentsError));
             }
            // First run? Use Raw Constants
            const initialStudents = RAW_STUDENTS.map(s => ({
                ...s,
                scoreDetails: {} 
            }));
            setStudents(initialStudents);
        }
      } catch (err: any) {
          console.error("Unexpected error loading data:", err);
      } finally {
          setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check Department Type
  const isEarlyChildhood = activeDept === "Daycare" || activeDept === "Nursery" || activeDept === "Kindergarten";
  const isObservationDept = activeDept === "Daycare" || activeDept === "Nursery";

  // Effect to handle Title Change based on Department and Class context
  useEffect(() => {
    if (activeDept === 'Lower Basic School' || activeDept === 'Upper Basic School') {
        setSettings(prev => ({
            ...prev,
            examTitle: "END OF TERM EXAMINATION",
        }));
    } else if (activeDept === 'Junior High School') {
         // Basic 7 and 8 do end of term, Basic 9 does Mock
         if (activeClass === 'Basic 7' || activeClass === 'Basic 8') {
             setSettings(prev => ({
                ...prev,
                examTitle: "END OF TERM EXAMINATION",
             }));
         } else {
             setSettings(prev => ({
                ...prev,
                examTitle: "2ND MOCK 2025 BROAD SHEET EXAMINATION",
             }));
         }
    }
  }, [activeDept, activeClass]);

  const handleSettingChange = (key: keyof GlobalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
        // 1. Save Settings
        const { error: settingsError } = await supabase
            .from('settings')
            .upsert({ id: 1, payload: settings });
        
        if (settingsError) throw settingsError;

        // 2. Save Students
        // We upsert all students. 
        // Note: If you delete a student in UI, this doesn't strictly delete from DB unless we handle deletions explicitly.
        // For a simple sync, this usually works for updates/adds.
        const studentRows = students.map(s => ({
            id: s.id,
            payload: s
        }));

        const { error: studentsError } = await supabase
            .from('students')
            .upsert(studentRows);

        if (studentsError) throw studentsError;

        alert("Data saved successfully to Supabase!");
    } catch (err: any) {
        console.error("Save error details:", JSON.stringify(err));
        alert(`Error saving data: ${err.message || "Unknown error (check console)"}`);
    } finally {
        setIsLoading(false);
    }
  };

  // Sync function passed to Report Cards
  const handleStudentUpdate = (id: number, field: keyof StudentData, value: any) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const adjustZoom = (delta: number) => {
    setZoomLevel(prev => {
      const next = prev + delta;
      return Math.max(0.5, Math.min(2.0, parseFloat(next.toFixed(1))));
    });
  };

  // Get dynamic subject list for the active department
  const currentSubjectList = useMemo(() => {
      const subjects = getSubjectsForDepartment(activeDept);
      const custom = settings.customSubjects || [];
      
      let list = [...subjects, ...custom];

      if (isEarlyChildhood) {
          // Include active indicators in the "Subject List" for dropdown purposes if in daycare/nursery/KG
          const indicators = settings.activeIndicators || [];
          list = [...list, ...indicators];
      }
      return list;
  }, [activeDept, isEarlyChildhood, settings.activeIndicators, settings.customSubjects]);

  // Calculate stats and process data
  const { stats, processedStudents, classAvgAggregate, facilitatorStats } = useMemo(() => {
    // For calculating stats, we should only consider core learning areas, not indicators if they are in the list.
    // However, the function handles arbitrary keys.
    const s = calculateClassStatistics(students, currentSubjectList);
    const processed = processStudentData(s, students, settings.facilitatorMapping || {}, currentSubjectList, settings.gradingSystemRemarks, settings.staffList);
    
    const avgAgg = processed.length > 0 ? processed.reduce((sum, st) => sum + st.bestSixAggregate, 0) / processed.length : 0;
    
    const fStats = calculateFacilitatorStats(processed);

    return { 
      stats: s, 
      processedStudents: processed,
      classAvgAggregate: avgAgg,
      facilitatorStats: fStats
    };
  }, [students, settings.facilitatorMapping, currentSubjectList, settings.gradingSystemRemarks, settings.staffList]);

  const handlePrint = () => {
    window.print();
  };

  // Logic to determine if we show the Reporting System
  const isExamDept = true; 
  const showReportingSystem = isExamDept && activeModule === "Examination" && examSubTab === "results";
  const showGenericModule = !showReportingSystem;

  // Logic for Module Name passing to GenericModule
  const getGenericModuleName = () => {
      if (activeModule === 'Examination') {
          if (examSubTab === 'timetable') {
              // Only Daycare and Nursery use Observation labels
              return isObservationDept ? 'Observation Time Table' as any : 'Examination Time Table' as any;
          }
          if (examSubTab === 'invigilators') {
              if (isObservationDept) return 'Observers List' as any;
              if (activeDept === 'Kindergarten') return 'Facilitators List' as any;
              return 'Invigilators List' as any;
          }
          if (examSubTab === 'indicators') {
              return 'Indicators List' as any; // Custom internal name
          }
          if (examSubTab === 'subjects') {
              return 'Subject List' as any;
          }
      }
      return activeModule;
  };

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="text-center">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h2 className="text-xl font-bold text-gray-700">Loading United Baylor Academy System...</h2>
                  <p className="text-gray-500">Connecting to database...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      {/* 1. Top Level: Department Navigation */}
      <div className="no-print bg-blue-900 text-white shadow-md z-50">
          <div className="flex justify-between items-center px-4 py-3">
            <div className="flex items-center gap-2">
                 <div className="bg-white text-blue-900 rounded-full w-8 h-8 flex items-center justify-center font-black">UBA</div>
                 <h1 className="font-bold text-lg hidden lg:block">United Baylor Academy System</h1>
            </div>
            
            <div className="flex gap-1 overflow-x-auto">
                {DEPARTMENTS.map(dept => (
                    <button
                        key={dept}
                        onClick={() => setActiveDept(dept)}
                        className={`px-3 py-1 rounded text-sm font-semibold transition-colors whitespace-nowrap ${
                            activeDept === dept 
                            ? 'bg-yellow-500 text-blue-900 shadow' 
                            : 'text-blue-200 hover:text-white hover:bg-blue-800'
                        }`}
                    >
                        {dept}
                    </button>
                ))}
            </div>
             <div className="flex gap-2">
                 <button onClick={handleSave} className="text-yellow-400 hover:text-yellow-300" title="Save All Data">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2v-4"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                 </button>
            </div>
          </div>
      </div>

      {/* 2. Second Level: Class Navigation */}
      <div className="no-print bg-blue-800 text-white border-b border-blue-900 shadow-inner">
          <div className="px-4 py-1.5 flex gap-2 overflow-x-auto items-center">
              <span className="text-xs font-bold uppercase text-blue-300">Classes:</span>
              {DEPARTMENT_CLASSES[activeDept].map(cls => (
                  <button
                    key={cls}
                    onClick={() => setActiveClass(cls)}
                    className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                        activeClass === cls 
                        ? 'bg-white text-blue-900 border-white' 
                        : 'text-blue-200 border-transparent hover:bg-blue-700'
                    }`}
                  >
                      {cls}
                  </button>
              ))}
          </div>
      </div>

      {/* 3. Third Level: Module Navigation */}
      <div className="no-print bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
          <div className="px-4 py-2 flex gap-4 overflow-x-auto items-center">
              <span className="text-xs font-bold uppercase text-gray-400">Modules:</span>
              {MODULES.map(mod => (
                  <button
                    key={mod}
                    onClick={() => setActiveModule(mod)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                        activeModule === mod 
                        ? 'bg-blue-100 text-blue-900 border-blue-300' 
                        : 'text-gray-600 border-transparent hover:bg-gray-100'
                    }`}
                  >
                      {mod}
                  </button>
              ))}
          </div>
      </div>

      {/* 4. Sub-Module Navigation for Examination */}
      {isExamDept && activeModule === 'Examination' && (
          <div className="no-print bg-gray-50 border-b border-gray-200 px-4 py-2 flex gap-4 justify-center flex-wrap">
             <button
                onClick={() => setExamSubTab('timetable')}
                className={`pb-1 px-4 font-bold text-sm border-b-2 transition-colors ${examSubTab === 'timetable' ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
             >
                {/* Specific Labels: Daycare/Nursery = Observation, Others = Examination */}
                {isObservationDept ? 'Observation Time Table' : 'Examination Time Table'}
             </button>
             <button
                onClick={() => setExamSubTab('invigilators')}
                className={`pb-1 px-4 font-bold text-sm border-b-2 transition-colors ${examSubTab === 'invigilators' ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
             >
                {/* Specific Labels: Daycare/Nursery = Observers, KG = Facilitators, Others = Invigilators */}
                {isObservationDept ? 'Observers List' : activeDept === 'Kindergarten' ? 'Facilitators List' : 'Invigilators List'}
             </button>
             {isEarlyChildhood && (
                 <button
                    onClick={() => setExamSubTab('indicators')}
                    className={`pb-1 px-4 font-bold text-sm border-b-2 transition-colors ${examSubTab === 'indicators' ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
                >
                    Indicators List
                </button>
             )}
             <button
                onClick={() => setExamSubTab('subjects')}
                className={`pb-1 px-4 font-bold text-sm border-b-2 transition-colors ${examSubTab === 'subjects' ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
             >
                Subject List
             </button>
             <button
                onClick={() => setExamSubTab('results')}
                className={`pb-1 px-4 font-bold text-sm border-b-2 transition-colors ${examSubTab === 'results' ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
             >
                Result Entry System
             </button>
          </div>
      )}

      {/* 5. Main Content Area */}
      {showReportingSystem ? (
        <>
            <div className="no-print bg-blue-50 border-b border-blue-200 p-2 flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold uppercase text-blue-900 px-2 bg-blue-200 rounded">{activeClass} Exams Portal</span>
                    <div className="flex bg-white rounded border border-blue-200 p-0.5 text-xs">
                        <button 
                        onClick={() => setReportViewMode('master')}
                        className={`px-3 py-1 rounded transition ${reportViewMode === 'master' ? 'bg-blue-600 text-white font-bold' : 'text-blue-900 hover:bg-blue-50'}`}
                        >
                        Master Board
                        </button>
                        <button 
                        onClick={() => setReportViewMode('reports')}
                        className={`px-3 py-1 rounded transition ${reportViewMode === 'reports' ? 'bg-blue-600 text-white font-bold' : 'text-blue-900 hover:bg-blue-50'}`}
                        >
                        Reports
                        </button>
                        <button 
                        onClick={() => setReportViewMode('dashboard')}
                        className={`px-3 py-1 rounded transition ${reportViewMode === 'dashboard' ? 'bg-blue-600 text-white font-bold' : 'text-blue-900 hover:bg-blue-50'}`}
                        >
                        Score Entry
                        </button>
                         {!isEarlyChildhood && (
                            <button 
                            onClick={() => setReportViewMode('facilitators')}
                            className={`px-3 py-1 rounded transition ${reportViewMode === 'facilitators' ? 'bg-blue-600 text-white font-bold' : 'text-blue-900 hover:bg-blue-50'}`}
                            >
                            Facilitators
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white rounded p-1 text-xs border border-gray-300">
                        <span className="text-gray-500 px-2 uppercase font-bold hidden sm:inline">Zoom:</span>
                        <button onClick={() => adjustZoom(-0.1)} className="px-2 font-bold hover:bg-gray-100">-</button>
                        <span className="w-10 text-center font-mono">{Math.round(zoomLevel * 100)}%</span>
                        <button onClick={() => adjustZoom(0.1)} className="px-2 font-bold hover:bg-gray-100">+</button>
                        <button onClick={() => setZoomLevel(1.0)} className="px-2 text-blue-600 hover:bg-blue-50 border-l ml-1" title="Reset">R</button>
                    </div>

                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded font-bold shadow transition text-xs"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2 2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print View
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 relative">
                <div 
                    id="main-content-area"
                    style={{ 
                        transform: `scale(${zoomLevel})`, 
                        transformOrigin: 'top center',
                    }}
                    className="p-4 md:p-8 transition-transform duration-200 ease-linear origin-top"
                >
                    {reportViewMode === 'master' && !isEarlyChildhood && (
                        <MasterSheet 
                            students={processedStudents} 
                            stats={stats} 
                            settings={settings}
                            onSettingChange={handleSettingChange}
                            subjectList={currentSubjectList}
                        />
                    )}

                    {reportViewMode === 'master' && isEarlyChildhood && (
                        <DaycareMasterSheet 
                            students={processedStudents}
                            settings={settings}
                            onSettingChange={handleSettingChange}
                            subjectList={currentSubjectList}
                        />
                    )}
                    
                    {reportViewMode === 'reports' && (
                        <div className="flex flex-col gap-8 print:gap-0 items-center">
                            {processedStudents.map((student) => {
                                if (isEarlyChildhood) {
                                    return (
                                        <DaycareReportCard 
                                            key={student.id}
                                            student={student}
                                            settings={settings}
                                            onSettingChange={handleSettingChange}
                                            onStudentUpdate={handleStudentUpdate}
                                            schoolClass={activeClass}
                                            totalStudents={processedStudents.length}
                                        />
                                    );
                                }
                                return (
                                    <ReportCard 
                                        key={student.id} 
                                        student={student} 
                                        stats={stats}
                                        settings={settings}
                                        onSettingChange={handleSettingChange}
                                        classAverageAggregate={classAvgAggregate}
                                        onStudentUpdate={handleStudentUpdate}
                                        department={activeDept}
                                        schoolClass={activeClass}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {reportViewMode === 'dashboard' && (
                        <ScoreEntry 
                            students={students} 
                            setStudents={setStudents}
                            settings={settings}
                            onSettingChange={handleSettingChange}
                            onSave={handleSave}
                            department={activeDept}
                            schoolClass={activeClass}
                            subjectList={currentSubjectList}
                        />
                    )}

                    {reportViewMode === 'facilitators' && !isEarlyChildhood && (
                        <FacilitatorDashboard 
                            stats={facilitatorStats}
                            settings={settings}
                            onSettingChange={handleSettingChange}
                            onSave={handleSave}
                        />
                    )}
                </div>
            </div>
        </>
      ) : (
          <div className="flex-1 overflow-auto bg-gray-100 p-8">
              <GenericModule 
                department={activeDept} 
                schoolClass={activeClass} 
                module={getGenericModuleName()} 
                settings={settings}
                onSettingChange={handleSettingChange}
                students={students} // PASSING STUDENTS DOWN FOR SYNC
                setStudents={setStudents} // PASSING SETTER DOWN
               />
          </div>
      )}
    </div>
  );
};

export default App;