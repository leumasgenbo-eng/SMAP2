
import React, { useState } from 'react';
import { ProcessedStudent, GlobalSettings, SchoolClass, StudentData } from '../types';
import EditableField from './EditableField';
import { DAYCARE_SKILLS } from '../constants';
import { getDaycareGrade } from '../utils';

interface DaycareReportCardProps {
  student: ProcessedStudent;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: string) => void;
  onStudentUpdate: (id: number, field: keyof StudentData, value: any) => void;
  schoolClass: SchoolClass;
  totalStudents: number;
}

const DaycareReportCard: React.FC<DaycareReportCardProps> = ({ student, settings, onSettingChange, onStudentUpdate, schoolClass, totalStudents }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const activeIndicatorsList = settings.activeIndicators || DAYCARE_SKILLS;

  const handleSharePDF = async () => {
    setIsGenerating(true);
    const originalElement = document.getElementById(`daycare-report-${student.id}`);
    
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

    // Clone and replace inputs for reliable printing (Same logic as standard report)
    const clone = originalElement.cloneNode(true) as HTMLElement;

    const replaceInputsWithText = (tagName: string) => {
        const originals = originalElement.querySelectorAll(tagName);
        const clones = clone.querySelectorAll(tagName);
        originals.forEach((orig, index) => {
            if (!clones[index]) return;
            const el = clones[index] as HTMLElement;
            const originalInput = orig as HTMLInputElement | HTMLTextAreaElement;
            const div = document.createElement('div');
            div.style.whiteSpace = tagName === 'textarea' ? 'pre-wrap' : 'nowrap';
            div.textContent = originalInput.value;
            div.className = el.className;
            div.classList.remove('hover:bg-yellow-50', 'focus:bg-yellow-100', 'focus:border-blue-500', 'focus:outline-none', 'resize-none', 'overflow-hidden');
            const computed = window.getComputedStyle(originalInput);
            div.style.textAlign = computed.textAlign;
            div.style.fontWeight = computed.fontWeight;
            div.style.fontSize = computed.fontSize;
            div.style.fontFamily = computed.fontFamily;
            div.style.color = computed.color;
            div.style.width = '100%';
            div.style.display = 'block';
            div.style.background = 'transparent';
            div.style.borderBottom = computed.borderBottom;
            el.parentNode?.replaceChild(div, el);
        });
    };

    replaceInputsWithText('input');
    replaceInputsWithText('textarea');

    // Remove buttons from clone
    const buttons = clone.querySelectorAll('button');
    buttons.forEach(btn => btn.parentElement?.remove());
    
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.height = '296mm'; 
    clone.style.width = '210mm'; 

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
      filename: `${student.name.replace(/\s+/g, '_')}_Daycare_Report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowWidth: 794 },
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
                title: `${student.name} Report`,
                text: `Report Card for ${student.name}.`,
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
        console.error("PDF Error:", error);
        alert("Error generating PDF.");
    } finally {
        document.body.removeChild(container);
        setIsGenerating(false);
    }
  };

  return (
    <div 
        id={`daycare-report-${student.id}`}
        className="bg-white p-6 max-w-[210mm] mx-auto h-[296mm] border border-gray-200 shadow-sm print:shadow-none print:border-none page-break relative group flex flex-col box-border font-sans"
    >
       {/* Share Button */}
       <div 
         data-html2canvas-ignore="true" 
         className="absolute top-2 right-2 flex gap-2 no-print opacity-50 group-hover:opacity-100 transition-opacity z-10"
        >
          <button 
            onClick={handleSharePDF}
            disabled={isGenerating}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-2 font-bold text-xs"
          >
            {isGenerating ? 'Generating...' : 'Share PDF'}
          </button>
       </div>

       {/* Header */}
       <div className="text-center mb-4">
          <EditableField 
             value={settings.schoolName} 
             onChange={(v) => onSettingChange('schoolName', v)} 
             className="text-center font-black w-full bg-transparent text-3xl text-blue-900 tracking-widest uppercase leading-tight mb-2" 
             multiline
             rows={1}
          />
          <h2 className="text-lg font-bold text-red-700 uppercase">STANDARD BASED CURRICULUM, LEARNER’S PERFORMANCE REPORT</h2>
       </div>

       {/* Particulars (Grid Layout as requested) */}
       <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4 text-sm font-semibold border-b-2 border-gray-800 pb-4">
          <div className="flex items-end gap-2">
             <span>Name:</span>
             <span className="flex-1 border-b border-dotted border-gray-600 uppercase text-blue-900">{student.name}</span>
          </div>
          <div className="flex items-end gap-2">
             <span>Age:</span>
             <EditableField 
                value={student.age || ""} 
                onChange={(v) => onStudentUpdate(student.id, 'age', v)} 
                className="w-16 text-center border-b border-dotted border-gray-600" 
             />
          </div>
          <div className="flex items-end gap-2">
             <span>No. on Roll:</span>
             <span className="flex-1 border-b border-dotted border-gray-600">{totalStudents}</span>
          </div>
           <div className="flex items-end gap-2">
             <span>Term:</span>
             <EditableField value={settings.termInfo} onChange={(v) => onSettingChange('termInfo', v)} className="w-24 text-center border-b border-dotted border-gray-600" />
          </div>
          <div className="flex items-end gap-2">
             <span>Vacation Date:</span>
             <EditableField value={settings.endDate} onChange={(v) => onSettingChange('endDate', v)} className="flex-1 border-b border-dotted border-gray-600" />
          </div>
          <div className="flex items-end gap-2">
             <span>Next Term Begins:</span>
             <EditableField value={settings.nextTermBegin} onChange={(v) => onSettingChange('nextTermBegin', v)} className="flex-1 border-b border-dotted border-gray-600" />
          </div>
       </div>

       <h3 className="text-center font-bold uppercase mb-2 bg-blue-100 p-1 border border-blue-200">Skill Achievement(s) Remarks</h3>

       {/* Main Table */}
       <div className="flex-1 border border-gray-800 mb-4 flex flex-col">
           {/* Header Row */}
           <div className="flex bg-gray-200 font-bold text-xs uppercase border-b border-gray-800">
               <div className="flex-1 p-2 border-r border-gray-600">Learning Areas / Skills</div>
               <div className="w-10 p-2 text-center border-r border-gray-600 bg-white" title="Developing">D</div>
               <div className="w-10 p-2 text-center border-r border-gray-600 bg-gray-100" title="Achieved">A</div>
               <div className="w-10 p-2 text-center bg-gray-300" title="Advanced">A+</div>
           </div>

           {/* Subjects (Scores translated to Grades) */}
           {student.subjects.map(sub => {
               const { grade, remark } = getDaycareGrade(sub.score);
               return (
                   <div key={sub.subject} className="flex border-b border-gray-400 text-xs">
                       <div className="flex-1 p-2 border-r border-gray-600 font-bold uppercase">
                           {sub.subject}
                           <span className="block font-normal italic text-[10px] text-gray-500">{remark}</span>
                       </div>
                       {/* Subjects use the G/S/B grading */}
                        <div className="w-10 p-2 text-center border-r border-gray-600 flex justify-center items-center">
                            {grade === 'B' ? '✔' : ''}
                        </div>
                        <div className="w-10 p-2 text-center border-r border-gray-600 flex justify-center items-center">
                            {grade === 'S' ? '✔' : ''}
                        </div>
                        <div className="w-10 p-2 text-center flex justify-center items-center">
                            {grade === 'G' ? '✔' : ''}
                        </div>
                   </div>
               );
           })}

           {/* Divider */}
           <div className="bg-gray-100 p-1 font-bold text-xs border-b border-gray-400 text-center uppercase mt-2">
               Assessment on Social, Physical and Cultural Development
           </div>

           {/* Skills Checklist - Dynamic */}
           {activeIndicatorsList.map(skill => {
               const rating = student.skills?.[skill];
               return (
                    <div key={skill} className="flex border-b border-gray-400 text-xs last:border-0">
                       <div className="flex-1 p-1 pl-2 border-r border-gray-600 uppercase">{skill}</div>
                       <div className="w-10 p-1 text-center border-r border-gray-600 flex justify-center items-center font-bold">
                           {rating === 'D' ? '✔' : ''}
                       </div>
                       <div className="w-10 p-1 text-center border-r border-gray-600 flex justify-center items-center font-bold">
                           {rating === 'A' ? '✔' : ''}
                       </div>
                       <div className="w-10 p-1 text-center flex justify-center items-center font-bold">
                           {rating === 'A+' ? '✔' : ''}
                       </div>
                   </div>
               );
           })}
       </div>

       {/* Footer Section */}
       <div className="text-xs font-semibold space-y-3">
           <div className="flex items-center gap-2">
               <span>ATTENDANCE:</span>
               <div className="flex items-center border-b border-dotted border-gray-600 px-2">
                    <EditableField 
                        value={student.attendance || "0"} 
                        onChange={(v) => onStudentUpdate(student.id, 'attendance', v)}
                        className="w-8 text-center" 
                    />
                    <span> OUT OF </span>
                    <EditableField value={settings.attendanceTotal} onChange={(v) => onSettingChange('attendanceTotal', v)} className="w-8 text-center" />
               </div>
               <span className="ml-4">PROMOTED TO:</span>
               <EditableField 
                    value={student.promotedTo || ""} 
                    onChange={(v) => onStudentUpdate(student.id, 'promotedTo', v)}
                    className="flex-1 border-b border-dotted border-gray-600 uppercase" 
               />
           </div>

           <div className="flex items-center gap-2">
               <span>TALENT AND INTEREST:</span>
               <EditableField 
                    value={student.interest || ""} 
                    onChange={(v) => onStudentUpdate(student.id, 'interest', v)}
                    className="flex-1 border-b border-dotted border-gray-600" 
               />
           </div>

           <div className="flex items-center gap-2">
               <span>CONDUCT:</span>
               <EditableField 
                    value={student.conduct || ""} 
                    onChange={(v) => onStudentUpdate(student.id, 'conduct', v)}
                    className="flex-1 border-b border-dotted border-gray-600" 
               />
           </div>

           <div className="flex items-start gap-2">
               <span className="whitespace-nowrap">CLASS FACILITATOR’S OVERALL REMARK:</span>
               <EditableField 
                    value={student.overallRemark || ""} 
                    onChange={(v) => onStudentUpdate(student.id, 'finalRemark', v)}
                    multiline
                    className="flex-1 border-b border-dotted border-gray-600 leading-tight" 
               />
           </div>

           <div className="flex justify-between items-end mt-8 pt-4">
               <div className="w-5/12 text-center">
                   <div className="border-b border-black h-8"></div>
                   <p>SIGN (C/F)</p>
               </div>
               <div className="w-5/12 text-center">
                   <div className="border-b border-black h-8"></div>
                   <p>SIGN (H/T)</p>
               </div>
           </div>
       </div>

       {/* Grading Key Footer */}
       <div className="mt-4 border-t-2 border-gray-800 pt-2 flex justify-between text-[10px] uppercase font-bold text-gray-600">
           <div>Scoring Procedure</div>
           <div>70% to 100% G GOLD (High Proficiency)</div>
           <div>40% to 69% S SILVER (Sufficient Proficiency)</div>
           <div>01% to 39% B BRONZE (Approaching Proficiency)</div>
           <div>Absent O Absent</div>
       </div>

    </div>
  );
};

export default DaycareReportCard;
