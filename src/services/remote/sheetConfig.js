// Public by nature: it ships in the bundle, so there is nothing here to keep secret.
// Setup steps and the spreadsheet it belongs to are in google-apps-script/README.md.
export const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycby-2qWPv9B6mpD38goeyYmQX4k9bkWBA_IsSEPupfhDLnq0NGJ5DYtukJDzJIagGiPPmw/exec';

export const isSheetConfigured = () => !SHEET_ENDPOINT.includes('PASTE_');
