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
  onClassChange: (cls: SchoolClass) => void;
  classOptions: SchoolClass[];
  subjectList: string[];
}

const ScoreEntry: React.FC<ScoreEntryProps> = ({ students, setStudents, settings, onSettingChange, onSave, department, schoolClass, onClassChange, classOptions, subjectList }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjectList[0]);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);

  useEffect(() => {
    if (!subjectList.includes(selectedSubject) && subjectList.length > 0) {
        setSelectedSubject(subjectList[0]);
    }
  }, [subjectList, selectedSubject]);

  const isSubjectSubmitted = settings.submittedSubjects?.includes(selectedSubject);
  const isScience = selectedSubject === 'Science';
  const isJHS = department === "Junior High School";
  const isEarlyChildhood = department === "Daycare" || department === "Nursery" || department === "Kindergarten";

  const handleScoreChange = (id: number, field: 'sectionA' | 'sectionB', value: string) => {
    let numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = 0;
    
    if (isEarlyChildhood) {
        setStudents(prev => prev.map(student => {
            if (student.id !== id) return student;
            const score = Math.min(100, Math.max(0, numValue));
            return {
                ...student,
                scores: { ...student.scores, [selectedSubject]: score },
                scoreDetails: { ...student.scoreDetails, [selectedSubject]: { sectionA: 0, sectionB: score, total: score } }
            };
        }));
        return;
    }

    setStudents(prevStudents => prevStudents.map(student => {
      if (student.id !== id) return student;
      const currentDetails = student.scoreDetails?.[selectedSubject] || { sectionA: 0, sectionB: 0, total: 0 };
      const newDetails = { ...currentDetails, [field]: numValue };
      const rawSum = newDetails.sectionA + newDetails.sectionB;

      // CORE NRT LOGIC: Scale 140 base to 100 for global grading consistency
      if (isScience && isJHS && settings.scienceBaseScore === 140) {
          newDetails.total = Math.round((rawSum / 140) * 100);
      } else {
          newDetails.total = Math.round(rawSum);
      }

      return {
        ...student,
        scores: { ...student.scores, [selectedSubject]: newDetails.total },
        scoreDetails: { ...student.scoreDetails, [selectedSubject]: newDetails }
      };
    }));
  };

  const activeStudent = students.find(s => s.id === activeStudentId);

  return (
    <div className="bg-white p-6 rounded shadow-md max-w-6xl mx-auto min-h-screen pb-96">
      <div className="mb-4 border-b pb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-blue-900 uppercase">UNITED BAYLOR ACADEMY</h2>
            <div className="flex bg-blue-100 rounded p-1 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-900 px-2 flex items-center uppercase">Switch Class:</span>
                {classOptions.map(cls => (
                    <button key={cls} onClick={() => onClassChange(cls)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${schoolClass === cls ? 'bg-blue-600 text-white shadow' : 'text-blue-600 hover:bg-blue-200'}`}>{cls}</button>
                ))}
            </div>
        </div>
        <button onClick={onSave} className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 px-6 py-2 rounded shadow font-bold border border-yellow-600">Save All Changes</button>
      </div>

      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-4 rounded-lg shadow-lg mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-950/50 p-3 rounded border border-blue-700">
              <label className="block text-xs font-bold uppercase text-blue-300 mb-1">Marking Base (Science Only)</label>
              <div className="flex bg-white/10 rounded p-1">
                  <button onClick={() => onSettingChange('scienceBaseScore', 100)} className={`flex-1 text-[10px] font-bold py-1 rounded ${settings.scienceBaseScore === 100 ? 'bg-white text-blue-900' : 'text-blue-200'}`}>100 (Standard)</button>
                  <button onClick={() => onSettingChange('scienceBaseScore', 140)} className={`flex-1 text-[10px] font-bold py-1 rounded ${settings.scienceBaseScore === 140 ? 'bg-white text-blue-900' : 'text-blue-200'}`}>140 (Raw)</button>
              </div>
              <p className="text-[9px] text-blue-400 mt-2 italic font-medium">* 140 will be scaled to 100 for NRT grading automatically.</p>
          </div>
          <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-blue-300 mb-1">Dashboard Particulars (School Details)</label>
              <div className="flex gap-4">
                  <EditableField value={settings.schoolName} onChange={(v) => onSettingChange('schoolName', v)} className="flex-1 text-white border-blue-500 font-bold" />
                  <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} className="w-40 text-white border-blue-500 font-bold" />
              </div>
          </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-50 p-4 rounded border">
        <div className="flex flex-col flex-1">
          <label className="text-xs font-bold uppercase text-gray-700 mb-1">Select Subject</label>
          <div className="flex gap-2">
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="border p-2 rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1 text-lg font-semibold">
                {subjectList.map(subject => <option key={subject} value={subject}>{subject} {settings.submittedSubjects?.includes(subject) ? '(Submitted)' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto shadow-inner rounded border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left w-12">ID</th>
              <th className="border p-2 text-left">Pupil Name</th>
              {!isEarlyChildhood && <th className="border p-2 w-24 text-center bg-blue-50">Sec A (40)</th>}
              <th className="border p-2 w-24 text-center bg-blue-50">{isEarlyChildhood ? 'Score' : (isScience && settings.scienceBaseScore === 140 ? 'Sec B (100)' : 'Sec B (60)')}</th>
              {!isEarlyChildhood && <th className="border p-2 w-20 text-center font-bold bg-gray-200">Raw Tot</th>}
              {(isScience && settings.scienceBaseScore === 140) && <th className="border p-2 w-20 text-center font-bold bg-green-100 text-blue-700">Norm (100)</th>}
              <th className="border p-2 text-left w-48">Note</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const details = student.scoreDetails?.[selectedSubject];
              const valA = details?.sectionA || 0;
              const valB = details?.sectionB || (student.scores[selectedSubject] || 0);
              const displayTotal = details?.total || (student.scores[selectedSubject] || 0);
              const rawSum = valA + valB;
              
              return (
                <tr key={student.id} className={`hover:bg-blue-50 cursor-pointer ${activeStudentId === student.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''}`} onClick={() => setActiveStudentId(student.id)}>
                  <td className="border p-2 text-center text-gray-500">{student.id}</td>
                  <td className="border p-2 font-bold uppercase">{student.name}</td>
                  {!isEarlyChildhood && <td className="border p-2 text-center bg-blue-50/50"><input type="number" value={valA || ''} onChange={(e) => handleScoreChange(student.id, 'sectionA', e.target.value)} className="w-full text-center p-1 border rounded" onClick={e => e.stopPropagation()}/></td>}
                  <td className="border p-2 text-center bg-blue-50/50"><input type="number" value={valB || ''} onChange={(e) => handleScoreChange(student.id, 'sectionB', e.target.value)} className="w-full text-center p-1 border rounded" onClick={e => e.stopPropagation()}/></td>
                  {!isEarlyChildhood && <td className="border p-2 text-center font-bold bg-gray-100">{rawSum}</td>}
                  {(isScience && settings.scienceBaseScore === 140) && <td className="border p-2 text-center font-bold bg-green-100 text-blue-700">{displayTotal}</td>}
                  <td className="border p-2"><input type="text" value={student.subjectRemarks?.[selectedSubject] || ""} onChange={(e) => setStudents(prev => prev.map(s => s.id === student.id ? { ...s, subjectRemarks: { ...s.subjectRemarks, [selectedSubject]: e.target.value } } : s))} placeholder="..." className="w-full p-1 bg-transparent border-b outline-none text-xs" onClick={e => e.stopPropagation()}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeStudent && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-blue-600 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-4 z-40 h-80 overflow-y-auto">
              <div className="max-w-6xl mx-auto">
                  <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h3 className="font-black text-xl text-blue-900 uppercase">{activeStudent.name}</h3>
                    <button onClick={() => setActiveStudentId(null)} className="text-blue-600 font-bold border px-3 py-1 rounded">Close Panel</button>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                      <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Class Teacher's Remark (Global)</label><EditableField value={activeStudent.overallRemark || ""} onChange={(v) => setStudents(prev => prev.map(s => s.id === activeStudent.id ? { ...s, overallRemark: v } : s))} multiline rows={3} className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50" /></div>
                      <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Final Recommendation</label><EditableField value={activeStudent.recommendation || ""} onChange={(v) => setStudents(prev => prev.map(s => s.id === activeStudent.id ? { ...s, recommendation: v } : s))} multiline rows={3} className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50" /></div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ScoreEntry;