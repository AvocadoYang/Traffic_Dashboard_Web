import { robotType, robotControl, robotUpperControl } from "./params";

export type Robot_Type = (typeof robotType)[number];
export type Robot_Control = (typeof robotControl)[number];
export type Robot_Upper_Control = (typeof robotUpperControl)[number];

export type Robot_Action = {
  operation: {
    locationId: number;
    type: string[];
    control: string[];
    param: { [key: string]: number }[];
  };
};
