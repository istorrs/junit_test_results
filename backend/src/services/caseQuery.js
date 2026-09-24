const CASE_SORT_FIELDS = Object.freeze({
    name: 'name',
    status: 'status',
    time: 'time',
    class_name: 'class_name'
});

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildCaseSearch = value => {
    const search = String(value || '').trim();
    if (!search) return null;
    const pattern = new RegExp(escapeRegex(search), 'i');
    return {
        $or: [{ name: pattern }, { full_name: pattern }, { class_name: pattern }]
    };
};

const getCaseSort = (sortBy = 'name', sortOrder = 'asc') => {
    const field = CASE_SORT_FIELDS[sortBy];
    if (!field) throw new Error('Invalid sort_by');
    if (!['asc', 'desc'].includes(sortOrder)) throw new Error('Invalid sort_order');
    return { field, direction: sortOrder === 'asc' ? 1 : -1 };
};

module.exports = { buildCaseSearch, getCaseSort };
