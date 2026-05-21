/**
 * Profile Completion Calculator
 * Calculates completion percentage based on 8 weighted sections
 */

interface ProfileData {
  // Basic Info (15%)
  fullName?: string;
  email?: string;
  phone?: string;

  // Personal Info (12%)
  dateOfBirth?: string | Date;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;

  // Address (12%)
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  // Emergency Contact (12%)
  emergencyName?: string;
  emergencyPhone?: string;

  // Education (12%)
  highestEducation?: string;
  institution?: string;

  // Professional (12%)
  skills?: string[];
  certifications?: string[];
  experience?: string;

  // Avatar (15%)
  avatar?: string;

  // Work Info (10%)
  department?: string;
  position?: string;
}

const SECTION_WEIGHTS = {
  basic: 0.15,
  personal: 0.12,
  address: 0.12,
  emergency: 0.12,
  education: 0.12,
  professional: 0.12,
  avatar: 0.15,
  work: 0.1,
};

const calculateSectionCompletion = (section: string, data: ProfileData): number => {
  switch (section) {
    case "basic":
      const basicFields = [data.fullName, data.email, data.phone];
      return basicFields.filter(Boolean).length / 3;

    case "personal":
      const personalFields = [
        data.dateOfBirth,
        data.gender,
        data.nationality,
        data.maritalStatus,
      ];
      return personalFields.filter(Boolean).length / 4;

    case "address":
      const addressFields = [
        data.addressLine1,
        data.city,
        data.state,
        data.postalCode,
        data.country,
      ];
      return addressFields.filter(Boolean).length / 5;

    case "emergency":
      const emergencyFields = [data.emergencyName, data.emergencyPhone];
      return emergencyFields.filter(Boolean).length / 2;

    case "education":
      const educationFields = [
        data.highestEducation,
        data.institution,
      ];
      return educationFields.filter(Boolean).length / 2;

    case "professional":
      const hasSkills = (data.skills?.length ?? 0) > 0;
      const hasCerts = (data.certifications?.length ?? 0) > 0;
      const hasExp = !!data.experience;
      return [hasSkills, hasCerts, hasExp].filter(Boolean).length / 3;

    case "avatar":
      return data.avatar ? 1 : 0;

    case "work":
      const workFields = [data.department, data.position];
      return workFields.filter(Boolean).length / 2;

    default:
      return 0;
  }
};

export const calculateProfileCompletion = (data: ProfileData): number => {
  const sections = Object.keys(SECTION_WEIGHTS) as Array<keyof typeof SECTION_WEIGHTS>;
  let totalCompletion = 0;

  sections.forEach((section) => {
    const sectionCompletion = calculateSectionCompletion(section, data);
    const weight = SECTION_WEIGHTS[section];
    totalCompletion += sectionCompletion * weight;
  });

  return Math.round(totalCompletion * 100);
};

export const getCompletionSections = (data: ProfileData) => {
  const sections = Object.keys(SECTION_WEIGHTS) as Array<keyof typeof SECTION_WEIGHTS>;
  return sections.map((section) => ({
    name: section.charAt(0).toUpperCase() + section.slice(1),
    completion: calculateSectionCompletion(section, data) * 100,
    weight: SECTION_WEIGHTS[section] * 100,
  }));
};
