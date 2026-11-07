"use client";
import { createContext, useContext } from "react";
import { canRunCritical, type Profile } from "./api";

/** The signed-in organizer, provided by the panel layout. */
export const ViewerContext = createContext<Profile | null>(null);
export const useViewer = () => useContext(ViewerContext);
/** Whether the viewer may run superadmin-only (critical) actions. */
export const useCanRunCritical = () => canRunCritical(useViewer());
