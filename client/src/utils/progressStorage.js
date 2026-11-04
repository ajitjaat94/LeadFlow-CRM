export const getProgressStorageKey = (name) => {
  let identity = "current-user";
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    identity = user._id || user.id || user.email || identity;
  } catch {
    // Keep progress usable if an older browser session has malformed user data.
  }
  return `leadflow:${identity}:${name}`;
};
