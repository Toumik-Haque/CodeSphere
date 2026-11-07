export function calculateProfileCompletion(profile) {
  const checks = [
    Boolean(profile.name),
    Boolean(profile.phone),
    Boolean(profile.city),
    Boolean(profile.bio),
    Boolean(profile.collegeName),
    Boolean(profile.department),
    Boolean(profile.yearOfStudy),
    Array.isArray(profile.skills) && profile.skills.length > 0,
    Array.isArray(profile.codingProfiles) && profile.codingProfiles.length > 0,
    Array.isArray(profile.projects) && profile.projects.length > 0,
    Array.isArray(profile.achievements) && profile.achievements.length > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
