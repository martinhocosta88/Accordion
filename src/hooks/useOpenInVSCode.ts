import { useCallback, useState } from 'react';

export function useOpenInVSCode(folderPath: string) {
  const [pickerWorkspaces, setPickerWorkspaces] = useState<string[] | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const launch = useCallback(async (target: string) => {
    const result = await window.electronAPI.shell.openInVSCode(target);
    if (!result.ok) {
      setOpenError(result.error || 'Failed to open VS Code');
    }
  }, []);

  const openInVSCode = useCallback(async () => {
    const workspaces = await window.electronAPI.shell.listVSCodeWorkspaces(folderPath);
    if (workspaces.length === 0) {
      await launch(folderPath);
    } else if (workspaces.length === 1) {
      await launch(workspaces[0]);
    } else {
      setPickerWorkspaces(workspaces);
    }
  }, [folderPath, launch]);

  const pickWorkspace = useCallback(async (target: string) => {
    setPickerWorkspaces(null);
    await launch(target);
  }, [launch]);

  const closePicker = useCallback(() => setPickerWorkspaces(null), []);
  const clearOpenError = useCallback(() => setOpenError(null), []);

  return {
    openInVSCode,
    pickerWorkspaces,
    pickWorkspace,
    closePicker,
    openError,
    clearOpenError,
  };
}
