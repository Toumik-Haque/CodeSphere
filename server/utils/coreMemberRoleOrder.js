const CORE_MEMBER_ROLE_ORDER = [
  'Faculty Coordinator',
  'Secretary',
  'Assistant Secretary',
  'Student Member',
];

const rolePriority = Object.fromEntries(
  CORE_MEMBER_ROLE_ORDER.map((role, index) => [role, index])
);

const sortCoreMembers = (members) => {
  return [...members].sort((a, b) => {
    const roleDifference =
      (rolePriority[a.role] ?? 999) -
      (rolePriority[b.role] ?? 999);

    if (roleDifference !== 0) return roleDifference;

    const orderDifference = (a.order ?? 0) - (b.order ?? 0);
    if (orderDifference !== 0) return orderDifference;

    return (a.name || '').localeCompare(b.name || '');
  });
};

module.exports = {
  CORE_MEMBER_ROLE_ORDER,
  sortCoreMembers,
};