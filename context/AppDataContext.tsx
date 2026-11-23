import React, { createContext, useContext, useEffect, useState } from "react";
import { Asset, Project, AppNotification, UserProfile, AppConfig } from "../types";
import {
  subscribeToAuth,
  getCurrentUserProfile,
  listenToAssets,
  listenToProjects,
  listenToNotifications,
  getAppConfig,
  getOverdueItems,
} from "../services/storageService";

interface AppDataContextValue {
  user: UserProfile | null;
  assets: Asset[];
  projects: Project[];
  notifications: AppNotification[];
  appConfig: AppConfig;
  overdueCount: number;
  loading: boolean;
}

const defaultConfig: AppConfig = {
  categories: [],
  locations: [],
  departments: [],
};

const AppDataContext = createContext<AppDataContextValue>({
  user: null,
  assets: [],
  projects: [],
  notifications: [],
  appConfig: defaultConfig,
  overdueCount: 0,
  loading: true,
});

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(getCurrentUserProfile());
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>(defaultConfig);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setAssets([]);
      setProjects([]);
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getAppConfig().then(setAppConfig).catch(() => {});

    const unsubAssets = listenToAssets((data) => {
      setAssets(data);
      setLoading(false);
    });
    const unsubProjects = listenToProjects(async (data) => {
      setProjects(data);
      setOverdueCount((await getOverdueItems(data)).length);
    });
    const unsubNotifs = listenToNotifications((data) => setNotifications(data));

    return () => {
      unsubAssets();
      unsubProjects();
      unsubNotifs();
    };
  }, [user]);

  return (
    <AppDataContext.Provider
      value={{ user, assets, projects, notifications, appConfig, overdueCount, loading }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => useContext(AppDataContext);
