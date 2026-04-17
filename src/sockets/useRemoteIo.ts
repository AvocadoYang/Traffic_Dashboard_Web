import { distinctUntilChanged, filter, fromEventPattern, share } from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import { useEffect, useState } from "react";

const r31$ = fromEventPattern(
  (next) => {
    io.on("remote-31", next);
    return next;
  },
  (next) => {
    io.off("remote-31", next);
  },
).pipe(filter(isDefined), share());

const r32$ = fromEventPattern(
  (next) => {
    io.on("remote-32", next);
    return next;
  },
  (next) => {
    io.off("remote-32", next);
  },
).pipe(filter(isDefined), share());

const r33$ = fromEventPattern(
  (next) => {
    io.on("remote-33", next);
    return next;
  },
  (next) => {
    io.off("remote-33", next);
  },
).pipe(filter(isDefined), share());

const r34$ = fromEventPattern(
  (next) => {
    io.on("remote-34", next);
    return next;
  },
  (next) => {
    io.off("remote-34", next);
  },
).pipe(filter(isDefined), share());

const r35$ = fromEventPattern(
  (next) => {
    io.on("remote-35", next);
    return next;
  },
  (next) => {
    io.off("remote-35", next);
  },
).pipe(filter(isDefined), share());

export const useRemoteIo31 = () => {
  // should be [bool1,bool_no_use,bool2,bool3,bool_no_use,bool_no_use,bool_no_use,bool_no_use]

  const [s, setS] = useState<{ states: boolean[] }>({ states: [] });
  useEffect(() => {
    const sub = r31$.subscribe((info) => {
      setS(info as { states: boolean[] });
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return s;
};

export const useRemoteIo32 = () => {
  // should be [bool4,bool5,bool6,bool7,bool8,bool9,bool10,bool11]

  const [s, setS] = useState<{ states: boolean[] }>({ states: [] });
  useEffect(() => {
    const sub = r32$.subscribe((info) => {
      setS(info as { states: boolean[] });
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return s;
};

export const useRemoteIo33 = () => {
  // should be [bool12,bool13,bool14,bool15,bool16,bool17,bool18,bool19]

  const [s, setS] = useState<{ states: boolean[] }>({ states: [] });
  useEffect(() => {
    const sub = r33$.subscribe((info) => {
      setS(info as { states: boolean[] });
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return s;
};

export const useRemoteIo34 = () => {
  // should be [bool20,bool20,bool_no_use,bool_no_use,bool_no_use,bool_no_use,bool_no_use,bool_no_use]
  const [s, setS] = useState<{ states: boolean[] }>({ states: [] });
  useEffect(() => {
    const sub = r34$.subscribe((info) => {
      setS(info as { states: boolean[] });
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return s;
};

export const useRemoteIo35 = () => {
  const [s, setS] = useState<{ states: boolean[] }>({ states: [] });
  useEffect(() => {
    const sub = r35$.subscribe((info) => {
      setS(info as { states: boolean[] });
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);
  return s;
};
