/**
 * SessionStorage helper functions for state persistence
 */

const KEYS = {
    START_DATA: 'popchoice_startData',
    FORM_DATA: 'popchoice_formData',
    RECOMMENDATION: 'popchoice_recommendation'
};

export function getStartData() {
    const data = sessionStorage.getItem(KEYS.START_DATA);
    return data ? JSON.parse(data) : null;
}

export function setStartData(data) {
    sessionStorage.setItem(KEYS.START_DATA, JSON.stringify(data));
}

export function getFormData() {
    const data = sessionStorage.getItem(KEYS.FORM_DATA);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    // Convert array of objects back to array of Maps
    return parsed.map(entry => {
        if (entry instanceof Object && !Array.isArray(entry)) {
            return new Map(Object.entries(entry));
        }
        return entry;
    });
}

export function setFormData(data) {
    // Convert Maps to plain objects for JSON serialization
    const serializable = data.map(entry => {
        if (entry instanceof Map) {
            return Object.fromEntries(entry);
        }
        return entry;
    });
    sessionStorage.setItem(KEYS.FORM_DATA, JSON.stringify(serializable));
}

export function addFormDataEntry(entry) {
    const current = getFormData();
    current.push(entry);
    setFormData(current);
}

export function getRecommendation() {
    const data = sessionStorage.getItem(KEYS.RECOMMENDATION);
    return data ? JSON.parse(data) : null;
}

export function setRecommendation(data) {
    sessionStorage.setItem(KEYS.RECOMMENDATION, JSON.stringify(data));
}

export function clearAll() {
    sessionStorage.removeItem(KEYS.START_DATA);
    sessionStorage.removeItem(KEYS.FORM_DATA);
    sessionStorage.removeItem(KEYS.RECOMMENDATION);
}
