
import { CORE_SUBJECTS, DEFAULT_GRADING_REMARKS } from './constants';
import { ClassStatistics, ProcessedStudent, ComputedSubject, StudentData, FacilitatorStats, StaffMember } from './types';

export const calculateMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

export const calculateStdDev = (values: number[], mean: number): number => {
  if (values.length === 0) return 0;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
};

// Daycare Grading Helper
export const getDaycareGrade = (score: number): { grade: string, remark: string } => {
    if (score >= 70) return { grade: 'G', remark: 'High Level of Proficiency' }; // GOLD
    if (score >= 40) return { grade: 'S', remark: 'Sufficient Level of Proficiency' }; // SILVER
    return { grade: 'B', remark: 'Approaching Proficiency' }; // BRONZE
};

// Backend Logic for Descriptive Remarks based on Score
export const generateSubjectRemark = (score: number): string => {
  if (score >= 90) return "Outstanding mastery of subject concepts.";
  if (score >= 80) return "Excellent performance, shows great potential.";
  if (score >= 70) return "Very Good. Consistent effort displayed.";
  if (score >= 60) return "Good. Capable of achieving higher grades.";
  if (score >= 55) return "Credit. Satisfactory understanding shown.";
  if (score >= 50) return "Pass. Needs more dedication to studies.";
  if (score >= 40) return "Weak Pass. Remedial support recommended.";
  return "Critical Failure. Immediate intervention required.";
};

export const getGradeFromZScore = (score: number, mean: number, stdDev: number, remarksMap: Record<string, string>): { grade: string, value: number, category: string } => {
  if (stdDev === 0) return { grade: 'C4', value: 4, category: remarksMap['C4'] || 'Credit' };

  const diff = score - mean;
  
  if (diff >= 1.645 * stdDev) return { grade: 'A1', value: 1, category: remarksMap['A1'] || 'Excellent' };
  if (diff >= 1.036 * stdDev) return { grade: 'B2', value: 2, category: remarksMap['B2'] || 'Very Good' };
  if (diff >= 0.524 * stdDev) return { grade: 'B3', value: 3, category: remarksMap['B3'] || 'Good' };
  if (diff >= 0) return { grade: 'C4', value: 4, category: remarksMap['C4'] || 'Credit' };
  if (diff >= -0.524 * stdDev) return { grade: 'C5', value: 5, category: remarksMap['C5'] || 'Credit' };
  if (diff >= -1.036 * stdDev) return { grade: 'C6', value: 6, category: remarksMap['C6'] || 'Credit' };
  if (diff >= -1.645 * stdDev) return { grade: 'D7', value: 7, category: remarksMap['D7'] || 'Pass' };
  if (diff >= -2.326 * stdDev) return { grade: 'E8', value: 8, category: remarksMap['E8'] || 'Pass' };
  return { grade: 'F9', value: 9, category: remarksMap['F9'] || 'Fail' };
};

export const calculateClassStatistics = (students: StudentData[], subjectList: string[], scienceBaseScore: number = 100): ClassStatistics => {
  const subjectMeans: Record<string, number> = {};
  const subjectStdDevs: Record<string, number> = {};

  subjectList.forEach(subject => {
    const scores = students.map(s => {
        // Robust statistical calculation: For Science, always attempt to derive from detailed breakdown (A+B)
        // to ensure Mean and StdDev adjust instantly when the global scienceBaseScore toggle is flipped.
        if (subject === 'Science' && s.scoreDetails?.['Science']) {
            const det = s.scoreDetails['Science'];
            const rawSum = det.sectionA + det.sectionB;
            if (scienceBaseScore === 140) {
                // Return normalized 100-point value for NRT statistics
                return Math.round((rawSum / 140) * 100);
            }
            return Math.round(rawSum);
        }
        // Fallback for other subjects or legacy entries
        return s.scores[subject] || 0;
    });
    
    const mean = calculateMean(scores);
    const stdDev = calculateStdDev(scores, mean);
    subjectMeans[subject] = mean;
    subjectStdDevs[subject] = stdDev;
  });

  return { subjectMeans, subjectStdDevs };
};

export const processStudentData = (
    stats: ClassStatistics, 
    students: StudentData[], 
    facilitatorMap: Record<string, string>,
    subjectList: string[],
    gradingRemarks: Record<string, string> = DEFAULT_GRADING_REMARKS,
    staffList: StaffMember[] = [],
    scienceBaseScore: number = 100
): ProcessedStudent[] => {
  const processed = students.map(student => {
    let studentTotalNormalizedScore = 0;
    const computedSubjects: ComputedSubject[] = [];

    subjectList.forEach(subject => {
      let score = student.scores[subject] || 0;
      
      // Dynamic Normalization for Science: Best 6 Aggregate must be consistent across all subjects.
      if (subject === 'Science' && student.scoreDetails?.['Science']) {
          const det = student.scoreDetails['Science'];
          const rawSum = det.sectionA + det.sectionB;
          if (scienceBaseScore === 140) {
              score = Math.round((rawSum / 140) * 100); 
          } else {
              score = Math.round(rawSum);
          }
      }

      studentTotalNormalizedScore += score;
      const mean = stats.subjectMeans[subject];
      const stdDev = stats.subjectStdDevs[subject];
      
      const { grade, value } = getGradeFromZScore(score, mean, stdDev, gradingRemarks);
      const remark = generateSubjectRemark(score); 
      
      const staff = staffList.find(s => s.subjects && s.subjects.includes(subject));
      const facilitatorName = staff ? staff.name : (facilitatorMap[subject] || 'TBA');

      computedSubjects.push({
        subject,
        score,
        grade,
        gradeValue: value,
        remark,
        facilitator: facilitatorName,
        zScore: stdDev === 0 ? 0 : (score - mean) / stdDev
      });
    });

    const cores = computedSubjects.filter(s => CORE_SUBJECTS.includes(s.subject));
    const electives = computedSubjects.filter(s => !CORE_SUBJECTS.includes(s.subject));

    const sortFn = (a: ComputedSubject, b: ComputedSubject) => {
      if (a.gradeValue !== b.gradeValue) return a.gradeValue - b.gradeValue;
      return b.score - a.score;
    };

    cores.sort(sortFn);
    electives.sort(sortFn);

    const best4Cores = cores.slice(0, 4);
    const best2Electives = electives.slice(0, 2);

    const bestSixAggregate = 
      best4Cores.reduce((sum, s) => sum + s.gradeValue, 0) +
      best2Electives.reduce((sum, s) => sum + s.gradeValue, 0);

    let category = "Average";
    if (bestSixAggregate <= 10) category = "Distinction";
    else if (bestSixAggregate <= 20) category = "Merit";
    else if (bestSixAggregate <= 36) category = "Pass";
    else category = "Fail";

    let combinedOverallRemark = "";
    let weaknessAnalysis = "";
    
    if (student.finalRemark && student.finalRemark.trim() !== "") {
        combinedOverallRemark = student.finalRemark;
        const weakSubjects = computedSubjects.filter(s => s.gradeValue >= 7);
        if (weakSubjects.length > 0) {
            const names = weakSubjects.map(s => s.subject).join(", ");
            weaknessAnalysis = `Needs urgent improvement in: ${names}.`;
        }
    } else {
        const weakSubjects = computedSubjects.filter(s => s.gradeValue >= 7);
        const sortedByScoreAsc = [...computedSubjects].sort((a, b) => a.score - b.score);
        
        if (weakSubjects.length > 0) {
          const names = weakSubjects.map(s => s.subject).join(", ");
          weaknessAnalysis = `Needs urgent improvement in: ${names}.`;
        } else {
          weaknessAnalysis = `Lowest performance in ${sortedByScoreAsc[0]?.subject || 'N/A'}.`;
        }

        const facilitatorRemarksList: string[] = [];
        if (student.subjectRemarks) {
            Object.entries(student.subjectRemarks).forEach(([sub, text]) => {
                if (text && text.trim() !== "") {
                    facilitatorRemarksList.push(`${sub}: ${text}`);
                }
            });
        }
        const facilitatorRemarksStr = facilitatorRemarksList.length > 0 ? ` [Facilitator Notes: ${facilitatorRemarksList.join("; ")}]` : "";
        const generatedPerformanceSummary = `Overall performance is ${category}. ${bestSixAggregate <= 15 ? "Keep up the excellent work!" : "More effort required to improve aggregate."}`;
        const classTeacherRemark = student.overallRemark || generatedPerformanceSummary;
        combinedOverallRemark = `${weaknessAnalysis}${facilitatorRemarksStr}\n\n${classTeacherRemark}`;
    }

    const recommendation = student.recommendation || "Encouraged to maintain focus on core subjects. Recommended to attend extra classes for weak areas identified above. Parents are advised to supervise evening studies.";

    return {
      id: student.id,
      name: student.name,
      subjects: computedSubjects,
      totalScore: studentTotalNormalizedScore,
      bestSixAggregate,
      bestCoreSubjects: best4Cores,
      bestElectiveSubjects: best2Electives,
      overallRemark: combinedOverallRemark,
      recommendation,
      weaknessAnalysis,
      category,
      rank: 0,
      attendance: student.attendance || "0",
      age: student.age,
      promotedTo: student.promotedTo,
      conduct: student.conduct,
      interest: student.interest,
      skills: student.skills
    };
  });

  processed.sort((a, b) => {
    if (a.bestSixAggregate !== b.bestSixAggregate) return a.bestSixAggregate - b.bestSixAggregate;
    return b.totalScore - a.totalScore;
  });

  processed.forEach((p, index) => {
    p.rank = index + 1;
  });

  return processed;
};

export const calculateFacilitatorStats = (processedStudents: ProcessedStudent[]): FacilitatorStats[] => {
  const statsMap: Record<string, FacilitatorStats> = {};

  processedStudents.forEach(student => {
    student.subjects.forEach(sub => {
      const key = `${sub.facilitator}||${sub.subject}`; 
      if (!statsMap[key]) {
        statsMap[key] = {
          facilitatorName: sub.facilitator,
          subject: sub.subject,
          studentCount: 0,
          gradeCounts: { 'A1': 0, 'B2': 0, 'B3': 0, 'C4': 0, 'C5': 0, 'C6': 0, 'D7': 0, 'E8': 0, 'F9': 0 },
          totalGradeValue: 0,
          performancePercentage: 0,
          averageGradeValue: 0,
          performanceGrade: ''
        };
      }
      
      const entry = statsMap[key];
      entry.studentCount++;
      entry.gradeCounts[sub.grade] = (entry.gradeCounts[sub.grade] || 0) + 1;
      entry.totalGradeValue += sub.gradeValue;
    });
  });

  return Object.values(statsMap).map(stat => {
    const avg = stat.studentCount > 0 ? stat.totalGradeValue / stat.studentCount : 0;
    const totalExpectedValue = stat.studentCount * 9;
    const percentage = totalExpectedValue > 0 
        ? (1 - (stat.totalGradeValue / totalExpectedValue)) * 100 
        : 0;

    let perfGrade = 'F9';
    if (percentage >= 80) perfGrade = 'A1';
    else if (percentage >= 70) perfGrade = 'B2';
    else if (percentage >= 60) perfGrade = 'B3';
    else if (percentage >= 50) perfGrade = 'C4';
    else if (percentage >= 45) perfGrade = 'C5';
    else if (percentage >= 40) perfGrade = 'C6';
    else if (percentage >= 35) perfGrade = 'D7';
    else if (percentage >= 30) perfGrade = 'E8';
    
    return {
      ...stat,
      averageGradeValue: avg,
      performancePercentage: parseFloat(percentage.toFixed(2)),
      performanceGrade: perfGrade
    };
  }).sort((a, b) => b.performancePercentage - a.performancePercentage); 
};
