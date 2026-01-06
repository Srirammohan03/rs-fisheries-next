export function diffObjects(
  oldData: Record<string, any> | null,
  newData: Record<string, any>
) {
  const oldValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  if (!oldData) {
    return { oldValues: null, newValues };
  }

  for (const key of Object.keys(newData)) {
    if (oldData[key] !== newData[key]) {
      oldValues[key] = oldData[key];
      newValues[key] = newData[key];
    }
  }
  return { oldValues, newValues };
}
