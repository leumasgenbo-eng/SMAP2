
import React, { useState } from 'react';
import { ProcessedStudent, GlobalSettings, ClassStatistics, StudentData, Department, SchoolClass } from '../types';
import EditableField from './EditableField';

interface ReportCardProps {
  student: ProcessedStudent;
  stats: ClassStatistics;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: string) => void;
  classAverageAggregate: number;
  onStudentUpdate: (id: number, field: keyof StudentData, value: any) => void;
  department: Department;
  schoolClass: SchoolClass;
}

const ReportCard: React.FC<ReportCardProps> = ({ student, stats, settings, onSettingChange, classAverageAggregate, onStudentUpdate, department, schoolClass }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Sort subjects by score descending for the main table as requested ("Arrange in order the best performing subject")
  const sortedSubjects = [...student.subjects].sort((a, b) => b.score - a.score);

  const gradingRemarks = settings.gradingSystemRemarks || {};

  // Check for JHS (Basic 7-9). 
  // Specifically, "Mock" features (series column, BECE note) are only for Basic 9.
  const isJHS = department === 'Junior High School';
  const isMockExam = isJHS && schoolClass === 'Basic 9';

  const handleSharePDF = async () => {
    setIsGenerating(true);
    const originalElement = document.getElementById(`report-${student.id}`);
    
    if (!originalElement) {
      alert("Report element not found.");
      setIsGenerating(false);
      return;
    }

    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') {
        alert("PDF generator library not loaded. Please check your internet connection and refresh the page.");
        setIsGenerating(false);
        return;
    }

    // 1. Create a deep clone of the element to avoid interfering with the view or being affected by zoom
    const clone = originalElement.cloneNode(true) as HTMLElement;

    // 2. Replace Inputs and Textareas with styled divs
    const replaceInputsWithText = (tagName: string) => {
        const originals = originalElement.querySelectorAll(tagName);
        const clones = clone.querySelectorAll(tagName);
        
        originals.forEach((orig, index) => {
            if (!clones[index]) return;
            const el = clones[index] as HTMLElement;
            const originalInput = orig as HTMLInputElement | HTMLTextAreaElement;
            
            const div = document.createElement('div');
            // preserve white space for textareas, normal for inputs
            div.style.whiteSpace = tagName === 'textarea' ? 'pre-wrap' : 'nowrap';
            div.textContent = originalInput.value;
            div.className = el.className;
            
            // Remove form-specific and interactive classes that might interfere with print look
            div.classList.remove('hover:bg-yellow-50', 'focus:bg-yellow-100', 'focus:border-blue-500', 'focus:outline-none', 'resize-none', 'overflow-hidden');
            
            // Apply essential styles from computed style of original to ensure exact match
            const computed = window.getComputedStyle(originalInput);
            div.style.textAlign = computed.textAlign;
            div.style.fontWeight = computed.fontWeight;
            div.style.fontSize = computed.fontSize;
            div.style.fontFamily = computed.fontFamily;
            div.style.letterSpacing = computed.letterSpacing;
            div.style.lineHeight = computed.lineHeight;
            div.style.textTransform = computed.textTransform;
            div.style.color = computed.color;
            
            // Layout adjustments
            div.style.width = '100%';
            div.style.display = 'block'; // Ensure centering works for block elements
            div.style.background = 'transparent';
            div.style.borderBottom = computed.borderBottom; // Keep the underline if it exists
            
            el.parentNode?.replaceChild(div, el);
        });
    };

    replaceInputsWithText('input');
    replaceInputsWithText('textarea');

    // 3. Clean up the clone
    // Remove the share button container from the clone
    const buttons = clone.querySelectorAll('button');
    buttons.forEach(btn => btn.parentElement?.remove());
    
    // Ensure the clone has a white background and proper sizing
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.height = '296mm'; // Enforce A4 height
    clone.style.width = '210mm';  // Enforce A4 width

    // 4. Create a temporary container for the clone
    // This container sits outside the zoomed App div, ensuring 100% scale
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-10000px';
    container.style.left = '0';
    container.style.width = '210mm';
    container.style.zIndex = '-1';
    container.appendChild(clone);
    document.body.appendChild(container);

    const opt = {
      margin: 0,
      filename: `${student.name.replace(/\s+/g, '_')}_Report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, // High resolution
        useCORS: true, 
        scrollY: 0,
        windowWidth: 794, // Approx A4 width in px at 96dpi
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        // @ts-ignore
        const pdfWorker = window.html2pdf().set(opt).from(clone);
        const pdfBlob = await pdfWorker.output('blob');
        const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `${student.name} Report Card`,
                text: `Please find attached the report card for ${student.name}.`,
            });
        } else {
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = opt.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert("An error occurred while generating the PDF. Please try again.");
    } finally {
        document.body.removeChild(container);
        setIsGenerating(false);
    }
  };

  return (
    <div 
        id={`report-${student.id}`}
        className="bg-white p-4 max-w-[210mm] mx-auto h-[296mm] border border-gray-200 shadow-sm print:shadow-none print:border-none page-break relative group flex flex-col box-border"
    >
       {/* Share Buttons - Visible on hover/screen, hidden on print/pdf */}
       <div 
         data-html2canvas-ignore="true" 
         className="absolute top-2 right-2 flex gap-2 no-print opacity-50 group-hover:opacity-100 transition-opacity z-10"
        >
          <button 
            onClick={handleSharePDF}
            disabled={isGenerating}
            className={`${isGenerating ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-2 font-bold text-xs transition-colors`}
            title="Generate and Share PDF"
          >
            {isGenerating ? (
                <span>Generating...</span>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Share PDF
                </>
            )}
          </button>
       </div>

       {/* Header */}
       <div className="text-center border-b-4 border-double border-blue-900 pb-2 mb-2 pt-2">
          {/* School Name - Wrapped in div with explicit spacing to prevent overlap */}
          <div className="mb-[0.7cm]">
             <EditableField 
                value={settings.schoolName} 
                onChange={(v) => onSettingChange('schoolName', v)} 
                className="text-center font-black w-full bg-transparent text-4xl text-blue-900 tracking-widest uppercase leading-tight drop-shadow-md" 
                multiline
                rows={1}
            />
          </div>
          
          <div className="flex justify-center gap-4 text-[10px] font-semibold text-gray-800 mb-1">
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
          <h2 className="text-lg font-bold text-red-700 uppercase mt-0 leading-tight">
            <EditableField 
                value={settings.examTitle} 
                onChange={(v) => onSettingChange('examTitle', v)} 
                className="text-center w-full" 
                multiline
                rows={1}
            />
          </h2>
          <div className="flex justify-center gap-4 text-xs mt-0.5 font-semibold text-gray-700 items-center">
             <EditableField 
                value={settings.termInfo} 
                onChange={(v) => onSettingChange('termInfo', v)} 
                className="text-center w-24 bg-transparent"
             />
             <span>|</span>
             <span>Academic Year: {settings.academicYear}</span>
          </div>
       </div>

       {/* Particulars */}
       <div className="grid grid-cols-2 gap-4 mb-2 border border-gray-800 p-2 rounded bg-blue-50 text-xs">
          <div className="space-y-1">
            <div className="flex items-center">
               <span className="font-bold w-20">Name:</span>
               <span className="flex-1 border-b border-dotted border-gray-600 uppercase font-semibold">{student.name}</span>
            </div>
            <div className="flex items-center">
               <span className="font-bold w-20">ID No:</span>
               <EditableField 
                 value={student.id.toString().padStart(4, '0')} 
                 onChange={(v) => {
                     const num = parseInt(v);
                     if (!isNaN(num)) onStudentUpdate(student.id, 'id', num);
                 }}
                 className="flex-1 border-b border-dotted border-gray-600 font-mono w-full min-w-0"
               />
            </div>
            <div className="flex items-center">
               <span className="font-bold w-20">Attendance:</span>
               <div className="flex-1 flex gap-2">
                 <EditableField 
                    value={student.attendance || "0"} 
                    onChange={(v) => onStudentUpdate(student.id, 'attendance', v)}
                    className="w-8 text-center border-b border-gray-600" 
                 />
                 <span>/</span>
                 <EditableField value={settings.attendanceTotal} onChange={(v) => onSettingChange('attendanceTotal', v)} className="w-8 text-center" />
               </div>
            </div>
             <div className="flex items-center">
               <span className="font-bold w-20">Class:</span>
               <span className="flex-1 font-bold">{schoolClass}</span>
            </div>
          </div>
          <div className="space-y-1">
             <div className="flex items-center">
               <span className="font-bold w-24">Start Date:</span>
               <EditableField value={settings.startDate} onChange={(v) => onSettingChange('startDate', v)} className="flex-1 border-b border-dotted border-gray-600 w-full min-w-0" />
            </div>
            <div className="flex items-center">
               <span className="font-bold w-24">End Date:</span>
               <EditableField value={settings.endDate} onChange={(v) => onSettingChange('endDate', v)} className="flex-1 border-b border-dotted border-gray-600 w-full min-w-0" />
            </div>
            <div className="flex items-center">
               <span className="font-bold w-24">Agg. (Best 6):</span>
               <span className="flex-1 font-bold text-base text-red-800">{student.bestSixAggregate}</span>
            </div>
            <div className="flex items-center">
               <span className="font-bold w-24">Category:</span>
               <span className={`font-bold px-2 py-0 rounded text-white text-[10px] ${student.category === 'Distinction' ? 'bg-green-600' : student.category === 'Merit' ? 'bg-blue-600' : student.category === 'Pass' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                 {student.category}
               </span>
            </div>
          </div>
       </div>

       {/* Note to Parents - Only for JHS / Mock context (Specifically Basic 9) */}
       {isMockExam && (
           <div className="mb-2 text-[10px] italic text-gray-600 bg-yellow-50 p-1 border border-yellow-200 leading-tight">
             <strong>Note:</strong> This mock is part of the preparation series for the BECE 2025/2026. Comments are based on the BECE 2024/2025 exam report standards.
           </div>
       )}

       {/* Main Table */}
       <table className="w-full text-xs border-collapse border border-gray-800 mb-2">
          <thead>
            <tr className="bg-gray-200 text-gray-800 uppercase text-[10px]">
               <th className="border border-gray-600 p-1 text-left">Subject</th>
               {isMockExam && <th className="border border-gray-600 p-1 w-12 text-center">Ser.</th>}
               <th className="border border-gray-600 p-1 w-12 text-center">Score</th>
               <th className="border border-gray-600 p-1 w-12 text-center bg-gray-100">Avg</th>
               <th className="border border-gray-600 p-1 w-14 text-center">Grd</th>
               <th className="border border-gray-600 p-1 text-left">Remark</th>
               <th className="border border-gray-600 p-1 w-24 text-left">Facilitator</th>
            </tr>
          </thead>
          <tbody>
             {sortedSubjects.map(sub => (
               <tr key={sub.subject} className="even:bg-gray-50 text-[11px]">
                 <td className="border border-gray-600 p-1 font-medium">{sub.subject}</td>
                 {isMockExam && <td className="border border-gray-600 p-1 text-center">{settings.mockSeries}</td>}
                 <td className="border border-gray-600 p-1 text-center font-bold">{sub.score}</td>
                 <td className="border border-gray-600 p-1 text-center text-gray-500 bg-gray-50">
                    {stats.subjectMeans[sub.subject] ? stats.subjectMeans[sub.subject].toFixed(0) : '-'}
                 </td>
                 <td className={`border border-gray-600 p-1 text-center font-bold ${sub.grade === 'A1' ? 'text-green-700' : sub.grade === 'F9' ? 'text-red-700' : ''}`}>{sub.grade}</td>
                 <td className="border border-gray-600 p-1 italic text-[10px]">{sub.remark}</td>
                 <td className="border border-gray-600 p-1 text-[9px] uppercase text-gray-600 truncate max-w-[80px]">{sub.facilitator}</td>
               </tr>
             ))}
          </tbody>
       </table>

       {/* Summary Section */}
       <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <h3 className="font-bold border-b border-gray-600 mb-1 uppercase text-xs">Best Core Subjects</h3>
            <ul className="text-[10px] list-disc pl-4">
              {student.bestCoreSubjects.map(s => (
                <li key={s.subject}>
                  <span className="font-semibold">{s.subject}</span>: {s.score} ({s.grade})
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold border-b border-gray-600 mb-1 uppercase text-xs">Best Elective Subjects</h3>
            <ul className="text-[10px] list-disc pl-4">
              {student.bestElectiveSubjects.map(s => (
                <li key={s.subject}>
                  <span className="font-semibold">{s.subject}</span>: {s.score} ({s.grade})
                </li>
              ))}
            </ul>
          </div>
       </div>
        {/* Grading Key Footer */}
       <div className="mb-2 p-1 border border-gray-300 rounded text-[9px] bg-gray-50 flex gap-2 flex-wrap justify-center">
            {Object.entries(gradingRemarks).map(([g, r]) => (
                <span key={g}><span className="font-bold">{g}</span>={r}</span>
            ))}
       </div>

       {/* Remarks */}
       <div className="mb-2 space-y-2 flex-1">
         <div className="bg-gray-50 p-2 border border-gray-300 rounded">
            <h3 className="font-bold text-xs uppercase mb-1">General Remarks & Weakness Analysis:</h3>
            <EditableField 
                value={student.overallRemark} 
                onChange={(v) => onStudentUpdate(student.id, 'finalRemark', v)} 
                multiline 
                className="w-full text-xs text-gray-800 leading-tight"
            />
         </div>
         <div className="bg-gray-50 p-2 border border-gray-300 rounded">
            <h3 className="font-bold text-xs uppercase mb-1">Recommendation & Future Plan:</h3>
            <EditableField 
                value={student.recommendation} 
                onChange={(v) => onStudentUpdate(student.id, 'recommendation', v)} 
                multiline 
                className="w-full text-xs text-gray-800 leading-tight"
            />
         </div>
       </div>

       {/* Signatures */}
       <div className="mt-auto pt-4 flex justify-between items-end no-break-inside pb-2">
         <div className="w-1/3 text-center">
            <div className="border-b border-black mb-1 h-10"></div>
            <p className="font-bold text-[10px] uppercase">Class Teacher</p>
         </div>
         <div className="w-1/3 text-center">
            <div className="border-b border-black mb-1 h-10 flex items-end justify-center pb-0">
               <EditableField value={settings.headTeacherName} onChange={(v) => onSettingChange('headTeacherName', v)} className="text-center font-bold uppercase w-full text-xs" />
            </div>
            <p className="font-bold text-[10px] uppercase">Headteacher's Signature & Stamp</p>
         </div>
       </div>

    </div>
  );
};

export default ReportCard;
