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
  examTitle: "3RD-MOCK",
  mockSeries: "3",
  mockAnnouncement: "Please ensure all scores are entered accurately. Section A is out of 40, Section B is out of 60.",
  mockDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  submittedSubjects: [],
  termInfo: "TERM 2",
  academicYear: "2024/2025",
  nextTermBegin: "TBA",
  attendanceTotal: "60",
  startDate: "10-02-2025",
  endDate: "15-02-2025",
  headTeacherName: "HEADMASTER NAME",
  reportDate: new Date().toLocaleDateString(),
  schoolContact: "+233 24 5756734",
  schoolEmail: "info@unitedbaylor.edu.gh",
  facilitatorMapping: FACILITATORS,
  gradingSystemRemarks: DEFAULT_GRADING_REMARKS,
  activeIndicators: DAYCARE_INDICATORS,
  customIndicators: [],
  customSubjects: [],
  scienceBaseScore: 100,
  staffList: []
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
  const [activeDept, setActiveDept] = useState<Department>("Junior High School");
  const [activeClass, setActiveClass] = useState<SchoolClass>("Basic 9");
  const [activeModule, setActiveModule] = useState<Module>("Examination");
  const [isLoading, setIsLoading] = useState(true);
  const [reportViewMode, setReportViewMode] = useState<'master' | 'reports' | 'dashboard' | 'facilitators'>('master');
  const [examSubTab, setExamSubTab] = useState<'timetable' | 'invigilators' | 'results' | 'indicators' | 'subjects'>('results');
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  useEffect(() => {
     const availableClasses = DEPARTMENT_CLASSES[activeDept];
     if (availableClasses && !availableClasses.includes(activeClass)) {
         setActiveClass(availableClasses[0]);
     }
  }, [activeDept]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: settingsData } = await supabase.from('settings').select('payload').eq('id', 1).single();
        if (settingsData?.payload) {
            setSettings({ ...DEFAULT_SETTINGS, ...settingsData.payload });
        }
        const { data: studentsData } = await supabase.from('students').select('payload');
        if (studentsData && studentsData.length > 0) {
            setStudents(studentsData.map((row: any) => row.payload));
        } else {
            setStudents(RAW_STUDENTS.map(s => ({ ...s, scoreDetails: {} })));
        }
      } catch (err) {
          console.error("Fetch error:", err);
      } finally {
          setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const isEarlyChildhood = activeDept === "Daycare" || activeDept === "Nursery" || activeDept === "Kindergarten";
  const isObservationDept = activeDept === "Daycare" || activeDept === "Nursery";

  useEffect(() => {
    if (activeDept === 'Lower Basic School' || activeDept === 'Upper Basic School') {
        setSettings(prev => ({ ...prev, examTitle: "END OF TERM EXAMINATION" }));
    } else if (activeDept === 'Junior High School') {
         setSettings(prev => ({
            ...prev,
            examTitle: (activeClass === 'Basic 7' || activeClass === 'Basic 8') ? "END OF TERM EXAMINATION" : "3RD-MOCK"
         }));
    }
  }, [activeDept, activeClass]);

  const handleSettingChange = (key: keyof GlobalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
        await supabase.from('settings').upsert({ id: 1, payload: settings });
        const studentRows = students.map(s => ({ id: s.id, payload: s }));
        await supabase.from('students').upsert(studentRows);
        alert("Data saved successfully!");
    } catch (err) {
        alert("Error saving data.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleStudentUpdate = (id: number, field: keyof StudentData, value: any) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const currentSubjectList = useMemo(() => {
      const subjects = getSubjectsForDepartment(activeDept);
      let list = [...subjects, ...(settings.customSubjects || [])];
      if (isEarlyChildhood) list = [...list, ...(settings.activeIndicators || [])];
      return list;
  }, [activeDept, isEarlyChildhood, settings.activeIndicators, settings.customSubjects]);

  const { stats, processedStudents, classAvgAggregate, facilitatorStats } = useMemo(() => {
    const s = calculateClassStatistics(students, currentSubjectList, settings.scienceBaseScore);
    const processed = processStudentData(s, students, settings.facilitatorMapping || {}, currentSubjectList, settings.gradingSystemRemarks, settings.staffList, settings.scienceBaseScore);
    const avgAgg = processed.length > 0 ? processed.reduce((sum, st) => sum + st.bestSixAggregate, 0) / processed.length : 0;
    const fStats = calculateFacilitatorStats(processed);
    return { stats: s, processedStudents: processed, classAvgAggregate: avgAgg, facilitatorStats: fStats };
  }, [students, settings.facilitatorMapping, currentSubjectList, settings.gradingSystemRemarks, settings.staffList, settings.scienceBaseScore]);

  const showReportingSystem = activeModule === "Examination" && examSubTab === "results";

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      <div className="no-print bg-blue-900 text-white shadow-md z-50">
          <div className="flex justify-between items-center px-4 py-3">
            <div className="flex items-center gap-2">
                 <div className="bg-white text-blue-900 rounded-full w-8 h-8 flex items-center justify-center font-black">UBA</div>
                 <h1 className="font-bold text-lg hidden lg:block">United Baylor Academy System</h1>
            </div>
            <div className="flex gap-1 overflow-x-auto">
                {DEPARTMENTS.map(dept => (
                    <button key={dept} onClick={() => setActiveDept(dept)} className={`px-3 py-1 rounded text-sm font-semibold transition-colors whitespace-nowrap ${activeDept === dept ? 'bg-yellow-500 text-blue-900 shadow' : 'text-blue-200 hover:text-white hover:bg-blue-800'}`}>{dept}</button>
                ))}
            </div>
             <button onClick={handleSave} className="text-yellow-400 hover:text-yellow-300"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg></button>
          </div>
      </div>

      <div className="no-print bg-blue-800 text-white border-b border-blue-900 shadow-inner">
          <div className="px-4 py-1.5 flex gap-2 overflow-x-auto items-center">
              <span className="text-xs font-bold uppercase text-blue-300">Classes:</span>
              {DEPARTMENT_CLASSES[activeDept].map(cls => (
                  <button key={cls} onClick={() => setActiveClass(cls)} className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${activeClass === cls ? 'bg-white text-blue-900 border-white' : 'text-blue-200 border-transparent hover:bg-blue-700'}`}>{cls}</button>
              ))}
          </div>
      </div>

      <div className="no-print bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
          <div className="px-4 py-2 flex gap-4 overflow-x-auto items-center">
              <span className="text-xs font-bold uppercase text-gray-400">Modules:</span>
              {MODULES.map(mod => (
                  <button key={mod} onClick={() => setActiveModule(mod)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${activeModule === mod ? 'bg-blue-100 text-blue-900 border-blue-300' : 'text-gray-600 border-transparent hover:bg-gray-100'}`}>{mod}</button>
              ))}
          </div>
      </div>

      {activeModule === 'Examination' && (
          <div className="no-print bg-gray-50 border-b border-gray-200 px-4 py-2 flex gap-4 justify-center flex-wrap">
             {['timetable', 'invigilators', ...(isEarlyChildhood ? ['indicators'] : []), 'subjects', 'results'].map(tab => (
                 <button key={tab} onClick={() => setExamSubTab(tab as any)} className={`pb-1 px-4 font-bold text-sm border-b-2 transition-colors ${examSubTab === tab ? 'border-blue-600 text-blue-900' : 'border-transparent text-gray-500 hover:text-blue-600'}`}>
                     {tab === 'results' ? 'Result Entry System' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                 </button>
             ))}
          </div>
      )}

      {showReportingSystem ? (
        <>
            <div className="no-print bg-blue-50 border-b border-blue-200 p-2 flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold uppercase text-blue-900 px-2 bg-blue-200 rounded">{activeClass} Portal</span>
                    <div className="flex bg-white rounded border border-blue-200 p-0.5 text-xs">
                        {['master', 'reports', 'dashboard', 'facilitators'].filter(m => !isEarlyChildhood || m !== 'facilitators').map(mode => (
                            <button key={mode} onClick={() => setReportViewMode(mode as any)} className={`px-3 py-1 rounded transition ${reportViewMode === mode ? 'bg-blue-600 text-white font-bold' : 'text-blue-900 hover:bg-blue-50'}`}>
                                {mode.charAt(0).toUpperCase() + mode.slice(1).replace('Dashboard', 'Score Entry')}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded font-bold shadow text-xs">Print View</button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 relative">
                <div id="main-content-area" className="p-4 md:p-8">
                    {reportViewMode === 'master' && (isEarlyChildhood ? <DaycareMasterSheet students={processedStudents} settings={settings} onSettingChange={handleSettingChange} subjectList={currentSubjectList} /> : <MasterSheet students={processedStudents} stats={stats} settings={settings} onSettingChange={handleSettingChange} subjectList={currentSubjectList} />)}
                    {reportViewMode === 'reports' && (
                        <div className="flex flex-col gap-8 items-center">
                            {processedStudents.map((student) => isEarlyChildhood ? <DaycareReportCard key={student.id} student={student} settings={settings} onSettingChange={handleSettingChange} onStudentUpdate={handleStudentUpdate} schoolClass={activeClass} totalStudents={processedStudents.length} /> : <ReportCard key={student.id} student={student} stats={stats} settings={settings} onSettingChange={handleSettingChange} classAverageAggregate={classAvgAggregate} onStudentUpdate={handleStudentUpdate} department={activeDept} schoolClass={activeClass} />)}
                        </div>
                    )}
                    {reportViewMode === 'dashboard' && <ScoreEntry students={students} setStudents={setStudents} settings={settings} onSettingChange={handleSettingChange} onSave={handleSave} department={activeDept} schoolClass={activeClass} onClassChange={setActiveClass} classOptions={DEPARTMENT_CLASSES[activeDept]} subjectList={currentSubjectList} />}
                    {reportViewMode === 'facilitators' && <FacilitatorDashboard stats={facilitatorStats} settings={settings} onSettingChange={handleSettingChange} onSave={handleSave} />}
                </div>
            </div>
        </>
      ) : (
          <div className="flex-1 overflow-auto bg-gray-100 p-8">
              <GenericModule department={activeDept} schoolClass={activeClass} module={activeModule} settings={settings} onSettingChange={handleSettingChange} students={students} setStudents={setStudents} />
          </div>
      )}
    </div>
  );
};

export default App;