
import React from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings } from '../types';
import EditableField from './EditableField';

interface MasterSheetProps {
  students: ProcessedStudent[];
  stats: ClassStatistics;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  subjectList: string[];
}

const MasterSheet: React.FC<MasterSheetProps> = ({ students, stats, settings, onSettingChange, subjectList }) => {
  const getGradeColor = (grade: string) => {
    if (grade === 'A1') return 'bg-green-100 text-green-800';
    if (grade === 'B2' || grade === 'B3') return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-50 text-yellow-800';
    if (grade === 'F9') return 'bg-red-100 text-red-800 font-bold';
    return 'text-gray-600';
  };

  const handleGradeRemarkChange = (grade: string, remark: string) => {
      onSettingChange('gradingSystemRemarks', {
          ...(settings.gradingSystemRemarks || {}),
          [grade]: remark
      });
  };

  const currentGradingRemarks = settings.gradingSystemRemarks || {};

  // Calculate Category Counts
  const categoryCounts = {
    "Distinction": students.filter(s => s.category === "Distinction").length,
    "Merit": students.filter(s => s.category === "Merit").length,
    "Pass": students.filter(s => s.category === "Pass").length,
    "Fail": students.filter(s => s.category === "Fail").length,
  };

  const grades = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];
  const cutoffs = [
      'Score ≥ Mean + 1.645σ', 'Score ≥ Mean + 1.036σ', 'Score ≥ Mean + 0.524σ',
      'Score ≥ Mean', 'Score ≥ Mean − 0.524σ', 'Score ≥ Mean − 1.036σ',
      'Score ≥ Mean − 1.645σ', 'Score ≥ Mean − 2.326σ', 'Score < Mean − 2.326σ'
  ];

  return (
    <div className="bg-white p-4 print:p-0 min-h-screen">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold uppercase">
          <EditableField value={settings.schoolName} onChange={(v) => onSettingChange('schoolName', v)} className="text-center w-full" />
        </h1>
        <div className="flex justify-center gap-4 text-xs font-semibold text-gray-600 mb-2">
            <div className="flex gap-1">
               <span>Tel:</span>
               <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} placeholder="000-000-0000" />
            </div>
            <span>|</span>
            <div className="flex gap-1">
               <span>Email:</span>
               <EditableField value={settings.schoolEmail} onChange={(v) => onSettingChange('schoolEmail', v)} placeholder="school@email.com" />
            </div>
          </div>
        <h2 className="text-xl font-semibold uppercase text-gray-700">
           <EditableField value={settings.examTitle} onChange={(v) => onSettingChange('examTitle', v)} className="text-center w-full" />
        </h2>
        <h3 className="text-lg">MASTER BROAD SHEET</h3>
      </div>

      <div className="overflow-x-auto mb-8">
        <table className="w-full text-xs border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 p-1 sticky left-0 bg-gray-200 z-10 w-10">Pos</th>
              <th className="border border-gray-400 p-1 sticky left-10 bg-gray-200 z-10 min-w-[150px] text-left">Name</th>
              {subjectList.map(sub => (
                <th key={sub} className="border border-gray-400 p-1 min-w-[60px]" colSpan={2}>
                  {sub.substring(0, 10)}...
                </th>
              ))}
              <th className="border border-gray-400 p-1 font-bold">Total Score</th>
              <th className="border border-gray-400 p-1 font-bold">Agg. (Best 6)</th>
              <th className="border border-gray-400 p-1">Category</th>
            </tr>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-1 sticky left-0 bg-gray-100 z-10"></th>
              <th className="border border-gray-400 p-1 sticky left-10 bg-gray-100 z-10"></th>
              {subjectList.map(sub => (
                <React.Fragment key={sub + '-sub'}>
                  <th className="border border-gray-400 p-1 text-[10px]">Scr</th>
                  <th className="border border-gray-400 p-1 text-[10px]">Grd</th>
                </React.Fragment>
              ))}
              <th className="border border-gray-400 p-1"></th>
              <th className="border border-gray-400 p-1"></th>
              <th className="border border-gray-400 p-1"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="border border-gray-400 p-1 text-center font-bold sticky left-0 bg-white">{student.rank}</td>
                <td className="border border-gray-400 p-1 whitespace-nowrap sticky left-10 bg-white">{student.name}</td>
                {subjectList.map(subjectName => {
                  const subData = student.subjects.find(s => s.subject === subjectName);
                  return (
                    <React.Fragment key={subjectName}>
                      <td className="border border-gray-400 p-1 text-center text-gray-500">{subData?.score || '-'}</td>
                      <td className={`border border-gray-400 p-1 text-center font-semibold ${getGradeColor(subData?.grade || '')}`}>
                        {subData?.grade || '-'}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="border border-gray-400 p-1 text-center font-bold bg-gray-100">{student.totalScore}</td>
                <td className="border border-gray-400 p-1 text-center font-bold bg-blue-50">{student.bestSixAggregate}</td>
                <td className="border border-gray-400 p-1 text-center text-[10px]">{student.category}</td>
              </tr>
            ))}

            {/* Averages Row */}
            <tr className="bg-orange-50 font-semibold border-t-2 border-black">
              <td colSpan={2} className="border border-gray-400 p-2 text-right sticky left-0 bg-orange-50">Class Average:</td>
              {subjectList.map(sub => (
                <td key={sub} colSpan={2} className="border border-gray-400 p-1 text-center">
                  {stats.subjectMeans[sub]?.toFixed(1)}
                </td>
              ))}
              <td colSpan={3} className="border border-gray-400 p-1"></td>
            </tr>
             {/* Std Dev Row */}
             <tr className="bg-orange-50 font-semibold">
              <td colSpan={2} className="border border-gray-400 p-2 text-right sticky left-0 bg-orange-50">Std Dev:</td>
              {subjectList.map(sub => (
                <td key={sub} colSpan={2} className="border border-gray-400 p-1 text-center text-xs text-gray-500">
                  {stats.subjectStdDevs[sub]?.toFixed(2)}
                </td>
              ))}
              <td colSpan={3} className="border border-gray-400 p-1"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 page-break-inside-avoid">
        {/* Category Summary */}
        <div>
           <h4 className="font-bold border-b-2 border-black mb-2 uppercase">Category Grouping Summary</h4>
           <table className="w-full text-sm border-collapse border border-gray-400">
             <thead className="bg-gray-100">
               <tr>
                 <th className="border border-gray-400 p-2 text-left">Category</th>
                 <th className="border border-gray-400 p-2 text-center">Aggregate Range</th>
                 <th className="border border-gray-400 p-2 text-center">No. of Pupils</th>
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td className="border border-gray-400 p-2 font-bold text-green-700">Distinction</td>
                 <td className="border border-gray-400 p-2 text-center">06 - 10</td>
                 <td className="border border-gray-400 p-2 text-center font-bold">{categoryCounts["Distinction"]}</td>
               </tr>
               <tr>
                 <td className="border border-gray-400 p-2 font-bold text-blue-700">Merit</td>
                 <td className="border border-gray-400 p-2 text-center">11 - 20</td>
                 <td className="border border-gray-400 p-2 text-center font-bold">{categoryCounts["Merit"]}</td>
               </tr>
               <tr>
                 <td className="border border-gray-400 p-2 font-bold text-yellow-700">Pass</td>
                 <td className="border border-gray-400 p-2 text-center">21 - 36</td>
                 <td className="border border-gray-400 p-2 text-center font-bold">{categoryCounts["Pass"]}</td>
               </tr>
               <tr>
                 <td className="border border-gray-400 p-2 font-bold text-red-700">Fail</td>
                 <td className="border border-gray-400 p-2 text-center">37 +</td>
                 <td className="border border-gray-400 p-2 text-center font-bold">{categoryCounts["Fail"]}</td>
               </tr>
             </tbody>
           </table>
        </div>

        {/* Grading System Key */}
        <div>
           <h4 className="font-bold border-b-2 border-black mb-2 uppercase">Grading System (NRT)</h4>
           <table className="w-full text-xs border-collapse border border-gray-400">
             <thead>
               <tr className="bg-gray-100">
                 <th className="border border-gray-400 p-1">Grade</th>
                 <th className="border border-gray-400 p-1">Remark (Editable)</th>
                 <th className="border border-gray-400 p-1">Statistical Cut-off (Mean based)</th>
               </tr>
             </thead>
             <tbody>
               {grades.map((grade, idx) => (
                   <tr key={grade}>
                       <td className="border border-gray-400 p-1 text-center font-bold">{grade}</td>
                       <td className="border border-gray-400 p-1">
                           <EditableField 
                             value={currentGradingRemarks[grade] || ''}
                             onChange={(v) => handleGradeRemarkChange(grade, v)}
                             className="w-full text-center"
                           />
                       </td>
                       <td className="border border-gray-400 p-1">{cutoffs[idx]}</td>
                   </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="mt-12 flex justify-between items-end no-break-inside">
        <div className="w-1/3">
           <p className="font-bold mb-2">Class Teacher Authorization:</p>
           <div className="border-b border-black w-3/4 h-8 mb-2"></div>
           <p className="text-sm">Signature & Date</p>
        </div>
        <div className="w-1/3 text-right">
          <p className="font-bold mb-2">Headteacher Authorization:</p>
          <div className="h-16 mb-2 flex justify-end items-end">
             <div className="border-b border-black w-3/4"></div>
          </div>
          <p className="font-bold uppercase">
            <EditableField value={settings.headTeacherName} onChange={(v) => onSettingChange('headTeacherName', v)} className="text-right font-bold uppercase w-full" />
          </p>
          <p className="text-sm">Signature & Stamp</p>
        </div>
      </div>
    </div>
  );
};

export default MasterSheet;
