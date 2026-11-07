// Tracks whether the mounted configuration form has unsaved edits, so that
// navigation that unmounts it (section/area switches) can ask first.
let unsaved = false;
export const setUnsavedChanges = (value: boolean) => {
  unsaved = value;
};
export const confirmDiscardUnsaved = () =>
  !unsaved ||
  window.confirm("Tens canvis sense desar. Si continues, es perdran.");
