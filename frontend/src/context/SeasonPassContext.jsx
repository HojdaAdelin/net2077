import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import { API_URL } from '../config';
import { countUnclaimedRewards } from '../utils/seasonPassRewards';

const SeasonPassContext = createContext(null);

export const useSeasonPass = () => useContext(SeasonPassContext);

export function SeasonPassProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [state, setState] = useState({ pass: null, userProgress: null, loading: true });
  const refreshRef = useRef(null);
  const refreshSeasonPass = useCallback(() => refreshRef.current?.(), []);

  useEffect(() => {
    const controller = new AbortController();
    let request = 0;
    const refresh = async () => {
      const current = ++request;
      try {
        const response = await fetch(`${API_URL}/season-pass/active`, {
          credentials: 'include', signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok && data.success && !controller.signal.aborted && current === request) {
          setState({ pass: data.pass, userProgress: user ? data.userProgress : null, owner: user?.username, loading: false });
        }
      } catch { /* Keep the last successful result during transient network failures. */ }
      finally {
        if (!controller.signal.aborted && current === request) {
          setState(previous => ({ ...previous, loading: false }));
        }
      }
    };
    refreshRef.current = refresh;
    refresh();
    const interval = setInterval(() => {
      if (user && document.visibilityState === 'visible') refresh();
    }, 30000);
    const onFocus = () => { if (user) refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      controller.abort();
      refreshRef.current = null;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user]);

  const setUserProgress = (update) => setState(previous => ({
    ...previous,
    userProgress: typeof update === 'function' ? update(previous.userProgress) : update,
  }));
  const { pass, loading } = state;
  const userProgress = user && state.owner === user.username ? state.userProgress : null;
  const unclaimedCount = countUnclaimedRewards(pass, userProgress);

  return (
    <SeasonPassContext.Provider value={{ pass, userProgress, loading, setUserProgress, unclaimedCount, refreshSeasonPass }}>
      {children}
    </SeasonPassContext.Provider>
  );
}
