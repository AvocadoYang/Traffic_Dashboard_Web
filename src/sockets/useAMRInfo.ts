import { hsl } from "color-convert";
import { MD5 } from "crypto-js";
import { useState, useEffect } from "react";
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  from,
  fromEventPattern,
  map,
  MonoTypeOperatorFunction,
  pluck,
  scan,
  share,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs";
import { io } from "./socketConnect";
import { isDefined } from "ts-extras";
import {
  array,
  boolean,
  mixed,
  number,
  object,
  string,
  ValidationError,
} from "yup";
import { translate } from "@/i18n";
import { useTranslation } from "react-i18next";
import { Cargo } from "@/types/peripheral";

export enum MaintenanceLevel {
  /**初始值 */
  UNKNOWN,

  /**  正常可接所有任務 */
  NORMAL,

  /** 不可接所有任務*/
  FORBIDDEN_ALL_MISSION,

  /** 不可接WCS所有任務 */
  FORBIDDEN_WCS_MISSION,

  /** 不可接交管所有任務 */
  FORBIDDEN_RCS_MISSION,

  /** 不可接USER所有任務 */
  FORBIDDEN_USER_MISSION,

  /**不可用壞爛*/
  BROKEN,
}

export type FleetInfo = {
  IO: {
    connect_status: boolean;
    // baffle_left: boolean;
    // baffle_right: boolean;
    manual_mode: boolean;
    enforce_charge: boolean;
    set_charge: boolean;

    battery_info: {
      low_battery: boolean;
      set_charge: number;
      battery: number;
      voltage: number;
      current: number;
      charging: boolean;
      battery_Temp: number;
      battery_flag0: string;
      battery_flag1: string;
      battery_flag2: string;
      write_battery_info_time: number;
      battery_info_error: unknown[];
    };

    fork: {
      set_clamp: number;
      current_clamp: number;
      set_height: number;
      current_height: number;
      set_move: number;
      current_move: number;
      set_tilt: number;
      current_tilt: number;
      set_shift: number;
      current_shift: number;
    };
    front_2d_layer: number;
    enable_2d_lidar: boolean;
    obstacle_2d_signal: boolean;
    obstacle_rear_2d_signal: boolean;
    obstacle_3d_signal: boolean;
    enable_recovery: boolean;
    enable_reboot: boolean;
    enable_tip: boolean;
    tip_left: boolean;
    tip_right: boolean;
    set_height: number;
    current_height: number;
    linear_x: number;
    angular_z: number;
    odom_x: number;
    odom_w: number;
    emergency_signal: string;
    emergency_stop: boolean;
    bumper: boolean;
    recovery: boolean;
  };
  doingTask: boolean;
  rosStatus: string;
  rosError: string;
  smStatus: string;
  hasCargo: boolean;
  arriveInit: boolean;
  maintenanceLevel: MaintenanceLevel;
};

const schema = () =>
  array(
    object({
      amrId: string().required(),
      pose: object({
        x: number().optional(),
        y: number().optional(),
        yaw: number().optional(),
        closeLoc: string(),
      }).optional(),
      IO: object({
        connect_status: boolean().optional(),
        Query: string().optional(),
        Set: string().optional(),
        MultiSet: string().optional(),
        error_code: string().optional(),
        error_info: string().optional(),
        enable_ultrasoumd: boolean().optional(),
        ultrasound: string().optional(),
        enable_baffle: boolean().optional(),

        baffle_left: mixed().optional(),
        baffle_right: mixed().optional(),
        manual_mode: boolean().optional(),
        enforce_charge: boolean().optional(),
        set_charge: boolean().optional(),
        battery_info: object({
          low_battery: boolean().optional(),
          set_charge: number().optional(),
          battery: number().optional(),
          voltage: number().optional(),
          current: number().optional(),
          charging: boolean().optional(),
          battery_Temp: number().optional(),
          battery_flag0: string().optional(),
          battery_flag1: string().optional(),
          battery_flag2: string().optional(),
          write_battery_info_time: number().optional(),
          battery_info_error: array().optional(),
        }).required(),

        fork: object({
          set_clamp: number().optional(),
          current_clamp: number().optional(),
          set_height: number().optional(),
          current_height: number().optional(),
          set_move: number().optional(),
          current_move: number().optional(),
          set_tilt: number().optional(),
          current_tilt: number().optional(),
          set_shift: number().optional(),
          current_shift: number().optional(),
        }).optional(),

        charge_relay_status: boolean().optional(),

        voltage: number().optional(),
        current: number().optional(),

        front_2d_layer: number().optional(),
        enable_2d_lidar: boolean().optional(),
        obstacle_2d_signal: boolean().optional(),
        obstacle_rear_2d_signal: boolean().optional(),
        obstacle_3d_signal: boolean().optional(),
        enable_recovery: boolean().optional(),
        enable_reboot: boolean().optional(),
        enable_tip: boolean().optional(),
        set_tip: number().optional(),
        tip_left: boolean().optional(),
        tip_right: boolean().optional(),
        set_height: number().optional(),
        current_height: number().optional(),
        set_linear_x: number().optional(),
        linear_x: number().optional(),
        angular_z: number().optional(),
        odom_x: number().optional(),
        odom_y: number().optional(),
        odom_w: number().optional(),
        emergency_signal: string().optional(),
        emergency_stop: boolean().optional(),
        bumper: boolean().optional(),
        recovery: boolean().optional(),
      })
        .optional()
        .nullable(),

      rosError: string().optional(),
      doingTask: boolean().optional(),
      rosStatus: string().optional(),
      arriveInit: boolean().optional().default(false),
      isPosAccurate: boolean().optional(),
      smStatus: string().optional(),
      hasCargo: boolean().optional(),
      cargo: array(
        object({
          cargoInfoId: string().nullable(),
          customCargoMetadataId: string().nullable(),
          metadata: string().nullable(),
        }).optional()
      ).optional(),
      networkDelay: number().optional(),
      isOverdue: boolean().optional(),
      maintenanceLevel: number().optional(),
    }).required()
  ).required();

const profiles$ = fromEventPattern(
  (next) => {
    io.on("amr-profile", next);
    return next;
  },
  (next) => {
    io.off("amr-profile", next);
  }
).pipe(
  switchMap((msg) =>
    from(
      schema()
        .validate(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          msg as unknown[],
          { stripUnknown: true }
        )
        .catch((err: ValidationError) => {
          console.error(err.message);
          console.error("amr-profile socket schema mismatch: ", err.value);
          return undefined;
        })
    )
  ),
  filter(isDefined),
  share()
);

export type Pose = { x: number; y: number; yaw: number };

const sanitizeDegree = (deg: number) => {
  let sanitized = ((deg % 360) + 360) % 360;
  if (sanitized > 180) {
    sanitized -= 360;
  }
  return sanitized;
};

const regularYaw = (): MonoTypeOperatorFunction<Pose> => (source$) => {
  const $coord = source$.pipe(map(({ x, y }) => ({ x, y })));

  const $yaw = source$.pipe(
    pluck("yaw"),
    distinctUntilChanged(),
    scan((acc, cur) => {
      let diff = (((cur - acc) % 360) + 360) % 360;
      diff = diff > 180 ? diff - 360 : diff;
      diff = diff < -180 ? diff + 360 : diff;
      return acc + diff;
    })
  );
  return $coord.pipe(
    withLatestFrom($yaw),
    map(([{ x, y }, yaw]) => ({ x, y, yaw }))
  );
};

const amrId2Color = (amrId: string) => {
  const seed = parseInt(`0x${MD5(amrId).toString()}`, 16);
  const h = seed % 360;
  const s = (seed % 70) + 80;
  const l = (seed % 60) + 10;
  const color = `#${hsl.hex([h, s, l])}`;
  return color;
};

export const useAMR = (amrId: string) => {
  const [pose, setPose] = useState<Pose>();
  const [originPose, setOriginPose] = useState<Pose>();
  const [data, setData] = useState<FleetInfo>();

  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );

    const sub1 = profile$
      .pipe(
        pluck("pose"),
        filter(isDefined),
        filter((msg) => {
          return msg.x !== undefined;
        }),
        map(({ x, y, yaw }) => ({
          x: Number((x || 0).toFixed(2)),
          y: Number((y || 0).toFixed(2)),
          yaw: Number((yaw || 0).toFixed(2)),
        })),
        regularYaw(),
        // tap(({ yaw }) => console.log(yaw)),
        distinctUntilChanged(
          (prev, cur) =>
            prev.x === cur.x && prev.y === cur.y && prev.yaw === cur.yaw
        )
        // throttleTime(1000),
      )
      .subscribe(({ x, y, yaw }) => {
        setPose({ x, y, yaw });
      });

    const sub2 = profile$.subscribe((fleetInfo) => {
      setData({
        ...(fleetInfo as FleetInfo),
      });
    });

    const sub3 = profile$
      .pipe(
        pluck("pose"),
        filter(isDefined),
        filter((msg) => {
          return msg.x !== undefined;
        }),
        map(({ x, y, yaw }) => ({
          x: Number((x || 0).toFixed(5)),
          y: Number((y || 0).toFixed(5)),
          yaw: Number((yaw || 0).toFixed(5)),
        }))
      )
      .subscribe(({ x, y, yaw }) => {
        setOriginPose({ x, y, yaw: sanitizeDegree(yaw) });
      });

    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
      sub3.unsubscribe();
    };
  }, [amrId]);

  return {
    pose,
    originPose,
    data,
    color: amrId2Color(amrId),
  };
};

export const useAmrPose = (amrId: string) => {
  const [pose, setPose] = useState<Pose>();
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );

    const amrPose$ = profile$
      .pipe(
        pluck("pose"),
        filter(isDefined),
        filter((msg) => {
          return msg.x !== undefined;
        }),
        map(({ x, y, yaw }) => ({
          x: Number((x || 0).toFixed(2)),
          y: Number((y || 0).toFixed(2)),
          yaw: Number((yaw || 0).toFixed(2)),
        })),
        regularYaw(),
        // tap(({ yaw }) => console.log(yaw)),
        distinctUntilChanged(
          (prev, cur) =>
            prev.x === cur.x && prev.y === cur.y && prev.yaw === cur.yaw
        )
        // throttleTime(1000),
      )
      .subscribe(({ x, y, yaw }) => {
        setPose({ x, y, yaw });
      });

    return () => {
      amrPose$.unsubscribe();
    };
  }, [amrId]);
  return {
    pose,
  };
};

export const useIsLogIn = (amrId: string) => {
  const [data, setData] = useState({
    isOnline: false,
    networkDelay: 0,
    isOverdue: false,
    isPosAccurate: false,
  });

  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const logIn$ = profile$
      .pipe(
        map((info) => ({
          isOnline: info.arriveInit,
          delay: info.networkDelay,
          isOverdue: info.isOverdue,
          isPosAccurate: info.isPosAccurate,
        }))
      )
      .subscribe(({ isOnline, delay, isOverdue, isPosAccurate }) => {
        setData({
          isOnline,
          isOverdue: isOverdue || false,
          networkDelay: delay || 0,
          isPosAccurate: isPosAccurate || false,
        });
      });

    return () => {
      logIn$.unsubscribe();
    };
  }, [amrId]);

  return data;
};

export const useAllAmrStatus = () => {
  const [data, setData] = useState<
    {
      amrId: string;
      isOnline: boolean;
      networkDelay: number;
      isOverdue: boolean;
      isPosAccurate: boolean;
    }[]
  >([]);

  useEffect(() => {
    const profile$ = profiles$.pipe(filter(isDefined), share());
    const logIn$ = profile$
      .pipe(
        map(
          (infos) =>
            infos
              .map((info) => ({
                amrId: info.amrId,
                isOnline: info.arriveInit,
                networkDelay: info.networkDelay || 0,
                isOverdue: info.isOverdue || false,
                isPosAccurate: info.isPosAccurate || false,
              }))
              .sort((a, b) => a.amrId.localeCompare(b.amrId)) // <-- sort by amrId
        ),
        distinctUntilChanged(
          (pre, current) => JSON.stringify(pre) === JSON.stringify(current)
        )
      )
      .subscribe((amrStatusArr) => {
        setData(amrStatusArr);
      });

    return () => {
      logIn$.unsubscribe();
    };
  }, []);

  return data;
};

export const useCloseLoc = (amrId: string) => {
  const [closeLoc, setCloseLoc] = useState<string | undefined>("-");
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const closeLoc$ = profile$
      .pipe(
        map((info) => info.pose?.closeLoc),
        distinctUntilChanged()
      )
      .subscribe((closeLoc) =>
        setCloseLoc((pre) => {
          if (!closeLoc) return pre;
          return closeLoc;
        })
      );

    return () => {
      closeLoc$.unsubscribe();
    };
  }, [amrId]);

  return { closeLoc };
};

export const useAmrDetail = (amrId: string) => {
  const [data, setData] = useState<{
    locationId: string;
    battery: number;
    status: string;
  } | null>(null);

  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const sub = profile$
      .pipe(
        map((info) => ({
          locationId: info.pose?.closeLoc ?? "",
          battery: info.IO?.battery_info.battery ?? 0,
          status: info.rosStatus ?? "",
        })),
        distinctUntilChanged(
          (a, b) =>
            a.locationId === b.locationId &&
            a.battery === b.battery &&
            a.status === b.status
        )
      )
      .subscribe(setData);

    return () => {
      sub.unsubscribe();
    };
  }, [amrId]);

  return data;
};

export const useBattery = (amrId: string) => {
  const [battery, setBattery] = useState<number | undefined>(undefined);
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const battery$ = profile$
      .pipe(
        map((info) => info.IO?.battery_info.battery),
        distinctUntilChanged()
      )
      .subscribe((battery) => setBattery(battery));

    return () => {
      battery$.unsubscribe();
    };
  }, [amrId]);

  return { battery };
};

export const usePosIsAccurate = (amrId: string) => {
   const [isPosAccurate, setIsPoseAccurate] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const isAccurate$ = profile$
      .pipe(
        map((info) => info.isPosAccurate),
        distinctUntilChanged()
      )
      .subscribe((isAccurate) => setIsPoseAccurate(isAccurate));

    return () => {
      isAccurate$.unsubscribe();
    };
  }, [amrId]);

  return { isPosAccurate };
}

export const useYaw = (amrId: string) => {
  const [yaw, setYaw] = useState<number | undefined>(0);
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const yaw$ = profile$
      .pipe(
        map((info) => {return { amrId: info.amrId, yaw: info.pose?.yaw}}),
        map((data) => data.yaw),
        filter((v)=> v !== undefined),
        filter((v) => v !== 0),
        distinctUntilChanged(
          (pre, current) => JSON.stringify(pre) === JSON.stringify(current)
        ),
        debounceTime(1000)
      )
      .subscribe((yaw) => {
        setYaw(yaw);
      });

    return () => {
      yaw$.unsubscribe();
    };
  }, [amrId]);

  return { yaw };
};

export const useAMRAllIO = (amrId: string) => {
  const [io, setIO] = useState<FleetInfo["IO"] | null>(null);

  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const io$ = profile$
      .pipe(
        map((info) => info.IO),
        distinctUntilChanged(
          (pre, current) => JSON.stringify(pre) === JSON.stringify(current)
        )
      )
      .subscribe((io) => {
        setIO((io as FleetInfo["IO"]) ?? null);
      });

    return () => {
      io$.unsubscribe();
    };
  }, [amrId]);

  return { io };
};

export const useXY = (amrId: string) => {
  const [loc, setLoc] = useState<{ x: number; y: number } | undefined>();
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const XY$ = profile$
      .pipe(
        map((info) => ({ x: info.pose?.x, y: info.pose?.y })),
        filter((v) => v.x !== undefined && v.y !== undefined),
        distinctUntilChanged((pre, cur) => {
          if (
            pre.x == undefined ||
            pre.y == undefined ||
            cur.x == undefined ||
            cur.y == undefined
          ) {
            return true;
          }
          return cur.x - pre.x < 0.01 && cur.y - pre.y < 0.01;
        })
      )
      .subscribe((loc) => setLoc(loc as { x: number; y: number } | undefined));

    return () => {
      XY$.unsubscribe();
    };
  }, [amrId]);

  return { loc };
};

export const useAmrStatus = (amrId: string) => {
  const [status, setStatus] = useState<string | undefined>("");
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const battery$ = profile$
      .pipe(
        map((info) => {
          const { rosStatus } = info;

          const statusText = rosStatus
            ? `${translate("normal", String(rosStatus))}`
            : "";
          const tipText = statusText;
          return tipText;
        }),
        distinctUntilChanged(
          (pre, current) => JSON.stringify(pre) === JSON.stringify(current)
        )
      )
      .subscribe((info) => {
        setStatus(info);
      });

    return () => {
      battery$.unsubscribe();
    };
  }, [amrId]);

  return { status };
};

export const useMaintenanceStatus = (amrId: string) => {
  const [status, setStatus] = useState<string>("");
  const { t } = useTranslation();

  const translateMaintenance = (value: MaintenanceLevel | undefined) => {
    switch (value) {
      case undefined:
        return "";
      case MaintenanceLevel.UNKNOWN:
        return t("maintenance.unknown");
      case MaintenanceLevel.NORMAL:
        return t("maintenance.normal");
      case MaintenanceLevel.FORBIDDEN_ALL_MISSION:
        return t("maintenance.forbidden_all_mission");
      case MaintenanceLevel.FORBIDDEN_WCS_MISSION:
        return t("maintenance.forbidden_wcs_mission");
      case MaintenanceLevel.FORBIDDEN_RCS_MISSION:
        return t("maintenance.forbidden_rcs_mission");
      case MaintenanceLevel.FORBIDDEN_USER_MISSION:
        return t("maintenance.forbidden_user_mission");
      case MaintenanceLevel.BROKEN:
        return t("maintenance.broken");
    }
  };

  useEffect(() => {
    const maintenance$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const battery$ = maintenance$
      .pipe(
        map((info) => {
          const { maintenanceLevel } = info;
          return translateMaintenance(maintenanceLevel);
        }),
        distinctUntilChanged(
          (pre, current) => JSON.stringify(pre) === JSON.stringify(current)
        )
      )
      .subscribe((info) => {
        setStatus(info);
      });

    return () => {
      battery$.unsubscribe();
    };
  }, [amrId]);

  return { status };
};

export const useIsWorking = (amrId: string) => {
  const [isWorking, setIsWorking] = useState<boolean | undefined>(false);
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const isWorking$ = profile$
      .pipe(
        map((info) => info.doingTask),
        distinctUntilChanged(
          (pre, current) => JSON.stringify(pre) === JSON.stringify(current)
        )
      )
      .subscribe((isWorking) => setIsWorking(isWorking));

    return () => {
      isWorking$.unsubscribe();
    };
  }, [amrId]);

  return { isWorking };
};

export const useIsManual = (amrId: string) => {
  const [isManual, setIsManual] = useState<boolean | undefined>(false);
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const manual$ = profile$
      .pipe(
        map((info) => info.IO?.manual_mode),
        distinctUntilChanged(
          (pre, current) => JSON.stringify(pre) === JSON.stringify(current)
        )
      )
      .subscribe((isWorking) => setIsManual(isWorking));

    return () => {
      manual$.unsubscribe();
    };
  }, [amrId]);

  return { isManual };
};

export const useIsCarry = (amrId: string) => {
  const [isCarry, setIsCarry] = useState<{
    isCarry: boolean;
    cargo: Cargo[];
  }>({
    isCarry: false,
    cargo: [],
  });
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const isCarry$ = profile$
      .pipe(
        map((info) => ({
          hasCargo: info.hasCargo || false,
          cargo: info.cargo as Cargo[],
        })),
        distinctUntilChanged(
          (pre, current) => JSON.stringify(pre) === JSON.stringify(current)
        )
      )
      .subscribe(({ hasCargo, cargo }) =>
        setIsCarry({ isCarry: hasCargo, cargo })
      );

    return () => {
      isCarry$.unsubscribe();
    };
  }, [amrId]);

  return isCarry;
};

export const useIsCharging = (amrId: string) => {
  const [isCharge, setIsCharge] = useState<boolean | undefined>(false);
  useEffect(() => {
    const profile$ = profiles$.pipe(
      map((p) => p.find((x) => x.amrId === amrId)),
      filter(isDefined),
      share()
    );
    const isCarry$ = profile$
      .pipe(
        map((info) => info.IO?.battery_info.charging),
        distinctUntilChanged(
          (pre, current) => JSON.stringify(pre) === JSON.stringify(current)
        )
      )
      .subscribe((isWorking) => setIsCharge(isWorking));

    return () => {
      isCarry$.unsubscribe();
    };
  }, [amrId]);

  return { isCharge };
};
