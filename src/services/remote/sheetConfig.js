// Public by nature: it ships in the bundle, so there is nothing here to keep secret.
// Setup steps and the spreadsheet it belongs to are in google-apps-script/README.md.
export const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxELH2hrgtW4CQ8JDlp36YzHpr2Pg4jlahIarF_0BKKrZ44e_M8vsxeDMc8Bky1K_mJZg/exec';

export const isSheetConfigured = () => !SHEET_ENDPOINT.includes('PASTE_');
