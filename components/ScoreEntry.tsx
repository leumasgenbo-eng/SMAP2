

import React, { useState, useEffect } from 'react';
import { GlobalSettings, StudentData, Department, SchoolClass } from '../types';
import { generateSubjectRemark } from '../utils';
import { DAYCARE_SUBJECTS, DAYCARE_INDICATORS } from '../constants';
import EditableField from './EditableField';

interface ScoreEntryProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  onSave: () => void;
  department: Department;
  schoolClass: SchoolClass;
  subjectList: string[];
}

const ScoreEntry: React.FC<ScoreEntryProps> = ({ students, setStudents, settings, onSettingChange, onSave, department, schoolClass, subjectList }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjectList[0]);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);

  useEffect(() => {
    // If the selected subject is no longer in the list (e.g., deactivated), reset to first available
    if (!subjectList.includes(selectedSubject) && subjectList.length > 0) {
        setSelectedSubject(subjectList[0]);
    }
  }, [subjectList, selectedSubject]);

  const isSubjectSubmitted = settings.submittedSubjects?.includes(selectedSubject);
  const isScience = selectedSubject === 'Science';
  const isJHS = department === "Junior High School";
  const isBasic = department === "Lower Basic School" || department === "Upper Basic School";
  const isEarlyChildhood = department === "Daycare" || department === "Nursery" || department === "Kindergarten";

  const isMockExam = isJHS && schoolClass === 'Basic 9';
  const showManagementPanel = isJHS || isBasic; 

  const seriesLabel = isMockExam ? "Active Mock Series" : "Active Term";
  const seriesPrefix = isMockExam ? "Mock" : "Term";
  const updateButtonLabel = isMockExam ? "Open / Update Mock Entry" : "Open / Update Term Entry";
  const promptMessage = isMockExam 
    ? `Submit mock scores of mock ${settings.mockSeries} - Deadline: ${settings.mockDeadline}`
    : `Submit end of term scores of term ${settings.mockSeries} - Deadline: ${settings.mockDeadline}`;

  // Find facilitator from the new Staff List first, then fallback to old mapping
  const facilitatorObj = settings.staffList?.find(s => s.subjects?.includes(selectedSubject));
  const currentFacilitator = facilitatorObj ? facilitatorObj.name : (settings.facilitatorMapping?.[selectedSubject] || "TBA");
  
  // Check if current selected "subject" is actually an Indicator
  // It is an indicator if it is NOT in the Daycare Core Subjects list
  const isIndicator = isEarlyChildhood && !DAYCARE_SUBJECTS.includes(selectedSubject);

  const activeIndicatorsList = settings.activeIndicators || DAYCARE_INDICATORS;

  const handleScoreChange = (id: number, field: 'sectionA' | 'sectionB', value: string) => {
    let numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = 0;
    
    // Daycare Logic: Single Score Input (Treat as Section B max 100)
    if (isEarlyChildhood) {
        if (numValue > 100) numValue = 100;
        if (numValue < 0) numValue = 0;
        
        setStudents(prev => prev.map(student => {
            if (student.id !== id) return student;
            const newDetails = { sectionA: 0, sectionB: numValue, total: numValue };
            return {
                ...student,
                scores: { ...student.scores, [selectedSubject]: numValue },
                scoreDetails: { ...student.scoreDetails, [selectedSubject]: newDetails }
            };
        }));
        return;
    }

    // Standard Logic
    if (field === 'sectionA') {
        if (numValue > 40) numValue = 40;
        if (numValue < 0) numValue = 0;
    }
    if (field === 'sectionB') {
        const maxB = (isScience && isJHS) ? 100 : 60; 
        if (numValue > maxB) numValue = maxB;
        if (numValue < 0) numValue = 0;
    }
    
    setStudents(prevStudents => prevStudents.map(student => {
      if (student.id !== id) return student;

      const currentDetails = student.scoreDetails?.[selectedSubject] || { sectionA: 0, sectionB: 0, total: 0 };
      const newDetails = { ...currentDetails, [field]: numValue };
      const rawTotal = newDetails.sectionA + newDetails.sectionB;

      if (isScience && isJHS) {
          newDetails.total = Math.round(rawTotal / 1.4);
      } else {
          newDetails.total = Math.round(rawTotal);
      }

      return {
        ...student,
        scores: { ...student.scores, [selectedSubject]: newDetails.total },
        scoreDetails: { ...student.scoreDetails, [selectedSubject]: newDetails }
      };
    }));
  };

  const handleIndicatorChange = (id: number, rating: 'D' | 'A' | 'A+') => {
      setStudents(prev => prev.map(s => {
          if (s.id !== id) return s;
          return {
              ...s,
              skills: { ...(s.skills || {}), [selectedSubject]: rating }
          };
      }));
  };

  const handleSubjectRemarkChange = (id: number, remark: string) => {
    setStudents(prevStudents => prevStudents.map(student => {
        if (student.id !== id) return student;
        return {
            ...student,
            subjectRemarks: { ...student.subjectRemarks, [selectedSubject]: remark }
        };
    }));
  };

  const handleAssessmentChange = (id: number, field: keyof StudentData, value: any) => {
      setStudents(prevStudents => prevStudents.map(student => {
          if (student.id !== id) return student;
          return { ...student, [field]: value };
      }));
  };

  // Daycare Skill Update via Footer Checklist
  const handleSkillChange = (id: number, skill: string, rating: 'D' | 'A' | 'A+') => {
      setStudents(prev => prev.map(s => {
          if (s.id !== id) return s;
          return {
              ...s,
              skills: { ...(s.skills || {}), [skill]: rating }
          };
      }));
  };

  const handleNameChange = (id: number, newName: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const handleAddStudent = () => {
    const newId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;
    const newStudent: StudentData = {
      id: newId,
      name: "NEW PUPIL",
      scores: {},
      scoreDetails: {}
    };
    setStudents([...students, newStudent]);
  };

  const handleDeleteStudent = (id: number) => {
    if (window.confirm("Are you sure you want to delete this pupil?")) {
      setStudents(students.filter(s => s.id !== id));
      if (activeStudentId === id) setActiveStudentId(null);
    }
  };

  const handleUpdateMockInfo = () => {
      const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      onSettingChange('mockDeadline', tenDaysFromNow);
      alert(`Notification updated. Deadline set to ${tenDaysFromNow}`);
  };

  const handleSubmitSubjectScores = () => {
      if (!settings.submittedSubjects?.includes(selectedSubject)) {
          if(window.confirm(`Are you sure you want to finalize and submit scores for ${selectedSubject}?`)) {
             const newSubmitted = [...(settings.submittedSubjects || []), selectedSubject];
             onSettingChange('submittedSubjects', newSubmitted);
             onSave(); 
             alert(`Scores for ${selectedSubject} have been submitted.`);
          }
      } else {
          alert("This subject has already been submitted.");
      }
  };

  const activeStudent = students.find(s => s.id === activeStudentId);

  return (
    <div className="bg-white p-6 rounded shadow-md max-w-6xl mx-auto min-h-screen pb-96">
      {/* Top Header & Save */}
      <div className="mb-4 border-b pb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-900">Score Entry Dashboard {isEarlyChildhood && '(Early Childhood)'}</h2>
        <button 
           onClick={onSave}
           className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 px-6 py-2 rounded shadow font-bold flex items-center gap-2 h-10 border border-yellow-600 transition-colors"
        >
           Save All Changes
        </button>
      </div>

      {showManagementPanel && (
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-4 rounded-lg shadow-lg mb-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="bg-blue-950/50 p-3 rounded border border-blue-700">
                      <label className="block text-xs font-bold uppercase text-blue-300 mb-1">{seriesLabel}</label>
                      <div className="flex items-center gap-2">
                          <span className="text-xl font-bold">{seriesPrefix}</span>
                          <EditableField 
                            value={settings.mockSeries} 
                            onChange={(v) => onSettingChange('mockSeries', v)}
                            className="bg-white text-blue-900 w-16 text-center font-bold text-xl rounded p-1"
                          />
                      </div>
                  </div>

                  <div className="flex-1 w-full">
                      <label className="block text-xs font-bold uppercase text-blue-300 mb-1">Announcement</label>
                      <EditableField 
                          value={settings.mockAnnouncement || ""} 
                          onChange={(v) => onSettingChange('mockAnnouncement', v)}
                          multiline
                          rows={2}
                          placeholder="Enter instructions..."
                          className="w-full bg-blue-950/30 border border-blue-600 rounded p-2 text-sm text-white focus:bg-blue-950/50"
                      />
                  </div>

                  <div className="bg-blue-950/50 p-3 rounded border border-blue-700 min-w-[200px]">
                      <label className="block text-xs font-bold uppercase text-blue-300 mb-1">Closing Date</label>
                      <input 
                        type="date"
                        value={settings.mockDeadline || ""}
                        onChange={(e) => onSettingChange('mockDeadline', e.target.value)}
                        className="bg-white text-blue-900 font-bold p-1 rounded w-full mb-2"
                      />
                      <button 
                        onClick={handleUpdateMockInfo}
                        className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded transition-colors"
                      >
                        {updateButtonLabel}
                      </button>
                  </div>
              </div>
              <div className="mt-2 text-center">
                  <p className="text-sm font-bold bg-white/10 py-1 rounded">Prompt: {promptMessage}</p>
              </div>
          </div>
      )}

      {/* Subject Selector */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-50 p-4 rounded border border-gray-200">
        <div className="flex flex-col flex-1">
          <label className="text-xs font-bold uppercase text-gray-700 mb-1">Select Subject / Indicator</label>
          <div className="flex gap-2">
            <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="border p-2 rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1 text-lg font-semibold"
            >
                {isEarlyChildhood ? (
                    <>
                        <optgroup label="Core Learning Areas">
                            {subjectList.filter(s => DAYCARE_SUBJECTS.includes(s)).map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Developmental Indicators">
                            {subjectList.filter(s => !DAYCARE_SUBJECTS.includes(s)).map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </optgroup>
                    </>
                ) : (
                    subjectList.map(subject => {
                        const isSub = settings.submittedSubjects?.includes(subject);
                        return <option key={subject} value={subject}>{subject} {isSub ? '(Submitted)' : ''}</option>;
                    })
                )}
            </select>
            <button 
                onClick={handleSubmitSubjectScores}
                disabled={isSubjectSubmitted}
                className={`px-4 py-2 rounded shadow font-bold text-white flex items-center gap-2 ${isSubjectSubmitted ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {isSubjectSubmitted ? 'Submitted' : 'Finalize & Submit'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Facilitator: <strong>{currentFacilitator}</strong></p>
        </div>
        
        <button onClick={handleAddStudent} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-bold flex items-center gap-2 text-sm">
            Add New Pupil
        </button>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto shadow-inner rounded border border-gray-300">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left w-12">ID</th>
              <th className="border p-2 text-left">Pupil Name</th>
              
              {!isEarlyChildhood && <th className="border p-2 w-20 text-center bg-blue-50">Sec A</th>}
              
              <th className="border p-2 w-20 text-center bg-blue-50">
                  {isIndicator ? 'Rating' : (isEarlyChildhood ? 'Score' : 'Sec B')}
              </th>
              
              {!isEarlyChildhood && <th className="border p-2 w-16 text-center font-bold bg-gray-200">Tot</th>}
              {(isScience && isJHS) && <th className="border p-2 w-16 text-center font-bold bg-green-100">Norm</th>}
              
              {!isEarlyChildhood && <th className="border p-2 text-left bg-gray-50 text-xs w-48">Auto Remark</th>}
              
              <th className="border p-2 text-left w-48">Note</th>
              <th className="border p-2 w-20 text-center">Act</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const details = student.scoreDetails?.[selectedSubject];
              const existingTotal = student.scores[selectedSubject] || 0;
              
              const valA = details?.sectionA !== undefined ? details.sectionA : 0; 
              const valB = details?.sectionB !== undefined ? details.sectionB : existingTotal; 
              
              const displayTotal = details ? details.total : existingTotal;
              const rawTotal = valA + valB;

              return (
                <tr 
                    key={student.id} 
                    className={`hover:bg-blue-50 cursor-pointer ${activeStudentId === student.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''}`}
                    onClick={() => setActiveStudentId(student.id)}
                >
                  <td className="border p-2 text-center text-gray-500">{student.id}</td>
                  <td className="border p-2 font-bold"><EditableField value={student.name} onChange={(val) => handleNameChange(student.id, val)} className="w-full font-bold uppercase"/></td>
                  
                  {!isEarlyChildhood && (
                      <td className="border p-2 text-center bg-blue-50/50">
                        <input type="number" min="0" max="40" value={valA === 0 ? '' : valA} onChange={(e) => handleScoreChange(student.id, 'sectionA', e.target.value)} className="w-full text-center p-1 border rounded" onClick={(e) => e.stopPropagation()}/>
                      </td>
                  )}
                  
                  <td className="border p-2 text-center bg-blue-50/50">
                    {isIndicator ? (
                        <select 
                            value={student.skills?.[selectedSubject] || ''}
                            onChange={(e) => handleIndicatorChange(student.id, e.target.value as any)}
                            className="w-full p-1 border rounded font-bold text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="">-</option>
                            <option value="D">D</option>
                            <option value="A">A</option>
                            <option value="A+">A+</option>
                        </select>
                    ) : (
                        <input 
                            type="number" 
                            min="0" 
                            max={isEarlyChildhood ? 100 : 60} 
                            value={valB === 0 ? '' : valB} 
                            onChange={(e) => handleScoreChange(student.id, 'sectionB', e.target.value)} 
                            className="w-full text-center p-1 border rounded" 
                            onClick={(e) => e.stopPropagation()}
                            placeholder={isEarlyChildhood ? "0-100" : ""}
                        />
                    )}
                  </td>

                  {!isEarlyChildhood && <td className="border p-2 text-center font-bold bg-gray-100">{rawTotal}</td>}
                  {(isScience && isJHS) && <td className="border p-2 text-center font-bold bg-green-100">{displayTotal}</td>}
                  
                  {!isEarlyChildhood && <td className="border p-2 text-xs italic text-gray-500 bg-gray-50">{generateSubjectRemark(displayTotal)}</td>}
                  
                  <td className="border p-2">
                    <input type="text" value={student.subjectRemarks?.[selectedSubject] || ""} onChange={(e) => handleSubjectRemarkChange(student.id, e.target.value)} placeholder="..." className="w-full p-1 bg-transparent border-b outline-none text-xs" onClick={(e) => e.stopPropagation()}/>
                  </td>
                  <td className="border p-2 text-center">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id); }} className="text-red-600 font-bold text-xs bg-red-50 p-1 rounded">Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer for Assessment / Daycare Skills */}
      {activeStudent && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-blue-600 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-4 z-40 h-80 overflow-y-auto">
              <div className="max-w-6xl mx-auto flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                        <h3 className="font-bold text-lg text-blue-900">{activeStudent.name}</h3>
                        <p className="text-sm text-gray-500">Assessment & Details</p>
                    </div>
                    <button onClick={() => setActiveStudentId(null)} className="text-blue-600 font-bold border px-3 py-1 rounded">Close</button>
                  </div>

                  {isEarlyChildhood ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Daycare Details */}
                          <div className="space-y-3">
                             <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="text-xs font-bold uppercase text-gray-600">Age</label>
                                    <input type="text" value={activeStudent.age || ""} onChange={(e) => handleAssessmentChange(activeStudent.id, 'age', e.target.value)} className="w-full border p-1 rounded"/>
                                 </div>
                                 <div>
                                    <label className="text-xs font-bold uppercase text-gray-600">Promoted To</label>
                                    <input type="text" value={activeStudent.promotedTo || ""} onChange={(e) => handleAssessmentChange(activeStudent.id, 'promotedTo', e.target.value)} className="w-full border p-1 rounded"/>
                                 </div>
                             </div>
                             <div>
                                <label className="text-xs font-bold uppercase text-gray-600">Talent/Interest</label>
                                <input type="text" value={activeStudent.interest || ""} onChange={(e) => handleAssessmentChange(activeStudent.id, 'interest', e.target.value)} className="w-full border p-1 rounded"/>
                             </div>
                             <div>
                                <label className="text-xs font-bold uppercase text-gray-600">Conduct</label>
                                <input type="text" value={activeStudent.conduct || ""} onChange={(e) => handleAssessmentChange(activeStudent.id, 'conduct', e.target.value)} className="w-full border p-1 rounded"/>
                             </div>
                              <div>
                                <label className="text-xs font-bold uppercase text-gray-600">Overall Remark</label>
                                <textarea value={activeStudent.overallRemark || ""} onChange={(e) => handleAssessmentChange(activeStudent.id, 'overallRemark', e.target.value)} className="w-full border p-1 rounded h-16"/>
                             </div>
                          </div>

                          {/* Skills Checklist (Summary View) */}
                          <div>
                              <h4 className="font-bold text-sm text-blue-900 border-b mb-2">Social / Physical Development Checklist</h4>
                              <div className="h-48 overflow-y-auto border p-2 bg-gray-50 rounded">
                                  <table className="w-full text-xs">
                                      <thead>
                                          <tr className="text-gray-500 uppercase">
                                              <th className="text-left p-1">Skill</th>
                                              <th className="p-1 w-8 text-center" title="Developing">D</th>
                                              <th className="p-1 w-8 text-center" title="Achieved">A</th>
                                              <th className="p-1 w-8 text-center" title="Advanced">A+</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {activeIndicatorsList.map(skill => (
                                              <tr key={skill} className="border-b last:border-0 hover:bg-white">
                                                  <td className="p-1">{skill}</td>
                                                  {['D', 'A', 'A+'].map(rating => (
                                                      <td key={rating} className="p-1 text-center">
                                                          <input 
                                                            type="radio" 
                                                            name={`skill-${activeStudent.id}-${skill}`}
                                                            checked={activeStudent.skills?.[skill] === rating}
                                                            onChange={() => handleSkillChange(activeStudent.id, skill, rating as any)}
                                                            className="cursor-pointer"
                                                          />
                                                      </td>
                                                  ))}
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  ) : (
                      // Standard Footer
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Class Teacher's Remark</label>
                              <EditableField 
                                 value={activeStudent.overallRemark || ""}
                                 onChange={(val) => handleAssessmentChange(activeStudent.id, 'overallRemark', val)}
                                 multiline
                                 rows={3}
                                 className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Recommendation</label>
                              <EditableField 
                                 value={activeStudent.recommendation || ""}
                                 onChange={(val) => handleAssessmentChange(activeStudent.id, 'recommendation', val)}
                                 multiline
                                 rows={3}
                                 className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50"
                              />
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default ScoreEntry;
