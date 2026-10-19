"use client";

import { useSyncExternalStore } from "react";
import {
  getServerViewerState,
  getViewerState,
  subscribeViewer,
  type ViewerState,
} from "@/features/auth/model/viewer.store";

// The signed-in visitor on cached public pages ("loading" until known).
export function useViewer(): ViewerState {
  return useSyncExternalStore(subscribeViewer, getViewerState, getServerViewerState);
}
