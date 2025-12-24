
import React, { useState } from 'react';
import { GlobalSettings, FacilitatorStats } from '../types';
import { SUBJECT_LIST } from '../constants';
import EditableField from './EditableField';

interface FacilitatorDashboardProps {
  stats: FacilitatorStats[];
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  onSave: () => void;
}

const FacilitatorDashboard: React.FC<FacilitatorDashboardProps> = ({ stats, settings, onSettingChange, onSave }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const currentMapping = settings.facilitatorMapping || {};

  const handleNameChange = (subject: string, newName: string) => {
    onSettingChange('facilitatorMapping', {
      ...currentMapping,
      [subject]: newName
    });
  };

  const getPerformanceColor = (grade: string) => {
      if (['A1', 'B2'].includes(grade)) return 'text-green-600';
      if (['B3', 'C4', 'C5', 'C6'].includes(grade)) return 'text-blue-600';
      return 'text-red-600';
  };

  const handleSharePDF = async () => {
    setIsGenerating(true);
    const originalElement = document.getElementById('facilitator-dashboard-print-area');
    
    if (!originalElement) {
      alert("Dashboard element not found.");
      setIsGenerating(false);
      return;
    }

    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') {
        alert("PDF generator library not loaded. Please check your internet connection and refresh the page.");
        setIsGenerating(false);
        return;
    }

    // 1. Clone
    const clone = originalElement.cloneNode(true) as HTMLElement;

    // 2. Replace Inputs
    const replaceInputsWithText = (tagName: string) => {
        const originals = originalElement.querySelectorAll(tagName);
        const clones = clone.querySelectorAll(tagName);
        
        originals.forEach((orig, index) => {
            if (!clones[index]) return;
            const el = clones[index] as HTMLElement;
            const originalInput = orig as HTMLInputElement | HTMLTextAreaElement;
            
            const div = document.createElement('div');
            div.textContent = originalInput.value;
            div.className = el.className;
            
            // Remove interactive classes
            div.classList.remove('hover:bg-yellow-50', 'focus:bg-yellow-100', 'focus:border-blue-500', 'focus:outline-none');
            
            // Copy styles
            const computed = window.getComputedStyle(originalInput);
            div.style.textAlign = computed.textAlign;
            div.style.fontWeight = computed.fontWeight;
            div.style.fontSize = computed.fontSize;
            div.style.color = computed.color;
            div.style.width = '100%';
            div.style.display = 'block';
            div.style.background = 'transparent';
            
            el.parentNode?.replaceChild(div, el);
        });
    };

    replaceInputsWithText('input');

    // 3. Prep Clone
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.padding = '20px';
    clone.style.background = 'white';
    clone.style.width = '210mm'; // Force A4 width

    // 4. Container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-10000px';
    container.style.left = '0';
    container.style.width = '210mm';
    container.appendChild(clone);
    document.body.appendChild(container);

    const opt = {
      margin: 10,
      filename: `Facilitator_Performance_Analysis.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 794 },
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
                title: 'Facilitator Performance Analysis',
                text: 'Attached is the performance analysis report.',
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
    <div className="bg-white p-6 rounded shadow-md max-w-6xl mx-auto min-h-screen">
      <div className="mb-6 border-b pb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-900">Facilitator Dashboard</h2>
        <div className="flex gap-4">
            <button 
                onClick={handleSharePDF}
                disabled={isGenerating}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow font-bold flex items-center gap-2"
            >
                {isGenerating ? 'Generating...' : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        Share Analysis PDF
                    </>
                )}
            </button>
            <button 
            onClick={onSave}
            className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 px-6 py-2 rounded shadow font-bold flex items-center gap-2"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Save Changes
            </button>
        </div>
      </div>

      <div id="facilitator-dashboard-print-area">
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
             <h1 className="text-2xl font-black uppercase text-blue-900">
                <EditableField 
                    value={settings.schoolName} 
                    onChange={(v) => onSettingChange('schoolName', v)} 
                    className="text-center w-full"
                    placeholder="SCHOOL NAME"
                />
             </h1>
             <h2 className="text-xl font-bold uppercase text-red-700">Facilitator Performance Analysis Report</h2>
             <div className="text-sm font-semibold flex justify-center items-center gap-2 mt-2">
                <span>{settings.examTitle}</span>
                <span>-</span>
                <EditableField 
                    value={settings.termInfo} 
                    onChange={(v) => onSettingChange('termInfo', v)} 
                    className="text-center w-32 border-b border-gray-400"
                    placeholder="TERM INFO"
                />
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            
            {/* Facilitator Management */}
            <div className="bg-gray-50 p-4 rounded border">
            <h3 className="text-lg font-bold mb-4 uppercase text-gray-700 border-b pb-2">Facilitator List</h3>
            <div className="space-y-2">
                {SUBJECT_LIST.map(subject => (
                <div key={subject} className="flex items-center gap-4 bg-white p-2 rounded shadow-sm">
                    <span className="w-1/3 text-sm font-semibold text-gray-800">{subject}</span>
                    <EditableField 
                    value={currentMapping[subject] || 'TBA'}
                    onChange={(val) => handleNameChange(subject, val)}
                    className="flex-1 font-bold text-blue-900 border-b border-gray-300"
                    placeholder="Enter Name"
                    />
                </div>
                ))}
            </div>
            </div>

            {/* Performance Overview (Summary) */}
            <div className="bg-blue-50 p-4 rounded border border-blue-100 h-fit">
            <h3 className="text-lg font-bold mb-4 uppercase text-blue-900 border-b border-blue-200 pb-2">Performance Grading Key</h3>
            <div className="text-sm space-y-2">
                <p>Facilitator performance is graded using the formula:</p>
                <p className="font-mono text-xs bg-white p-1 rounded border border-blue-200">
                    [1 - (Total Grade Value / (Total Pupils * 9))] * 100
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 text-xs mt-2">
                    <li><strong>A1 (Excellent):</strong> 80% - 100%</li>
                    <li><strong>B2 (Very Good):</strong> 70% - 79%</li>
                    <li><strong>B3 (Good):</strong> 60% - 69%</li>
                    <li><strong>C4 - C6 (Credit):</strong> 40% - 59%</li>
                    <li><strong>D7 - E8 (Pass):</strong> 30% - 39%</li>
                    <li><strong>F9 (Fail):</strong> Below 30%</li>
                </ul>
                <p className="mt-4 italic text-xs text-blue-800">Higher percentage indicates better performance (More A1s/B2s).</p>
            </div>
            </div>
        </div>

        {/* Detailed Analysis Table */}
        <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 uppercase text-gray-800">Performance Data Table</h3>
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                <tr className="bg-gray-800 text-white">
                    <th className="p-3 text-left">Facilitator</th>
                    <th className="p-3 text-left">Subject</th>
                    <th className="p-3 text-center w-10 bg-green-900 text-xs">A1</th>
                    <th className="p-3 text-center w-10 text-xs">B2</th>
                    <th className="p-3 text-center w-10 text-xs">B3</th>
                    <th className="p-3 text-center w-10 text-xs">C4</th>
                    <th className="p-3 text-center w-10 text-xs">C5</th>
                    <th className="p-3 text-center w-10 text-xs">C6</th>
                    <th className="p-3 text-center w-10 text-xs">D7</th>
                    <th className="p-3 text-center w-10 text-xs">E8</th>
                    <th className="p-3 text-center w-10 bg-red-900 text-xs">F9</th>
                    <th className="p-3 text-center font-bold text-xs">Pupils</th>
                    <th className="p-3 text-center font-bold bg-gray-700 text-xs">Val</th>
                    <th className="p-3 text-center font-bold bg-blue-900">Grade</th>
                </tr>
                </thead>
                <tbody>
                {stats.map((stat, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-800">{stat.facilitatorName}</td>
                    <td className="p-3 text-gray-600">{stat.subject}</td>
                    <td className="p-3 text-center bg-green-50 font-bold">{stat.gradeCounts['A1'] || 0}</td>
                    <td className="p-3 text-center">{stat.gradeCounts['B2'] || 0}</td>
                    <td className="p-3 text-center">{stat.gradeCounts['B3'] || 0}</td>
                    <td className="p-3 text-center">{stat.gradeCounts['C4'] || 0}</td>
                    <td className="p-3 text-center">{stat.gradeCounts['C5'] || 0}</td>
                    <td className="p-3 text-center">{stat.gradeCounts['C6'] || 0}</td>
                    <td className="p-3 text-center">{stat.gradeCounts['D7'] || 0}</td>
                    <td className="p-3 text-center">{stat.gradeCounts['E8'] || 0}</td>
                    <td className="p-3 text-center bg-red-50 text-red-600 font-bold">{stat.gradeCounts['F9'] || 0}</td>
                    <td className="p-3 text-center font-bold">{stat.studentCount}</td>
                    <td className="p-3 text-center text-gray-500 text-xs">{stat.totalGradeValue}</td>
                    <td className={`p-3 text-center font-bold text-lg ${getPerformanceColor(stat.performanceGrade)}`}>
                        {stat.performanceGrade}
                        <span className="block text-[10px] text-gray-400 font-normal">{stat.performancePercentage}%</span>
                    </td>
                    </tr>
                ))}
                {stats.length === 0 && (
                    <tr>
                        <td colSpan={14} className="p-8 text-center text-gray-500">No data available for analysis.</td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FacilitatorDashboard;
